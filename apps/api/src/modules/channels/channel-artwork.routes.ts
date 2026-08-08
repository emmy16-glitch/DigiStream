import type { FastifyInstance, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import { findOrganisationRole } from '../organisations/organisation-memberships.repository.js';
import {
  ObjectStorageError,
  type ObjectStorage,
} from '../storage/object-storage.js';

const MAX_ARTWORK_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const CONTENT_MANAGERS = new Set(['owner', 'admin', 'broadcaster']);

type ArtworkRow = {
  channel_id: string;
  storage_key: string;
  content_type: string;
  size_bytes: number;
  checksum_sha256: string;
  updated_at: Date;
};

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function requireDependencies(
  database: DatabaseContext | null,
  storage: ObjectStorage | null,
): { database: DatabaseContext; storage: ObjectStorage } {
  if (!database) {
    throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Channel artwork is temporarily unavailable.');
  }
  if (!storage) {
    throw new ApiError(503, 'OBJECT_STORAGE_UNAVAILABLE', 'Channel artwork is temporarily unavailable.');
  }
  return { database, storage };
}

async function requireUser(request: FastifyRequest, database: DatabaseContext) {
  const user = await findAuthenticatedUser(request, database);
  if (!user) throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.');
  return user;
}

function channelNotFound(): never {
  throw new ApiError(404, 'CHANNEL_NOT_FOUND', 'The requested channel was not found.');
}

async function requireManagedChannel(
  database: DatabaseContext,
  organisationId: string,
  channelId: string,
  userId: string,
): Promise<void> {
  if (!validUuid(organisationId) || !validUuid(channelId)) channelNotFound();
  const role = await findOrganisationRole(database.db, organisationId, userId);
  if (!role) channelNotFound();
  const channel = await database.pool.query<{ id: string }>(
    'SELECT id FROM channels WHERE id = $1 AND organisation_id = $2 LIMIT 1',
    [channelId, organisationId],
  );
  if (!channel.rows[0]) channelNotFound();
  if (!CONTENT_MANAGERS.has(role)) {
    throw new ApiError(
      403,
      'CHANNEL_MANAGEMENT_REQUIRED',
      'Owner, administrator or broadcaster permission is required.',
    );
  }
}

function storageKey(organisationId: string, channelId: string): string {
  return `organisations/${organisationId}/channels/${channelId}/artwork`;
}

function storageFailure(error: unknown): never {
  if (error instanceof ObjectStorageError) {
    throw new ApiError(503, 'OBJECT_STORAGE_UNAVAILABLE', 'Channel artwork is temporarily unavailable.');
  }
  throw error;
}

export function registerChannelArtworkRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
  storage: ObjectStorage | null,
): void {
  app.put<{
    Params: { organisationId: string; channelId: string };
    Body: Buffer;
  }>(
    '/api/v1/organisations/:organisationId/channels/:channelId/artwork',
    async (request, reply) => {
      const context = requireDependencies(database, storage);
      const user = await requireUser(request, context.database);
      await requireManagedChannel(
        context.database,
        request.params.organisationId,
        request.params.channelId,
        user.id,
      );
      const contentType = String(request.headers['content-type'] ?? '')
        .split(';', 1)[0]
        ?.toLowerCase();
      if (
        !contentType ||
        !ALLOWED_TYPES.has(contentType) ||
        !Buffer.isBuffer(request.body) ||
        request.body.byteLength === 0 ||
        request.body.byteLength > MAX_ARTWORK_BYTES
      ) {
        throw new ApiError(
          400,
          'INVALID_CHANNEL_ARTWORK',
          'Upload a JPEG, PNG or WebP image up to 2 MB.',
        );
      }

      const key = storageKey(request.params.organisationId, request.params.channelId);
      try {
        const saved = await context.storage.putObject({
          key,
          body: request.body,
          contentType,
        });
        await context.database.pool.query(
          `INSERT INTO channel_artwork
             (channel_id, storage_key, content_type, size_bytes, checksum_sha256, updated_at)
           VALUES ($1, $2, $3, $4, $5, now())
           ON CONFLICT (channel_id) DO UPDATE
           SET storage_key = EXCLUDED.storage_key,
               content_type = EXCLUDED.content_type,
               size_bytes = EXCLUDED.size_bytes,
               checksum_sha256 = EXCLUDED.checksum_sha256,
               updated_at = now()`,
          [
            request.params.channelId,
            key,
            saved.contentType,
            saved.sizeBytes,
            saved.checksumSha256,
          ],
        );
        reply.header('cache-control', 'no-store');
        return reply.send({
          artwork: {
            url: `/api/v1/organisations/${encodeURIComponent(request.params.organisationId)}/channels/${encodeURIComponent(request.params.channelId)}/artwork`,
            contentType: saved.contentType,
            sizeBytes: saved.sizeBytes,
          },
        });
      } catch (error) {
        storageFailure(error);
      }
    },
  );

  app.delete<{ Params: { organisationId: string; channelId: string } }>(
    '/api/v1/organisations/:organisationId/channels/:channelId/artwork',
    async (request, reply) => {
      const context = requireDependencies(database, storage);
      const user = await requireUser(request, context.database);
      await requireManagedChannel(
        context.database,
        request.params.organisationId,
        request.params.channelId,
        user.id,
      );
      const result = await context.database.pool.query<ArtworkRow>(
        'SELECT * FROM channel_artwork WHERE channel_id = $1',
        [request.params.channelId],
      );
      const artwork = result.rows[0];
      if (!artwork) return reply.code(204).send();
      try {
        await context.storage.deleteObject(artwork.storage_key);
        await context.database.pool.query('DELETE FROM channel_artwork WHERE channel_id = $1', [request.params.channelId]);
        return reply.code(204).send();
      } catch (error) {
        storageFailure(error);
      }
    },
  );

  app.get<{ Params: { organisationId: string; channelId: string } }>(
    '/api/v1/organisations/:organisationId/channels/:channelId/artwork',
    async (request, reply) => {
      const context = requireDependencies(database, storage);
      const user = await requireUser(request, context.database);
      if (!validUuid(request.params.organisationId) || !validUuid(request.params.channelId)) channelNotFound();
      const role = await findOrganisationRole(
        context.database.db,
        request.params.organisationId,
        user.id,
      );
      if (!role) channelNotFound();
      const result = await context.database.pool.query<ArtworkRow>(
        `SELECT artwork.*
           FROM channel_artwork artwork
           JOIN channels channel ON channel.id = artwork.channel_id
          WHERE artwork.channel_id = $1 AND channel.organisation_id = $2
          LIMIT 1`,
        [request.params.channelId, request.params.organisationId],
      );
      const artwork = result.rows[0];
      if (!artwork) channelNotFound();
      try {
        const object = await context.storage.getObject({
          key: artwork.storage_key,
          contentType: artwork.content_type,
        });
        reply.header('content-type', artwork.content_type);
        reply.header('content-length', String(object.contentLength));
        reply.header('cache-control', 'private, max-age=60');
        return reply.send(object.body);
      } catch (error) {
        if (error instanceof ObjectStorageError && error.code === 'not_found') channelNotFound();
        storageFailure(error);
      }
    },
  );

  app.get<{ Params: { organisationSlug: string; channelSlug: string } }>(
    '/api/v1/channels/:organisationSlug/:channelSlug/artwork',
    async (request, reply) => {
      const context = requireDependencies(database, storage);
      const result = await context.database.pool.query<ArtworkRow>(
        `SELECT artwork.*
           FROM channel_artwork artwork
           JOIN channels channel ON channel.id = artwork.channel_id
           JOIN organisations organisation ON organisation.id = channel.organisation_id
          WHERE organisation.slug = $1
            AND channel.slug = $2
            AND channel.status = 'active'
            AND channel.visibility IN ('public', 'unlisted')
          LIMIT 1`,
        [
          request.params.organisationSlug.trim().toLowerCase(),
          request.params.channelSlug.trim().toLowerCase(),
        ],
      );
      const artwork = result.rows[0];
      if (!artwork) channelNotFound();
      try {
        const object = await context.storage.getObject({
          key: artwork.storage_key,
          contentType: artwork.content_type,
        });
        reply.header('content-type', artwork.content_type);
        reply.header('content-length', String(object.contentLength));
        reply.header('cache-control', 'public, max-age=300');
        return reply.send(object.body);
      } catch (error) {
        if (error instanceof ObjectStorageError && error.code === 'not_found') channelNotFound();
        storageFailure(error);
      }
    },
  );
}

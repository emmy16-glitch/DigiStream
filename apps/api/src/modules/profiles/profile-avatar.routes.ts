import type { FastifyInstance, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import {
  ObjectStorageError,
  type ObjectStorage,
} from '../storage/object-storage.js';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type AvatarRow = {
  user_id: string;
  storage_key: string;
  content_type: string;
  size_bytes: number;
  checksum_sha256: string;
  updated_at: Date;
};

function requireDependencies(
  database: DatabaseContext | null,
  storage: ObjectStorage | null,
): { database: DatabaseContext; storage: ObjectStorage } {
  if (!database) {
    throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Profile images are temporarily unavailable.');
  }
  if (!storage) {
    throw new ApiError(503, 'OBJECT_STORAGE_UNAVAILABLE', 'Profile images are temporarily unavailable.');
  }
  return { database, storage };
}

async function requireUser(request: FastifyRequest, database: DatabaseContext) {
  const user = await findAuthenticatedUser(request, database);
  if (!user) {
    throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.');
  }
  return user;
}

function storageKey(userId: string): string {
  return `profiles/${userId}/avatar`;
}

function storageFailure(error: unknown): never {
  if (error instanceof ObjectStorageError) {
    throw new ApiError(503, 'OBJECT_STORAGE_UNAVAILABLE', 'Profile images are temporarily unavailable.');
  }
  throw error;
}

export function registerProfileAvatarRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
  storage: ObjectStorage | null,
): void {
  app.addContentTypeParser(
    /^image\/(?:jpeg|png|webp)$/i,
    { parseAs: 'buffer', bodyLimit: MAX_AVATAR_BYTES },
    (_request, body, done) => done(null, body),
  );

  app.put<{ Body: Buffer }>('/api/v1/profile/avatar', async (request, reply) => {
    const context = requireDependencies(database, storage);
    const user = await requireUser(request, context.database);
    const contentType = String(request.headers['content-type'] ?? '')
      .split(';', 1)[0]
      ?.toLowerCase();
    if (
      !contentType ||
      !ALLOWED_TYPES.has(contentType) ||
      !Buffer.isBuffer(request.body) ||
      request.body.byteLength === 0
    ) {
      throw new ApiError(400, 'INVALID_AVATAR', 'Upload a JPEG, PNG or WebP image up to 2 MB.');
    }

    const profile = await context.database.pool.query<{ username: string }>(
      'SELECT username FROM user_profiles WHERE user_id = $1 LIMIT 1',
      [user.id],
    );
    const username = profile.rows[0]?.username;
    if (!username) {
      throw new ApiError(409, 'PROFILE_REQUIRED', 'Create your public profile before adding a profile image.');
    }

    const key = storageKey(user.id);
    try {
      const saved = await context.storage.putObject({ key, body: request.body, contentType });
      await context.database.pool.query(
        `INSERT INTO profile_avatars (user_id, storage_key, content_type, size_bytes, checksum_sha256, updated_at)
         VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT (user_id) DO UPDATE
         SET storage_key = EXCLUDED.storage_key,
             content_type = EXCLUDED.content_type,
             size_bytes = EXCLUDED.size_bytes,
             checksum_sha256 = EXCLUDED.checksum_sha256,
             updated_at = now()`,
        [user.id, key, saved.contentType, saved.sizeBytes, saved.checksumSha256],
      );
      reply.header('cache-control', 'no-store');
      return reply.send({
        avatar: {
          url: `/api/v1/profiles/${encodeURIComponent(username)}/avatar`,
          contentType: saved.contentType,
          sizeBytes: saved.sizeBytes,
        },
      });
    } catch (error) {
      storageFailure(error);
    }
  });

  app.delete('/api/v1/profile/avatar', async (request, reply) => {
    const context = requireDependencies(database, storage);
    const user = await requireUser(request, context.database);
    const result = await context.database.pool.query<AvatarRow>(
      'SELECT * FROM profile_avatars WHERE user_id = $1',
      [user.id],
    );
    const avatar = result.rows[0];
    if (!avatar) return reply.code(204).send();

    try {
      await context.storage.deleteObject(avatar.storage_key);
      await context.database.pool.query('DELETE FROM profile_avatars WHERE user_id = $1', [user.id]);
      return reply.code(204).send();
    } catch (error) {
      storageFailure(error);
    }
  });

  app.get<{ Params: { username: string } }>('/api/v1/profiles/:username/avatar', async (request, reply) => {
    const context = requireDependencies(database, storage);
    const result = await context.database.pool.query<AvatarRow>(
      `SELECT avatar.*
         FROM profile_avatars avatar
         JOIN user_profiles profile ON profile.user_id = avatar.user_id
         JOIN users ON users.id = avatar.user_id
        WHERE profile.username = $1
          AND profile.is_discoverable = true
          AND users.status = 'active'
        LIMIT 1`,
      [request.params.username.trim().toLowerCase()],
    );
    const avatar = result.rows[0];
    if (!avatar) {
      throw new ApiError(404, 'PROFILE_AVATAR_NOT_FOUND', 'The requested profile image was not found.');
    }

    try {
      const object = await context.storage.getObject({
        key: avatar.storage_key,
        contentType: avatar.content_type,
      });
      reply.header('content-type', avatar.content_type);
      reply.header('content-length', String(object.contentLength));
      reply.header('cache-control', 'public, max-age=300');
      return reply.send(object.body);
    } catch (error) {
      if (error instanceof ObjectStorageError && error.code === 'not_found') {
        throw new ApiError(404, 'PROFILE_AVATAR_NOT_FOUND', 'The requested profile image was not found.');
      }
      storageFailure(error);
    }
  });
}

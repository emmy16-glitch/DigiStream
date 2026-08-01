import type { FastifyInstance, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import type { ObjectStorage } from '../storage/object-storage.js';
import type { RecordingAccessManager } from './recording-access.js';
import {
  createPublicReplayAccess,
  getMemberReplay,
  getPublicReplay,
  listPublicReplays,
} from './public-replays.service.js';

export type PublicReplayRouteOptions = {
  objectStorage: ObjectStorage | null;
  accessManager: RecordingAccessManager | null;
};

function requireDatabase(database: DatabaseContext | null): DatabaseContext {
  if (!database) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Replay listening is temporarily unavailable.',
    );
  }
  return database;
}

function requirePlaybackInfrastructure(options: PublicReplayRouteOptions): RecordingAccessManager {
  if (!options.objectStorage) {
    throw new ApiError(
      503,
      'OBJECT_STORAGE_UNAVAILABLE',
      'Replay storage is not configured.',
    );
  }
  if (!options.accessManager) {
    throw new ApiError(
      503,
      'RECORDING_ACCESS_UNAVAILABLE',
      'Replay access is not configured.',
    );
  }
  return options.accessManager;
}

async function requireUser(
  request: FastifyRequest,
  database: DatabaseContext,
) {
  const user = await findAuthenticatedUser(request, database);
  if (!user) {
    throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.');
  }
  return user;
}

export function registerPublicReplayRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
  options: PublicReplayRouteOptions,
): void {
  app.get<{ Querystring: { limit?: string } }>(
    '/api/v1/replays',
    async (request, reply) => {
      reply.header('cache-control', 'public, max-age=15, stale-while-revalidate=30');
      return {
        replays: await listPublicReplays(
          requireDatabase(database),
          request.query.limit,
        ),
      };
    },
  );

  app.get<{
    Params: {
      organisationSlug: string;
      channelSlug: string;
      broadcastSlug: string;
    };
  }>(
    '/api/v1/replays/:organisationSlug/:channelSlug/:broadcastSlug',
    async (request, reply) => {
      const replay = await getPublicReplay(
        requireDatabase(database),
        request.params.organisationSlug,
        request.params.channelSlug,
        request.params.broadcastSlug,
      );
      reply.header(
        'cache-control',
        replay.access === 'unlisted'
          ? 'private, no-store'
          : 'public, max-age=15, stale-while-revalidate=30',
      );
      return { replay };
    },
  );

  app.post<{
    Params: {
      organisationSlug: string;
      channelSlug: string;
      broadcastSlug: string;
    };
  }>(
    '/api/v1/replays/:organisationSlug/:channelSlug/:broadcastSlug/access',
    async (request, reply) => {
      reply.header('cache-control', 'private, no-store');
      return createPublicReplayAccess(
        requireDatabase(database),
        requirePlaybackInfrastructure(options),
        request.params.organisationSlug,
        request.params.channelSlug,
        request.params.broadcastSlug,
      );
    },
  );

  app.get<{
    Params: { organisationId: string; recordingId: string };
  }>(
    '/api/v1/organisations/:organisationId/replays/:recordingId',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      reply.header('cache-control', 'private, no-store');
      return {
        replay: await getMemberReplay(
          context,
          request.params.organisationId,
          request.params.recordingId,
          user.id,
        ),
      };
    },
  );
}

import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import { registerRecordingRoutes } from '../recordings/recordings.routes.js';
import {
  applyBroadcastMediaEvent,
  commandBroadcast,
  createBroadcast,
  getOrganisationBroadcast,
  getPublicBroadcast,
  listOrganisationBroadcasts,
  listPublicBroadcasts,
  updateBroadcast,
  type BroadcastCommandBody,
  type BroadcastMediaEventBody,
  type CreateBroadcastBody,
  type UpdateBroadcastBody,
} from './broadcasts.service.js';

function requireDatabase(database: DatabaseContext | null): DatabaseContext {
  if (!database) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Broadcasts are temporarily unavailable.',
    );
  }
  return database;
}

async function requireUser(
  request: FastifyRequest,
  database: DatabaseContext,
) {
  const user = await findAuthenticatedUser(request, database);
  if (!user) {
    throw new ApiError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Sign in to continue.',
    );
  }
  return user;
}

function secretMatches(provided: unknown, expected: string | undefined): boolean {
  if (typeof provided !== 'string' || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer);
}

export function registerBroadcastRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
  mediaControlSecret: string | undefined,
): void {
  registerRecordingRoutes(app, database, mediaControlSecret);

  app.get<{ Querystring: { status?: string; limit?: string } }>(
    '/api/v1/broadcasts',
    async (request) => {
      const context = requireDatabase(database);
      return {
        broadcasts: await listPublicBroadcasts(
          context.db,
          request.query.status,
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
    '/api/v1/broadcasts/:organisationSlug/:channelSlug/:broadcastSlug',
    async (request) => {
      const context = requireDatabase(database);
      return {
        broadcast: await getPublicBroadcast(
          context.db,
          request.params.organisationSlug,
          request.params.channelSlug,
          request.params.broadcastSlug,
        ),
      };
    },
  );

  app.post<{
    Params: { organisationId: string; channelId: string };
    Body: CreateBroadcastBody;
  }>(
    '/api/v1/organisations/:organisationId/channels/:channelId/broadcasts',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const broadcast = await createBroadcast(
        context.db,
        request.params.organisationId,
        request.params.channelId,
        user.id,
        request.body ?? {},
      );
      return reply.code(201).send({ broadcast });
    },
  );

  app.get<{ Params: { organisationId: string; channelId: string } }>(
    '/api/v1/organisations/:organisationId/channels/:channelId/broadcasts',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        broadcasts: await listOrganisationBroadcasts(
          context.db,
          request.params.organisationId,
          request.params.channelId,
          user.id,
        ),
      };
    },
  );

  app.get<{ Params: { organisationId: string; broadcastId: string } }>(
    '/api/v1/organisations/:organisationId/broadcasts/:broadcastId',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        broadcast: await getOrganisationBroadcast(
          context.db,
          request.params.organisationId,
          request.params.broadcastId,
          user.id,
        ),
      };
    },
  );

  app.patch<{
    Params: { organisationId: string; broadcastId: string };
    Body: UpdateBroadcastBody;
  }>(
    '/api/v1/organisations/:organisationId/broadcasts/:broadcastId',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        broadcast: await updateBroadcast(
          context.db,
          request.params.organisationId,
          request.params.broadcastId,
          user.id,
          request.body ?? {},
        ),
      };
    },
  );

  for (const command of ['schedule', 'start', 'cancel', 'end'] as const) {
    app.post<{
      Params: { organisationId: string; broadcastId: string };
      Headers: { 'idempotency-key'?: string };
      Body: BroadcastCommandBody;
    }>(
      `/api/v1/organisations/:organisationId/broadcasts/:broadcastId/${command}`,
      async (request) => {
        const context = requireDatabase(database);
        const user = await requireUser(request, context);
        return {
          broadcast: await commandBroadcast(
            context.db,
            request.params.organisationId,
            request.params.broadcastId,
            user.id,
            command,
            request.headers['idempotency-key'],
            request.body ?? {},
          ),
        };
      },
    );
  }

  app.post<{
    Params: { broadcastId: string };
    Headers: { 'x-digistream-media-secret'?: string };
    Body: BroadcastMediaEventBody;
  }>(
    '/api/v1/internal/media/broadcasts/:broadcastId/events',
    async (request) => {
      const context = requireDatabase(database);
      if (!mediaControlSecret) {
        throw new ApiError(
          503,
          'MEDIA_CONTROL_UNAVAILABLE',
          'Media control is not configured.',
        );
      }
      if (
        !secretMatches(
          request.headers['x-digistream-media-secret'],
          mediaControlSecret,
        )
      ) {
        throw new ApiError(
          401,
          'MEDIA_CONTROL_UNAUTHORIZED',
          'Media control authentication failed.',
        );
      }
      return {
        broadcast: await applyBroadcastMediaEvent(
          context.db,
          request.params.broadcastId,
          request.body ?? {},
        ),
      };
    },
  );
}

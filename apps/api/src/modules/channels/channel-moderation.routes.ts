import type { FastifyInstance, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import {
  moderateChannel,
  restoreDeletedChannel,
  softDeleteChannel,
  type ChannelDeletionBody,
  type ChannelModerationBody,
} from './channel-moderation.service.js';

function requireDatabase(database: DatabaseContext | null): DatabaseContext {
  if (!database) {
    throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Channels are temporarily unavailable.');
  }
  return database;
}

async function requireUser(request: FastifyRequest, database: DatabaseContext) {
  const user = await findAuthenticatedUser(request, database);
  if (!user) {
    throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.');
  }
  return user;
}

export function registerChannelModerationRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
): void {
  app.post<{
    Params: { organisationId: string; channelId: string };
    Body: ChannelModerationBody;
  }>(
    '/api/v1/organisations/:organisationId/channels/:channelId/moderation',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        channel: await moderateChannel(
          context.db,
          request.params.organisationId,
          request.params.channelId,
          user.id,
          request.body ?? {},
        ),
      };
    },
  );

  app.delete<{
    Params: { organisationId: string; channelId: string };
    Body: ChannelDeletionBody;
  }>(
    '/api/v1/organisations/:organisationId/channels/:channelId',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        channel: await softDeleteChannel(
          context.db,
          request.params.organisationId,
          request.params.channelId,
          user.id,
          request.body ?? {},
        ),
      };
    },
  );

  app.post<{
    Params: { organisationId: string; channelId: string };
    Body: ChannelDeletionBody;
  }>(
    '/api/v1/organisations/:organisationId/channels/:channelId/restore',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        channel: await restoreDeletedChannel(
          context.db,
          request.params.organisationId,
          request.params.channelId,
          user.id,
          request.body ?? {},
        ),
      };
    },
  );
}

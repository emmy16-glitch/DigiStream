import type { FastifyInstance, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import { registerChannelFollowingRoutes } from './channel-following.routes.js';
import {
  createChannel,
  getOrganisationChannel,
  getPublicChannel,
  listOrganisationChannels,
  listPublicChannels,
  updateChannel,
  type CreateChannelBody,
  type UpdateChannelBody,
} from './channels.service.js';

function requireDatabase(database: DatabaseContext | null): DatabaseContext {
  if (!database) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Channels are temporarily unavailable.',
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

export function registerChannelRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
): void {
  app.get<{ Querystring: { category?: string; limit?: string } }>(
    '/api/v1/channels',
    async (request) => {
      const context = requireDatabase(database);
      return {
        channels: await listPublicChannels(
          context.db,
          request.query.category,
          request.query.limit,
        ),
      };
    },
  );

  app.get<{ Params: { organisationSlug: string; channelSlug: string } }>(
    '/api/v1/channels/:organisationSlug/:channelSlug',
    async (request) => {
      const context = requireDatabase(database);
      return {
        channel: await getPublicChannel(
          context.db,
          request.params.organisationSlug,
          request.params.channelSlug,
        ),
      };
    },
  );

  app.post<{
    Params: { organisationId: string };
    Body: CreateChannelBody;
  }>(
    '/api/v1/organisations/:organisationId/channels',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const channel = await createChannel(
        context.db,
        request.params.organisationId,
        user.id,
        request.body ?? {},
      );
      return reply.code(201).send({ channel });
    },
  );

  app.get<{ Params: { organisationId: string } }>(
    '/api/v1/organisations/:organisationId/channels',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        channels: await listOrganisationChannels(
          context.db,
          request.params.organisationId,
          user.id,
        ),
      };
    },
  );

  app.get<{ Params: { organisationId: string; channelId: string } }>(
    '/api/v1/organisations/:organisationId/channels/:channelId',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        channel: await getOrganisationChannel(
          context.db,
          request.params.organisationId,
          request.params.channelId,
          user.id,
        ),
      };
    },
  );

  app.patch<{
    Params: { organisationId: string; channelId: string };
    Body: UpdateChannelBody;
  }>(
    '/api/v1/organisations/:organisationId/channels/:channelId',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        channel: await updateChannel(
          context.db,
          request.params.organisationId,
          request.params.channelId,
          user.id,
          request.body ?? {},
        ),
      };
    },
  );

  registerChannelFollowingRoutes(app, database);
}

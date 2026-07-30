import type { FastifyInstance, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import type { DeliveryProvider } from '../media/delivery-provider.js';
import type { MediaRelayProvider } from '../media/media-relay-provider.js';
import {
  issueMemberBroadcastPlayback,
  issuePublicBroadcastPlayback,
  refreshBroadcastDelivery,
  startBroadcastDelivery,
  stopBroadcastDelivery,
} from './broadcast-delivery.service.js';

function requireDatabase(database: DatabaseContext | null): DatabaseContext {
  if (!database) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Public delivery is temporarily unavailable.',
    );
  }
  return database;
}

function requireProvider(provider: DeliveryProvider | null): DeliveryProvider {
  if (!provider) {
    throw new ApiError(
      503,
      'OVENMEDIAENGINE_NOT_CONFIGURED',
      'Public delivery is not configured.',
    );
  }
  return provider;
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

function playbackResponse(playback: ReturnType<DeliveryProvider['issuePlayback']>) {
  return {
    playback: {
      provider: playback.provider,
      expiresAt: playback.expiresAt.toISOString(),
      sources: playback.sources,
    },
  };
}

function noStore(reply: { header(name: string, value: string): unknown }): void {
  reply.header('cache-control', 'no-store');
  reply.header('pragma', 'no-cache');
}

export function registerBroadcastDeliveryRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
  provider: DeliveryProvider | null,
  relayProvider: MediaRelayProvider | null,
): void {
  for (const action of ['start', 'refresh', 'stop'] as const) {
    app.post<{
      Params: { organisationId: string; broadcastId: string };
    }>(
      `/api/v1/organisations/:organisationId/broadcasts/:broadcastId/delivery/${action}`,
      async (request) => {
        const context = requireDatabase(database);
        const deliveryProvider = requireProvider(provider);
        const user = await requireUser(request, context);
        const args = [
          context.db,
          deliveryProvider,
          relayProvider,
          request.params.organisationId,
          request.params.broadcastId,
          user.id,
        ] as const;

        const delivery =
          action === 'start'
            ? await startBroadcastDelivery(...args)
            : action === 'refresh'
              ? await refreshBroadcastDelivery(...args)
              : await stopBroadcastDelivery(...args);
        return { delivery };
      },
    );
  }

  app.get<{
    Params: { organisationId: string; broadcastId: string };
  }>(
    '/api/v1/organisations/:organisationId/broadcasts/:broadcastId/playback',
    async (request, reply) => {
      const context = requireDatabase(database);
      const deliveryProvider = requireProvider(provider);
      const user = await requireUser(request, context);
      const playback = await issueMemberBroadcastPlayback(
        context.db,
        deliveryProvider,
        request.params.organisationId,
        request.params.broadcastId,
        user.id,
      );
      noStore(reply);
      return playbackResponse(playback);
    },
  );

  app.get<{
    Params: {
      organisationSlug: string;
      channelSlug: string;
      broadcastSlug: string;
    };
  }>(
    '/api/v1/broadcasts/:organisationSlug/:channelSlug/:broadcastSlug/playback',
    async (request, reply) => {
      const context = requireDatabase(database);
      const deliveryProvider = requireProvider(provider);
      const playback = await issuePublicBroadcastPlayback(
        context.db,
        deliveryProvider,
        request.params.organisationSlug,
        request.params.channelSlug,
        request.params.broadcastSlug,
      );
      noStore(reply);
      return playbackResponse(playback);
    },
  );
}

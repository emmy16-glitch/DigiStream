import type { FastifyInstance, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import type { DeliveryProvider } from '../media/delivery-provider.js';
import type { MediaRelayProvider } from '../media/media-relay-provider.js';
import { findBroadcastDeliveryBySlugs } from './broadcast-delivery.repository.js';
import {
  issueMemberBroadcastPlayback,
  issuePublicBroadcastPlayback,
  refreshBroadcastDelivery,
  startBroadcastDelivery,
  stopBroadcastDelivery,
} from './broadcast-delivery.service.js';
import {
  createPlaybackTelemetrySession,
  recordPlaybackTelemetryEvent,
  type PlaybackTelemetryEvent,
  type PlaybackTelemetryProtocol,
} from './playback-telemetry.repository.js';

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

async function withDeliveryOperationLock<T>(
  database: DatabaseContext,
  broadcastId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const client = await database.pool.connect();
  const lockName = `digistream-delivery:${broadcastId}`;
  let acquired = false;

  try {
    const result = await client.query<{ acquired: boolean }>(
      'select pg_try_advisory_lock(hashtextextended($1, 0)) as acquired',
      [lockName],
    );
    acquired = result.rows[0]?.acquired === true;
    if (!acquired) {
      throw new ApiError(
        409,
        'DELIVERY_OPERATION_IN_PROGRESS',
        'Another public-delivery operation is already running. Wait for it to finish, then check delivery status.',
      );
    }
    return await operation();
  } finally {
    if (acquired) {
      await client
        .query('select pg_advisory_unlock(hashtextextended($1, 0))', [
          lockName,
        ])
        .catch(() => undefined);
    }
    client.release();
  }
}

function playbackResponse(
  playback: ReturnType<DeliveryProvider['issuePlayback']>,
  telemetry: Awaited<ReturnType<typeof createPlaybackTelemetrySession>>,
) {
  return {
    playback: {
      provider: playback.provider,
      expiresAt: playback.expiresAt.toISOString(),
      sources: playback.sources,
    },
    telemetry,
  };
}

function noStore(reply: { header(name: string, value: string): unknown }): void {
  reply.header('cache-control', 'no-store');
  reply.header('pragma', 'no-cache');
}

const telemetryEvents = new Set<PlaybackTelemetryEvent>([
  'started',
  'heartbeat',
  'paused',
  'buffering',
  'source_changed',
  'error',
  'ended',
]);

function parseTelemetryBody(body: unknown): {
  token: string;
  event: PlaybackTelemetryEvent;
  protocol: PlaybackTelemetryProtocol | null;
} {
  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'INVALID_PLAYBACK_TELEMETRY', 'Playback telemetry is invalid.');
  }
  const candidate = body as Record<string, unknown>;
  const token = typeof candidate.token === 'string' ? candidate.token : '';
  const event = typeof candidate.event === 'string' ? candidate.event : '';
  const protocol = candidate.protocol === 'webrtc' || candidate.protocol === 'llhls'
    ? candidate.protocol
    : null;
  if (
    token.length < 32 ||
    token.length > 128 ||
    !telemetryEvents.has(event as PlaybackTelemetryEvent) ||
    (candidate.protocol !== undefined && candidate.protocol !== null && protocol === null)
  ) {
    throw new ApiError(400, 'INVALID_PLAYBACK_TELEMETRY', 'Playback telemetry is invalid.');
  }
  return { token, event: event as PlaybackTelemetryEvent, protocol };
}

export function registerBroadcastDeliveryRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
  provider: DeliveryProvider | null,
  relayProvider: MediaRelayProvider | null,
): void {
  for (const action of ['start', 'refresh', 'status', 'stop'] as const) {
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

        const delivery = await withDeliveryOperationLock(
          context,
          request.params.broadcastId,
          () =>
            action === 'start'
              ? startBroadcastDelivery(...args)
              : action === 'refresh' || action === 'status'
                ? refreshBroadcastDelivery(...args)
                : stopBroadcastDelivery(...args),
        );
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
      const telemetry = await createPlaybackTelemetrySession(
        context,
        request.params.broadcastId,
        user.id,
      );
      noStore(reply);
      return playbackResponse(playback, telemetry);
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
      const broadcast = await findBroadcastDeliveryBySlugs(
        context.db,
        request.params.organisationSlug,
        request.params.channelSlug,
        request.params.broadcastSlug,
      );
      if (!broadcast) {
        throw new ApiError(404, 'NOT_FOUND', 'The requested resource was not found.');
      }
      const user = await findAuthenticatedUser(request, context);
      const telemetry = await createPlaybackTelemetrySession(
        context,
        broadcast.id,
        user?.id ?? null,
      );
      noStore(reply);
      return playbackResponse(playback, telemetry);
    },
  );

  app.post<{
    Params: { sessionId: string };
    Body: unknown;
  }>(
    '/api/v1/playback-telemetry/:sessionId',
    async (request, reply) => {
      const context = requireDatabase(database);
      const body = parseTelemetryBody(request.body);
      const accepted = await recordPlaybackTelemetryEvent(context, {
        sessionId: request.params.sessionId,
        ...body,
      });
      if (!accepted) {
        throw new ApiError(404, 'NOT_FOUND', 'The requested resource was not found.');
      }
      noStore(reply);
      return { accepted: true };
    },
  );
}

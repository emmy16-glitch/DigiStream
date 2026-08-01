import type { DigiStreamDatabase } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import type {
  DeliveryHealth,
  DeliveryPlayback,
  DeliveryProvider,
} from '../media/delivery-provider.js';
import {
  MediaRelayProviderError,
  type MediaRelayJob,
  type MediaRelayProvider,
} from '../media/media-relay-provider.js';
import { OvenMediaEngineError } from '../media/ovenmediaengine-provider.js';
import { findOrganisationRole } from '../organisations/organisation-memberships.repository.js';
import type { OrganisationRole } from '../organisations/organisations.types.js';
import {
  findBroadcastDeliveryById,
  findBroadcastDeliveryBySlugs,
  type BroadcastDeliveryContext,
} from './broadcast-delivery.repository.js';
import {
  findBroadcastMediaRelay,
  saveBroadcastMediaRelay,
  updateBroadcastMediaRelayJob,
} from './broadcast-media-relays.repository.js';
import type { BroadcastMediaRelay } from './broadcast-media-relays.schema.js';
import { applyBroadcastMediaEvent } from './broadcasts.service.js';

const DELIVERY_MANAGERS = new Set<OrganisationRole>([
  'owner',
  'admin',
  'broadcaster',
]);
const DELIVERY_ACTIVE_STATES = new Set([
  'starting',
  'live',
  'reconnecting',
]);
const PLAYABLE_STATES = new Set(['live', 'reconnecting', 'ending']);
const DELIVERY_STOP_STATES = new Set([
  'ending',
  'completed',
  'cancelled',
  'failed',
]);

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function validSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 100;
}

function notFound(): never {
  throw new ApiError(
    404,
    'BROADCAST_NOT_FOUND',
    'The requested broadcast was not found.',
  );
}

async function requireRole(
  db: DigiStreamDatabase,
  organisationId: string,
  userId: string,
): Promise<OrganisationRole> {
  if (!validUuid(organisationId)) return notFound();
  const role = await findOrganisationRole(db, organisationId, userId);
  return role ?? notFound();
}

async function requireManager(
  db: DigiStreamDatabase,
  organisationId: string,
  userId: string,
): Promise<void> {
  const role = await requireRole(db, organisationId, userId);
  if (!DELIVERY_MANAGERS.has(role)) {
    throw new ApiError(
      403,
      'DELIVERY_MANAGEMENT_REQUIRED',
      'Owner, administrator or broadcaster permission is required.',
    );
  }
}

function providerFailure(error: unknown): never {
  if (error instanceof OvenMediaEngineError) {
    throw new ApiError(
      error.statusCode === 401 || error.statusCode === 403 ? 503 : 502,
      'DELIVERY_PROVIDER_ERROR',
      'Public stream delivery is temporarily unavailable.',
    );
  }
  if (error instanceof MediaRelayProviderError) {
    throw new ApiError(
      error.code === 'invalid_configuration' ? 503 : 502,
      'MEDIA_RELAY_PROVIDER_ERROR',
      'The contribution-to-delivery relay is temporarily unavailable.',
    );
  }
  throw error;
}

function publicRelay(relay: BroadcastMediaRelay | null) {
  return relay
    ? {
        provider: 'livekit_egress' as const,
        protocol: relay.protocol,
        status: relay.status,
      }
    : null;
}

type DeliveryProblem = {
  code: 'MEDIA_RELAY_FAILED';
  message: string;
  retryable: true;
};

function deliveryResult(
  context: BroadcastDeliveryContext,
  health: DeliveryHealth,
  relay: BroadcastMediaRelay | null,
  status = context.status,
  lifecycleVersion = context.lifecycleVersion,
  problem: DeliveryProblem | null = null,
) {
  const active = DELIVERY_ACTIVE_STATES.has(status);
  return {
    provider: 'ovenmediaengine' as const,
    ready: health.ready,
    connections: health.connections,
    relay: publicRelay(relay),
    problem,
    recovery: {
      checkedAt: new Date().toISOString(),
      privateStudioPreserved: !health.ready && active,
      retryable: !health.ready && active,
    },
    broadcast: {
      id: context.id,
      status,
      lifecycleVersion,
    },
  };
}

async function markDeliveryReady(
  db: DigiStreamDatabase,
  context: BroadcastDeliveryContext,
) {
  if (
    context.deliveryReadyAt ||
    (context.status !== 'starting' && context.status !== 'reconnecting')
  ) {
    return null;
  }
  return applyBroadcastMediaEvent(db, context.id, {
    event: 'delivery_ready',
    idempotencyKey: `ome-ready-${context.id}-${context.lifecycleVersion}`,
  });
}

async function startOrReuseRelay(
  db: DigiStreamDatabase,
  relayProvider: MediaRelayProvider,
  context: BroadcastDeliveryContext,
  target: NonNullable<ReturnType<NonNullable<DeliveryProvider['getIngestTarget']>>>,
): Promise<BroadcastMediaRelay> {
  const existing = await findBroadcastMediaRelay(db, context.id);
  let job: MediaRelayJob;

  if (
    existing?.externalId &&
    (existing.status === 'starting' ||
      existing.status === 'active' ||
      existing.status === 'stopping')
  ) {
    try {
      job = await relayProvider.inspectRelay(existing.externalId);
      return updateBroadcastMediaRelayJob(db, existing, job);
    } catch (error) {
      if (!(error instanceof MediaRelayProviderError) || error.code !== 'job_not_found') {
        throw error;
      }
    }
  }

  job = await relayProvider.startAudioRelay({
    broadcastId: context.id,
    roomName: context.contributionRoomName,
    targetUrl: target.url,
    protocol: target.protocol,
  });
  return saveBroadcastMediaRelay(db, {
    broadcastId: context.id,
    protocol: target.protocol,
    targetHost: target.host,
    job,
  });
}

async function ensureRelayHealthy(
  db: DigiStreamDatabase,
  relayProvider: MediaRelayProvider,
  relay: BroadcastMediaRelay,
): Promise<BroadcastMediaRelay> {
  if (!relay.externalId) return relay;
  const job = await relayProvider.inspectRelay(relay.externalId);
  return updateBroadcastMediaRelayJob(db, relay, job);
}

async function markDeliveryUnavailable(
  db: DigiStreamDatabase,
  context: BroadcastDeliveryContext,
) {
  if (context.status !== 'live' || !context.deliveryReadyAt) return null;
  return applyBroadcastMediaEvent(db, context.id, {
    event: 'delivery_lost',
    idempotencyKey: `delivery-recovery-${context.id}-${context.lifecycleVersion}`,
  });
}

function failedRelayProblem(): DeliveryProblem {
  return {
    code: 'MEDIA_RELAY_FAILED',
    message:
      'The public-delivery relay failed. The private Studio remains connected and delivery can be retried safely.',
    retryable: true,
  };
}

export async function startBroadcastDelivery(
  db: DigiStreamDatabase,
  provider: DeliveryProvider,
  relayProvider: MediaRelayProvider | null,
  organisationId: string,
  broadcastId: string,
  userId: string,
) {
  await requireManager(db, organisationId, userId);
  if (!validUuid(broadcastId)) return notFound();
  const context = await findBroadcastDeliveryById(db, organisationId, broadcastId);
  if (!context) return notFound();
  if (!DELIVERY_ACTIVE_STATES.has(context.status)) {
    throw new ApiError(
      409,
      'BROADCAST_NOT_READY_FOR_DELIVERY',
      'Start the broadcast lifecycle before starting public delivery.',
    );
  }

  try {
    const target = provider.getIngestTarget?.(context.deliveryStreamName) ?? null;
    let relay: BroadcastMediaRelay | null = null;
    let health: DeliveryHealth;

    if (target) {
      if (!relayProvider) {
        throw new ApiError(
          503,
          'MEDIA_RELAY_NOT_CONFIGURED',
          'LiveKit Egress is required for push delivery.',
        );
      }
      relay = await startOrReuseRelay(db, relayProvider, context, target);
      if (relay.status === 'failed') {
        const updated = await markDeliveryUnavailable(db, context);
        return deliveryResult(
          context,
          { ready: false, connections: null },
          relay,
          updated?.status ?? context.status,
          updated?.lifecycleVersion ?? context.lifecycleVersion,
          failedRelayProblem(),
        );
      }
      health = await provider.inspectDelivery(context.deliveryStreamName);
    } else {
      health = await provider.ensureDelivery({
        broadcastId: context.id,
        streamName: context.deliveryStreamName,
        contributionRoomName: context.contributionRoomName,
      });
    }

    const updated = health.ready ? await markDeliveryReady(db, context) : null;
    return deliveryResult(
      context,
      health,
      relay,
      updated?.status ?? context.status,
      updated?.lifecycleVersion ?? context.lifecycleVersion,
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    await markDeliveryUnavailable(db, context).catch(() => null);
    return providerFailure(error);
  }
}

export async function refreshBroadcastDelivery(
  db: DigiStreamDatabase,
  provider: DeliveryProvider,
  relayProvider: MediaRelayProvider | null,
  organisationId: string,
  broadcastId: string,
  userId: string,
) {
  await requireManager(db, organisationId, userId);
  if (!validUuid(broadcastId)) return notFound();
  const context = await findBroadcastDeliveryById(db, organisationId, broadcastId);
  if (!context) return notFound();

  try {
    let relay = await findBroadcastMediaRelay(db, context.id);
    if (relay && relayProvider && relay.externalId) {
      relay = await ensureRelayHealthy(db, relayProvider, relay);
      if (relay.status === 'failed') {
        const updated = await markDeliveryUnavailable(db, context);
        return deliveryResult(
          context,
          { ready: false, connections: null },
          relay,
          updated?.status ?? context.status,
          updated?.lifecycleVersion ?? context.lifecycleVersion,
          failedRelayProblem(),
        );
      }
    }

    const health = await provider.inspectDelivery(context.deliveryStreamName);
    if (health.ready) {
      const updated = await markDeliveryReady(db, context);
      return deliveryResult(
        context,
        health,
        relay,
        updated?.status ?? context.status,
        updated?.lifecycleVersion ?? context.lifecycleVersion,
      );
    }

    if (context.status === 'live' && context.deliveryReadyAt) {
      const updated = await applyBroadcastMediaEvent(db, context.id, {
        event: 'delivery_lost',
        idempotencyKey: `ome-lost-${context.id}-${context.lifecycleVersion}`,
      });
      return deliveryResult(
        context,
        health,
        relay,
        updated.status,
        updated.lifecycleVersion,
      );
    }
    return deliveryResult(context, health, relay);
  } catch (error) {
    await markDeliveryUnavailable(db, context).catch(() => null);
    return providerFailure(error);
  }
}

export async function stopBroadcastDelivery(
  db: DigiStreamDatabase,
  provider: DeliveryProvider,
  relayProvider: MediaRelayProvider | null,
  organisationId: string,
  broadcastId: string,
  userId: string,
) {
  await requireManager(db, organisationId, userId);
  if (!validUuid(broadcastId)) return notFound();
  const context = await findBroadcastDeliveryById(db, organisationId, broadcastId);
  if (!context) return notFound();
  if (!DELIVERY_STOP_STATES.has(context.status)) {
    throw new ApiError(
      409,
      'BROADCAST_NOT_READY_TO_STOP_DELIVERY',
      'End or cancel the broadcast before stopping public delivery.',
    );
  }

  try {
    let relay = await findBroadcastMediaRelay(db, context.id);
    if (
      relay &&
      relayProvider &&
      relay.externalId &&
      relay.status !== 'stopped' &&
      relay.status !== 'failed'
    ) {
      const job = await relayProvider.stopRelay(relay.externalId);
      relay = await updateBroadcastMediaRelayJob(db, relay, job);
    }

    await provider.stopDelivery(context.deliveryStreamName);
    const health: DeliveryHealth = { ready: false, connections: null };
    const updated =
      context.status === 'ending'
        ? await applyBroadcastMediaEvent(db, context.id, {
            event: 'delivery_stopped',
            idempotencyKey: `ome-stopped-${context.id}-${context.lifecycleVersion}`,
          })
        : null;
    return deliveryResult(
      context,
      health,
      relay,
      updated?.status ?? context.status,
      updated?.lifecycleVersion ?? context.lifecycleVersion,
    );
  } catch (error) {
    return providerFailure(error);
  }
}

function ensurePlayable(context: BroadcastDeliveryContext): void {
  if (
    context.channelStatus !== 'active' ||
    !PLAYABLE_STATES.has(context.status) ||
    !context.deliveryReadyAt
  ) {
    throw new ApiError(
      409,
      'BROADCAST_NOT_PLAYABLE',
      'Public playback is not ready yet.',
    );
  }
}

function playbackTtlSeconds(): number {
  const value = Number.parseInt(process.env.OME_PLAYBACK_TTL_SECONDS ?? '120', 10);
  return Number.isInteger(value) && value >= 30 && value <= 900 ? value : 120;
}

function issuePlayback(
  provider: DeliveryProvider,
  context: BroadcastDeliveryContext,
): DeliveryPlayback {
  ensurePlayable(context);
  return provider.issuePlayback(
    context.deliveryStreamName,
    new Date(Date.now() + playbackTtlSeconds() * 1_000),
  );
}

export async function issuePublicBroadcastPlayback(
  db: DigiStreamDatabase,
  provider: DeliveryProvider,
  organisationSlug: string,
  channelSlug: string,
  broadcastSlug: string,
): Promise<DeliveryPlayback> {
  if (
    !validSlug(organisationSlug) ||
    !validSlug(channelSlug) ||
    !validSlug(broadcastSlug)
  ) {
    return notFound();
  }
  const context = await findBroadcastDeliveryBySlugs(
    db,
    organisationSlug,
    channelSlug,
    broadcastSlug,
  );
  if (
    !context ||
    (context.channelVisibility !== 'public' &&
      context.channelVisibility !== 'unlisted')
  ) {
    return notFound();
  }
  return issuePlayback(provider, context);
}

export async function issueMemberBroadcastPlayback(
  db: DigiStreamDatabase,
  provider: DeliveryProvider,
  organisationId: string,
  broadcastId: string,
  userId: string,
): Promise<DeliveryPlayback> {
  await requireRole(db, organisationId, userId);
  if (!validUuid(broadcastId)) return notFound();
  const context = await findBroadcastDeliveryById(db, organisationId, broadcastId);
  if (!context) return notFound();
  return issuePlayback(provider, context);
}

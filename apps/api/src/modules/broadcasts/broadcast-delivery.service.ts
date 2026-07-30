import type { DigiStreamDatabase } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import type {
  DeliveryHealth,
  DeliveryPlayback,
  DeliveryProvider,
} from '../media/delivery-provider.js';
import { OvenMediaEngineError } from '../media/ovenmediaengine-provider.js';
import { findOrganisationRole } from '../organisations/organisation-memberships.repository.js';
import type { OrganisationRole } from '../organisations/organisations.types.js';
import {
  findBroadcastDeliveryById,
  findBroadcastDeliveryBySlugs,
  type BroadcastDeliveryContext,
} from './broadcast-delivery.repository.js';
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
  throw error;
}

function deliveryResult(
  context: BroadcastDeliveryContext,
  health: DeliveryHealth,
  status = context.status,
  lifecycleVersion = context.lifecycleVersion,
) {
  return {
    provider: 'ovenmediaengine' as const,
    ready: health.ready,
    connections: health.connections,
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

export async function startBroadcastDelivery(
  db: DigiStreamDatabase,
  provider: DeliveryProvider,
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
    const health = await provider.ensureDelivery({
      broadcastId: context.id,
      streamName: context.deliveryStreamName,
      contributionRoomName: context.contributionRoomName,
    });
    const updated = health.ready ? await markDeliveryReady(db, context) : null;
    return deliveryResult(
      context,
      health,
      updated?.status ?? context.status,
      updated?.lifecycleVersion ?? context.lifecycleVersion,
    );
  } catch (error) {
    return providerFailure(error);
  }
}

export async function refreshBroadcastDelivery(
  db: DigiStreamDatabase,
  provider: DeliveryProvider,
  organisationId: string,
  broadcastId: string,
  userId: string,
) {
  await requireManager(db, organisationId, userId);
  if (!validUuid(broadcastId)) return notFound();
  const context = await findBroadcastDeliveryById(db, organisationId, broadcastId);
  if (!context) return notFound();

  try {
    const health = await provider.inspectDelivery(context.deliveryStreamName);
    if (health.ready) {
      const updated = await markDeliveryReady(db, context);
      return deliveryResult(
        context,
        health,
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
        updated.status,
        updated.lifecycleVersion,
      );
    }
    return deliveryResult(context, health);
  } catch (error) {
    return providerFailure(error);
  }
}

export async function stopBroadcastDelivery(
  db: DigiStreamDatabase,
  provider: DeliveryProvider,
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

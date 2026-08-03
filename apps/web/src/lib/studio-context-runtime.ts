import type { RequestedStudioContext } from '../features/broadcasting/studio-context-selection';

type IdentifiedResource = {
  id: string;
};

type ChannelResource = IdentifiedResource & {
  status?: string;
};

type BroadcastResource = IdentifiedResource & {
  status?: string;
};

const contributionStates = new Set([
  'draft',
  'scheduled',
  'starting',
  'live',
  'reconnecting',
]);

let requestedContext: RequestedStudioContext = {};

function normalized(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function moveRequestedFirst<T extends IdentifiedResource>(
  resources: T[],
  requestedId: string | null,
  allowed: (resource: T) => boolean = () => true,
): T[] {
  if (!requestedId) return resources;
  const index = resources.findIndex(
    (resource) => resource.id === requestedId && allowed(resource),
  );
  if (index <= 0) return resources;
  const requested = resources[index];
  if (!requested) return resources;
  return [requested, ...resources.slice(0, index), ...resources.slice(index + 1)];
}

export function setRequestedStudioContext(
  context?: RequestedStudioContext,
): void {
  requestedContext = context ? { ...context } : {};
}

export function clearRequestedStudioContext(): void {
  requestedContext = {};
}

/**
 * Prioritises a requested Studio organisation, channel and broadcast only when
 * each item is present in the authorised API response for the exact parent
 * route. Missing, stale, inactive or cross-tenant hints are ignored so the
 * existing Studio falls back to its normal safe selection behaviour.
 */
export function prioritiseStudioSelectionPayload(
  path: string,
  payload: unknown,
): unknown {
  if (!payload || typeof payload !== 'object') return payload;

  const record = payload as Record<string, unknown>;
  const organisationId = normalized(requestedContext.organisationId);
  const channelId = normalized(requestedContext.channelId);
  const broadcastId = normalized(requestedContext.broadcastId);

  if (path === '/api/v1/organisations' && Array.isArray(record.organisations)) {
    return {
      ...record,
      organisations: moveRequestedFirst(
        record.organisations as IdentifiedResource[],
        organisationId,
      ),
    };
  }

  const channelMatch = /^\/api\/v1\/organisations\/([^/]+)\/channels$/.exec(path);
  if (
    channelMatch?.[1] &&
    organisationId === channelMatch[1] &&
    Array.isArray(record.channels)
  ) {
    return {
      ...record,
      channels: moveRequestedFirst(
        record.channels as ChannelResource[],
        channelId,
        (channel) => channel.status === 'active',
      ),
    };
  }

  const broadcastMatch = /^\/api\/v1\/organisations\/([^/]+)\/channels\/([^/]+)\/broadcasts$/.exec(path);
  if (
    broadcastMatch?.[1] &&
    broadcastMatch[2] &&
    organisationId === broadcastMatch[1] &&
    channelId === broadcastMatch[2] &&
    Array.isArray(record.broadcasts)
  ) {
    return {
      ...record,
      broadcasts: moveRequestedFirst(
        record.broadcasts as BroadcastResource[],
        broadcastId,
        (broadcast) => contributionStates.has(broadcast.status ?? ''),
      ),
    };
  }

  return payload;
}

export type { RequestedStudioContext };

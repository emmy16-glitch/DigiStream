import type { Broadcast, Channel, Organisation } from '@digistream/contracts';

export type RequestedStudioContext = {
  organisationId?: string | null;
  channelId?: string | null;
  broadcastId?: string | null;
};

export type StudioContextFallbackReason =
  | 'organisation-unavailable'
  | 'channel-unavailable'
  | 'broadcast-unavailable'
  | null;

export type StudioContextSelection = {
  organisationId: string;
  channelId: string;
  broadcastId: string;
  requestedContextPreserved: boolean;
  fallbackReason: StudioContextFallbackReason;
};

const STUDIO_BROADCAST_STATES: ReadonlySet<Broadcast['status']> = new Set([
  'draft',
  'scheduled',
  'starting',
  'live',
  'reconnecting',
]);

const STUDIO_STATUS_PRIORITY: Partial<Record<Broadcast['status'], number>> = {
  live: 5,
  reconnecting: 4,
  starting: 3,
  scheduled: 2,
  draft: 1,
};

function persistedTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function newestPersisted<T extends { id: string; createdAt: string; updatedAt: string }>(
  resources: T[],
): T | null {
  return [...resources].sort((left, right) => {
    const updatedDifference =
      persistedTimestamp(right.updatedAt) - persistedTimestamp(left.updatedAt);
    if (updatedDifference !== 0) return updatedDifference;
    const createdDifference =
      persistedTimestamp(right.createdAt) - persistedTimestamp(left.createdAt);
    if (createdDifference !== 0) return createdDifference;
    return left.id.localeCompare(right.id);
  })[0] ?? null;
}

function strongestBroadcast(broadcasts: Broadcast[]): Broadcast | null {
  return [...broadcasts].sort((left, right) => {
    const statusDifference =
      (STUDIO_STATUS_PRIORITY[right.status] ?? 0) -
      (STUDIO_STATUS_PRIORITY[left.status] ?? 0);
    if (statusDifference !== 0) return statusDifference;

    // lifecycleVersion compares snapshots of one broadcast, not two distinct
    // broadcasts. API list entries are separate resources, so persisted update
    // and creation times decide between broadcasts with the same status.
    if (left.id === right.id) {
      const lifecycleDifference = right.lifecycleVersion - left.lifecycleVersion;
      if (lifecycleDifference !== 0) return lifecycleDifference;
    }
    const updatedDifference =
      persistedTimestamp(right.updatedAt) - persistedTimestamp(left.updatedAt);
    if (updatedDifference !== 0) return updatedDifference;
    const createdDifference =
      persistedTimestamp(right.createdAt) - persistedTimestamp(left.createdAt);
    if (createdDifference !== 0) return createdDifference;
    return left.id.localeCompare(right.id);
  })[0] ?? null;
}

function requestedValue(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

/**
 * Resolves an optional contextual Studio request against API-backed resources.
 *
 * Requested identifiers are treated only as hints. Every relationship is
 * re-verified from the loaded organisation, channel and broadcast resources.
 * Stale, unauthorized or private-not-found context therefore falls back to a
 * valid selectable resource instead of being trusted by the client.
 *
 * fallbackReason remains null when no contextual identifier was requested. If
 * a requested resource cannot be preserved, it identifies the earliest failed
 * relationship so Studio can explain the safe fallback without claiming that
 * the originally requested workspace opened.
 */
export function resolveStudioContextSelection({
  requested,
  organisations,
  channels,
  broadcasts,
}: {
  requested: RequestedStudioContext;
  organisations: Organisation[];
  channels: Channel[];
  broadcasts: Broadcast[];
}): StudioContextSelection {
  const requestedOrganisationId = requestedValue(requested.organisationId);
  const requestedChannelId = requestedValue(requested.channelId);
  const requestedBroadcastId = requestedValue(requested.broadcastId);
  const hasRequestedContext = Boolean(
    requestedOrganisationId || requestedChannelId || requestedBroadcastId,
  );

  const requestedOrganisation = organisations.find(
    (organisation) => organisation.id === requestedOrganisationId,
  );
  const organisation = requestedOrganisation ?? newestPersisted(organisations);

  if (!organisation) {
    return {
      organisationId: '',
      channelId: '',
      broadcastId: '',
      requestedContextPreserved: false,
      fallbackReason: hasRequestedContext ? 'organisation-unavailable' : null,
    };
  }

  const organisationChannels = channels.filter(
    (channel) =>
      channel.organisationId === organisation.id && channel.status === 'active',
  );
  const requestedChannel = organisationChannels.find(
    (channel) => channel.id === requestedChannelId,
  );
  const channel = requestedChannel ?? newestPersisted(organisationChannels);

  if (!channel) {
    return {
      organisationId: organisation.id,
      channelId: '',
      broadcastId: '',
      requestedContextPreserved: false,
      fallbackReason:
        requestedOrganisationId && !requestedOrganisation
          ? 'organisation-unavailable'
          : hasRequestedContext
            ? 'channel-unavailable'
            : null,
    };
  }

  const availableBroadcasts = broadcasts.filter(
    (broadcast) =>
      broadcast.organisationId === organisation.id &&
      broadcast.channelId === channel.id &&
      STUDIO_BROADCAST_STATES.has(broadcast.status),
  );
  const requestedBroadcast = availableBroadcasts.find(
    (broadcast) => broadcast.id === requestedBroadcastId,
  );
  const broadcast = requestedBroadcast ?? strongestBroadcast(availableBroadcasts);

  const requestedContextPreserved = Boolean(
    requestedOrganisation &&
      requestedChannel &&
      requestedBroadcast &&
      requestedOrganisation.id === organisation.id &&
      requestedChannel.id === channel.id &&
      requestedBroadcast.id === broadcast?.id,
  );

  let fallbackReason: StudioContextFallbackReason = null;
  if (hasRequestedContext && !requestedContextPreserved) {
    if (requestedOrganisationId && !requestedOrganisation) {
      fallbackReason = 'organisation-unavailable';
    } else if (requestedChannelId && !requestedChannel) {
      fallbackReason = 'channel-unavailable';
    } else if (requestedBroadcastId && !requestedBroadcast) {
      fallbackReason = 'broadcast-unavailable';
    }
  }

  return {
    organisationId: organisation.id,
    channelId: channel.id,
    broadcastId: broadcast?.id ?? '',
    requestedContextPreserved,
    fallbackReason,
  };
}

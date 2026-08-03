import type { Broadcast, Channel, Organisation } from '@digistream/contracts';

export type RequestedStudioContext = {
  organisationId?: string | null;
  channelId?: string | null;
  broadcastId?: string | null;
};

export type StudioContextSelection = {
  organisationId: string;
  channelId: string;
  broadcastId: string;
  requestedContextPreserved: boolean;
};

const STUDIO_BROADCAST_STATES: ReadonlySet<Broadcast['status']> = new Set([
  'draft',
  'scheduled',
  'starting',
  'live',
  'reconnecting',
]);

/**
 * Resolves an optional contextual Studio request against API-backed resources.
 *
 * Requested identifiers are treated only as hints. Every relationship is
 * re-verified from the loaded organisation, channel and broadcast resources.
 * Stale, unauthorized or private-not-found context therefore falls back to a
 * valid selectable resource instead of being trusted by the client.
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
  const requestedOrganisation = organisations.find(
    (organisation) => organisation.id === requested.organisationId,
  );
  const organisation = requestedOrganisation ?? organisations[0] ?? null;

  if (!organisation) {
    return {
      organisationId: '',
      channelId: '',
      broadcastId: '',
      requestedContextPreserved: false,
    };
  }

  const organisationChannels = channels.filter(
    (channel) => channel.organisationId === organisation.id,
  );
  const requestedChannel = organisationChannels.find(
    (channel) => channel.id === requested.channelId,
  );
  const channel = requestedChannel ?? organisationChannels[0] ?? null;

  if (!channel) {
    return {
      organisationId: organisation.id,
      channelId: '',
      broadcastId: '',
      requestedContextPreserved: false,
    };
  }

  const availableBroadcasts = broadcasts.filter(
    (broadcast) =>
      broadcast.organisationId === organisation.id &&
      broadcast.channelId === channel.id &&
      STUDIO_BROADCAST_STATES.has(broadcast.status),
  );
  const requestedBroadcast = availableBroadcasts.find(
    (broadcast) => broadcast.id === requested.broadcastId,
  );
  const broadcast = requestedBroadcast ?? availableBroadcasts[0] ?? null;

  const requestedContextPreserved = Boolean(
    requestedOrganisation &&
      requestedChannel &&
      requestedBroadcast &&
      requestedOrganisation.id === organisation.id &&
      requestedChannel.id === channel.id &&
      requestedBroadcast.id === broadcast?.id,
  );

  return {
    organisationId: organisation.id,
    channelId: channel.id,
    broadcastId: broadcast?.id ?? '',
    requestedContextPreserved,
  };
}

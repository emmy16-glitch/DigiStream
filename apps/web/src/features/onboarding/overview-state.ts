import type { Broadcast, Channel } from '@digistream/contracts';
import {
  creatorSetupState,
  type CreatorBroadcastSetupStatus,
  type CreatorChannelSetupStatus,
  type CreatorSetupState,
} from './creator-setup-state';

export type CreatorOverviewResources = {
  channels: Channel[];
  broadcasts: Broadcast[];
};

export type CreatorOverviewDerivation = {
  channelStatus: CreatorChannelSetupStatus;
  broadcastStatus: CreatorBroadcastSetupStatus;
  setupState: CreatorSetupState;
  selectedChannel: Channel | null;
  selectedBroadcast: Broadcast | null;
  canOpenStudio: boolean;
  canOpenBackstage: boolean;
};

const STUDIO_BROADCAST_STATES: readonly Broadcast['status'][] = [
  'draft',
  'scheduled',
  'starting',
  'live',
  'reconnecting',
  'ending',
];

// Keep this aligned with CreatorBackstageWorkspace's real selectable states.
// Draft broadcasts have no active backstage session yet, while an ending
// broadcast is already past the point where invitations or call-ins are safe.
const BACKSTAGE_BROADCAST_STATES: readonly Broadcast['status'][] = [
  'scheduled',
  'starting',
  'live',
  'reconnecting',
];

const BROADCAST_PRIORITY: readonly Broadcast['status'][] = [
  'live',
  'reconnecting',
  'ending',
  'starting',
  'scheduled',
  'draft',
  'completed',
  'cancelled',
  'failed',
];

function compareChannelRecency(left: Channel, right: Channel): number {
  const updatedComparison = right.updatedAt.localeCompare(left.updatedAt);
  if (updatedComparison !== 0) return updatedComparison;
  const createdComparison = right.createdAt.localeCompare(left.createdAt);
  if (createdComparison !== 0) return createdComparison;
  return left.id.localeCompare(right.id);
}

function selectChannel(channels: Channel[], status?: Channel['status']): Channel | null {
  const candidates = status
    ? channels.filter((channel) => channel.status === status)
    : channels;
  return [...candidates].sort(compareChannelRecency)[0] ?? null;
}

function deriveChannelStatus(channels: Channel[]): CreatorChannelSetupStatus {
  if (channels.length === 0) return 'none';
  if (channels.some((channel) => channel.status === 'active')) return 'active';
  if (channels.some((channel) => channel.status === 'pending_review')) {
    return 'pending_review';
  }
  return selectChannel(channels)?.status ?? 'none';
}

function compareBroadcastRecency(left: Broadcast, right: Broadcast): number {
  if (left.lifecycleVersion !== right.lifecycleVersion) {
    return right.lifecycleVersion - left.lifecycleVersion;
  }
  const updatedComparison = right.updatedAt.localeCompare(left.updatedAt);
  if (updatedComparison !== 0) return updatedComparison;
  const createdComparison = right.createdAt.localeCompare(left.createdAt);
  if (createdComparison !== 0) return createdComparison;
  return left.id.localeCompare(right.id);
}

function selectBroadcast(broadcasts: Broadcast[]): Broadcast | null {
  for (const status of BROADCAST_PRIORITY) {
    const matching = broadcasts
      .filter((broadcast) => broadcast.status === status)
      .sort(compareBroadcastRecency);
    if (matching[0]) return matching[0];
  }
  return [...broadcasts].sort(compareBroadcastRecency)[0] ?? null;
}

/**
 * Derives the creator Overview state and exact contextual resources from real
 * API-backed channel and broadcast data.
 *
 * Broadcasts belonging to missing, inactive or different-organisation channels
 * are deliberately not treated as actionable. This prevents an orphaned,
 * cross-tenant or stale response from opening Studio or Backstage with context
 * that the current workspace cannot safely operate. Existing creator surfaces
 * remain responsible for routing, resource re-verification and mutations.
 *
 * When multiple channels or broadcasts share the same lifecycle significance,
 * selection is deterministic and prefers the newest persisted resource. For
 * broadcasts, the highest lifecycle version remains authoritative before
 * persisted recency. The Overview therefore does not change its primary action
 * merely because an API response arrives in a different list order.
 */
export function creatorOverviewDerivation({
  channels,
  broadcasts,
}: CreatorOverviewResources): CreatorOverviewDerivation {
  const channelStatus = deriveChannelStatus(channels);
  const activeChannelsById = new Map(
    channels
      .filter((channel) => channel.status === 'active')
      .map((channel) => [channel.id, channel] as const),
  );
  const actionableBroadcasts = broadcasts.filter((broadcast) => {
    const channel = activeChannelsById.get(broadcast.channelId);
    return Boolean(channel && channel.organisationId === broadcast.organisationId);
  });
  const selectedBroadcast = selectBroadcast(actionableBroadcasts);
  const selectedChannel = selectedBroadcast
    ? activeChannelsById.get(selectedBroadcast.channelId) ?? null
    : selectChannel(channels, 'active') ?? selectChannel(channels);
  const broadcastStatus = (selectedBroadcast?.status ?? 'none') as CreatorBroadcastSetupStatus;
  const setupState = creatorSetupState({
    intentChosen: true,
    hasOrganisation: true,
    channelStatus,
    broadcastStatus,
  });

  return {
    channelStatus,
    broadcastStatus,
    setupState,
    selectedChannel,
    selectedBroadcast,
    canOpenStudio: Boolean(
      selectedBroadcast && STUDIO_BROADCAST_STATES.includes(selectedBroadcast.status),
    ),
    canOpenBackstage: Boolean(
      selectedBroadcast && BACKSTAGE_BROADCAST_STATES.includes(selectedBroadcast.status),
    ),
  };
}

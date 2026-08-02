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

function deriveChannelStatus(channels: Channel[]): CreatorChannelSetupStatus {
  if (channels.length === 0) return 'none';
  if (channels.some((channel) => channel.status === 'active')) return 'active';
  if (channels.some((channel) => channel.status === 'pending_review')) {
    return 'pending_review';
  }
  return channels[0]!.status;
}

function selectBroadcast(broadcasts: Broadcast[]): Broadcast | null {
  for (const status of BROADCAST_PRIORITY) {
    const found = broadcasts.find((broadcast) => broadcast.status === status);
    if (found) return found;
  }
  return broadcasts[0] ?? null;
}

/**
 * Derives the creator Overview state and exact contextual resources from real
 * API-backed channel and broadcast data.
 *
 * Broadcasts belonging to missing or inactive channels are deliberately not
 * treated as actionable. This prevents an orphaned/stale response from opening
 * Studio or Backstage with a context that the current workspace cannot safely
 * operate. Existing creator surfaces remain responsible for routing, resource
 * re-verification and mutations.
 */
export function creatorOverviewDerivation({
  channels,
  broadcasts,
}: CreatorOverviewResources): CreatorOverviewDerivation {
  const channelStatus = deriveChannelStatus(channels);
  const activeChannelIds = new Set(
    channels.filter((channel) => channel.status === 'active').map((channel) => channel.id),
  );
  const actionableBroadcasts = broadcasts.filter((broadcast) =>
    activeChannelIds.has(broadcast.channelId),
  );
  const selectedBroadcast = selectBroadcast(actionableBroadcasts);
  const selectedChannel = selectedBroadcast
    ? channels.find((channel) => channel.id === selectedBroadcast.channelId) ?? null
    : channels.find((channel) => channel.status === 'active') ?? channels[0] ?? null;
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

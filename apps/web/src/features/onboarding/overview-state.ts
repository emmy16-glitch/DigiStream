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
  canOpenStudio: boolean;
  canOpenBackstage: boolean;
};

/**
 * Broadcast states that represent a live-capable resource the creator can
 * operate on inside Broadcast Studio or Backstage.
 *
 * A broadcast in a final state (completed, cancelled, failed) is no longer an
 * operational resource and must not expose a dead Studio or Backstage action.
 */
const OPERATIONAL_BROADCAST_STATES: readonly Broadcast['status'][] = [
  'draft',
  'scheduled',
  'starting',
  'live',
  'reconnecting',
  'ending',
];

/**
 * Most-significant broadcast first, so the overview reflects the strongest
 * live/public state rather than an arbitrary list ordering.
 */
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

function deriveBroadcastStatus(broadcasts: Broadcast[]): CreatorBroadcastSetupStatus {
  if (broadcasts.length === 0) return 'none';
  for (const status of BROADCAST_PRIORITY) {
    const found = broadcasts.find((broadcast) => broadcast.status === status);
    if (found) return found.status as CreatorBroadcastSetupStatus;
  }
  return broadcasts[0]!.status as CreatorBroadcastSetupStatus;
}

/**
 * Derives the creator Overview state and the allowed next action from the real
 * API-backed organisation channel and broadcast resources.
 *
 * This module deliberately contains no routing, rendering or API mutation
 * logic. Existing creator surfaces consume the result so the Overview does not
 * become a second dashboard or duplicate organisation/channel/broadcast flow.
 */
export function creatorOverviewDerivation({
  channels,
  broadcasts,
}: CreatorOverviewResources): CreatorOverviewDerivation {
  const channelStatus = deriveChannelStatus(channels);
  const broadcastStatus = deriveBroadcastStatus(broadcasts);
  const setupState = creatorSetupState({
    intentChosen: true,
    hasOrganisation: true,
    channelStatus,
    broadcastStatus,
  });
  const hasActiveChannel = channelStatus === 'active';
  const canOpenStudio =
    hasActiveChannel &&
    broadcasts.some((broadcast) => OPERATIONAL_BROADCAST_STATES.includes(broadcast.status));
  const canOpenBackstage =
    hasActiveChannel &&
    broadcasts.some((broadcast) => OPERATIONAL_BROADCAST_STATES.includes(broadcast.status));
  return { channelStatus, broadcastStatus, setupState, canOpenStudio, canOpenBackstage };
}

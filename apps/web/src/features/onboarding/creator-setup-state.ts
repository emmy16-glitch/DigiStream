export type CreatorChannelSetupStatus =
  | 'none'
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'suspended'
  | 'archived';

export type CreatorBroadcastSetupStatus =
  | 'none'
  | 'draft'
  | 'scheduled'
  | 'starting'
  | 'live'
  | 'reconnecting'
  | 'ending'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type CreatorSetupState =
  | 'choose_intent'
  | 'create_organisation'
  | 'create_channel'
  | 'finish_channel_activation'
  | 'create_broadcast'
  | 'prepare_broadcast'
  | 'manage_live_broadcast'
  | 'view_completed_broadcast';

export type CreatorSetupSnapshot = {
  intentChosen: boolean;
  hasOrganisation: boolean;
  channelStatus: CreatorChannelSetupStatus;
  broadcastStatus: CreatorBroadcastSetupStatus;
};

/**
 * Derives the next valid creator action from persisted API-backed resource state.
 *
 * This module deliberately contains no routing, rendering or API mutation logic.
 * Existing creator surfaces consume the result so onboarding does not become a
 * second dashboard or duplicate organisation/channel/broadcast workflow.
 */
export function creatorSetupState({
  intentChosen,
  hasOrganisation,
  channelStatus,
  broadcastStatus,
}: CreatorSetupSnapshot): CreatorSetupState {
  if (!intentChosen) return 'choose_intent';
  if (!hasOrganisation) return 'create_organisation';
  if (channelStatus === 'none') return 'create_channel';
  if (channelStatus !== 'active') return 'finish_channel_activation';

  if (broadcastStatus === 'none') return 'create_broadcast';
  if (broadcastStatus === 'live' || broadcastStatus === 'reconnecting' || broadcastStatus === 'ending') {
    return 'manage_live_broadcast';
  }
  if (
    broadcastStatus === 'completed' ||
    broadcastStatus === 'cancelled' ||
    broadcastStatus === 'failed'
  ) {
    return 'view_completed_broadcast';
  }

  return 'prepare_broadcast';
}

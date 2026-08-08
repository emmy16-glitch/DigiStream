export type DatabaseHealth = {
  status: 'connected' | 'not-configured' | 'unavailable';
  latencyMs?: number;
};

export type ServiceHealth = {
  status: 'ok' | 'degraded';
  service: 'digistream-api';
  timestamp: string;
  uptimeSeconds: number;
  database: DatabaseHealth;
};

export type PlatformStatus = {
  product: 'DigiStream';
  stage:
    | 'foundation'
    | 'backend-data-foundation'
    | 'authentication-foundation'
    | 'profiles-capabilities'
    | 'organisation-tenancy'
    | 'organisation-memberships'
    | 'channel-foundation'
    | 'broadcast-lifecycle'
    | 'livekit-contribution-adapter'
    | 'ovenmediaengine-delivery-adapter'
    | 'livekit-ome-egress-bridge'
    | 'local-media-infrastructure'
    | 'creator-broadcast-client'
    | 'listener-playback-client'
    | 'guest-backstage-control'
    | 'realtime-auth-foundation'
    | 'durable-live-chat'
    | 'recording-retention'
    | 'public-replay-listening'
    | 'recording-orphan-reconciliation';
  responsiveTargets: readonly ['mobile', 'tablet', 'desktop'];
  capabilities: readonly string[];
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  status: 'active' | 'suspended' | 'deleted';
  emailVerifiedAt: string | null;
  createdAt: string;
};

export type AuthUserResponse = {
  user: AuthUser;
};

export type PlatformCapability = 'broadcaster' | 'platform_admin';

export type PublicProfile = {
  id: string;
  username: string;
  displayName: string;
  biography: string | null;
  isBroadcaster: boolean;
  joinedAt: string;
};

export type PublicProfileResponse = {
  profile: PublicProfile;
};

export type OwnProfile = {
  id: string;
  email: string;
  displayName: string;
  status: 'active' | 'suspended' | 'deleted';
  emailVerifiedAt: string | null;
  joinedAt: string;
  profile: {
    username: string;
    biography: string | null;
    isDiscoverable: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
  capabilities: PlatformCapability[];
};

export type OwnProfileResponse = {
  profile: OwnProfile;
};

export type CapabilityChangeResponse = {
  capability: {
    userId: string;
    capability: PlatformCapability;
    active: boolean;
  };
};

export type OrganisationRole =
  | 'owner'
  | 'admin'
  | 'broadcaster'
  | 'moderator'
  | 'analyst';

export type Organisation = {
  id: string;
  name: string;
  slug: string;
  role: OrganisationRole;
  isPersonalWorkspace: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrganisationResponse = {
  organisation: Organisation;
};

export type OrganisationListResponse = {
  organisations: Organisation[];
};

export type OrganisationMember = {
  userId: string;
  email: string;
  displayName: string;
  role: OrganisationRole;
  joinedAt: string;
};

export type OrganisationMemberListResponse = {
  members: OrganisationMember[];
};

export type OrganisationMemberResponse = {
  member: OrganisationMember;
};

export type OrganisationInvitation = {
  id: string;
  organisationId: string;
  email: string;
  role: Exclude<OrganisationRole, 'owner'>;
  invitedByUserId: string | null;
  expiresAt: string;
  createdAt: string;
};

export type CreatedOrganisationInvitation = OrganisationInvitation & {
  acceptanceToken: string;
};

export type OrganisationInvitationResponse = {
  invitation: CreatedOrganisationInvitation;
};

export type OrganisationInvitationListResponse = {
  invitations: OrganisationInvitation[];
};

export type AcceptedOrganisationMembershipResponse = {
  membership: {
    organisationId: string;
    organisationName: string;
    role: OrganisationRole;
    joinedAt: string;
  };
};

export type ChannelStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'suspended'
  | 'archived';

export type ChannelVisibility = 'public' | 'unlisted' | 'private';

export type Channel = {
  id: string;
  organisationId: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: ChannelVisibility;
  status: ChannelStatus;
  createdAt: string;
  updatedAt: string;
};

export type ChannelResponse = {
  channel: Channel;
};

export type ChannelListResponse = {
  channels: Channel[];
};

export type BroadcastStatus =
  | 'draft'
  | 'scheduled'
  | 'starting'
  | 'live'
  | 'reconnecting'
  | 'ending'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type Broadcast = {
  id: string;
  organisationId: string;
  channelId: string;
  title: string;
  description: string | null;
  status: BroadcastStatus;
  scheduledFor: string | null;
  liveStartedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BroadcastResponse = {
  broadcast: Broadcast;
};

export type BroadcastListResponse = {
  broadcasts: Broadcast[];
};

export type BroadcastContribution = {
  broadcastId: string;
  provider: 'livekit';
  status: 'ready' | 'unavailable';
  wsUrl: string | null;
  roomName: string | null;
  participantIdentity: string | null;
  participantName: string | null;
  token: string | null;
};

export type BroadcastContributionResponse = {
  contribution: BroadcastContribution;
};

export type BroadcastDelivery = {
  broadcastId: string;
  provider: 'ovenmediaengine';
  status: 'ready' | 'unavailable';
  webrtcUrl: string | null;
  hlsUrl: string | null;
};

export type BroadcastDeliveryResponse = {
  delivery: BroadcastDelivery;
};

export type BroadcastDeliveryControlResponse = {
  broadcast: Broadcast;
  delivery: BroadcastDelivery;
};

export type BroadcastChatMessage = {
  id: string;
  broadcastId: string;
  userId: string;
  displayName: string;
  body: string;
  createdAt: string;
};

export type BroadcastChatMessageListResponse = {
  messages: BroadcastChatMessage[];
};

export type BroadcastChatMessageResponse = {
  message: BroadcastChatMessage;
};

export type BroadcastCallInRequest = {
  id: string;
  broadcastId: string;
  requesterUserId: string;
  requesterDisplayName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt: string | null;
};

export type BroadcastCallInRequestResponse = {
  request: BroadcastCallInRequest;
};

export type BroadcastCallInRequestListResponse = {
  requests: BroadcastCallInRequest[];
};

export type BroadcastGuestInvitation = {
  id: string;
  broadcastId: string;
  inviteeUserId: string | null;
  displayName: string;
  status: 'pending' | 'admitted' | 'revoked' | 'expired';
  expiresAt: string;
  createdAt: string;
};

export type CreatedBroadcastGuestInvitation = BroadcastGuestInvitation & {
  token: string;
};

export type BroadcastGuestInvitationResponse = {
  invitation: CreatedBroadcastGuestInvitation;
};

export type BroadcastGuestInvitationListResponse = {
  invitations: BroadcastGuestInvitation[];
};

export type BroadcastGuestJoinResponse = {
  guest: {
    invitationId: string;
    broadcastId: string;
    displayName: string;
    status: 'pending' | 'admitted';
    wsUrl: string | null;
    roomName: string | null;
    participantIdentity: string | null;
    token: string | null;
  };
};

export type RecordingStatus =
  | 'recording'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'archived'
  | 'deleted';

export type Recording = {
  id: string;
  broadcastId: string;
  status: RecordingStatus;
  visibility: 'public' | 'unlisted' | 'private';
  storageKey: string | null;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
};

export type RecordingResponse = {
  recording: Recording;
};

export type RecordingListResponse = {
  recordings: Recording[];
};

export type PublicReplay = {
  recordingId: string;
  broadcastId: string;
  title: string;
  description: string | null;
  channelName: string;
  channelSlug: string;
  organisationName: string;
  organisationSlug: string;
  durationSeconds: number | null;
  publishedAt: string;
};

export type PublicReplayListResponse = {
  replays: PublicReplay[];
};

export type PublicReplayResponse = {
  replay: PublicReplay;
  playbackUrl: string;
};

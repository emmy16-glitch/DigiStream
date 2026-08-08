export type ServiceHealth = {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  database: {
    status: 'connected' | 'unavailable' | 'not-configured';
    latencyMs?: number;
  };
};

export type UserRole = 'listener' | 'broadcaster' | 'admin';

export type User = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
};

export type AuthResponse = {
  user: User;
};

export type PublicUserProfile = {
  id: string;
  username: string;
  displayName: string;
  biography: string | null;
  avatarUrl: string | null;
};

export type PublicUserProfileResponse = {
  profile: PublicUserProfile;
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

export type OrganisationInvitation = {
  id: string;
  organisationId: string;
  email: string;
  role: Exclude<OrganisationRole, 'owner'>;
  invitedByUserId: string;
  expiresAt: string;
  createdAt: string;
};

export type OrganisationInvitationResponse = {
  invitation: OrganisationInvitation;
};

export type OrganisationInvitationListResponse = {
  invitations: OrganisationInvitation[];
};

export type AcceptedOrganisationInvitation = {
  organisationId: string;
  organisationName: string;
  role: Exclude<OrganisationRole, 'owner'>;
  joinedAt: string;
};

export type AcceptedOrganisationInvitationResponse = {
  membership: AcceptedOrganisationInvitation;
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
  category: string | null;
  status: ChannelStatus;
  visibility: ChannelVisibility;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChannelResponse = {
  channel: Channel;
};

export type ChannelListResponse = {
  channels: Channel[];
};

export type PublicChannel = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  organisation: {
    id: string;
    name: string;
    slug: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type PublicChannelResponse = {
  channel: PublicChannel;
};

export type PublicChannelListResponse = {
  channels: PublicChannel[];
};

export type BroadcastState =
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
  createdByUserId: string;
  title: string;
  slug: string;
  description: string | null;
  status: BroadcastState;
  scheduledStartAt: string | null;
  startRequestedAt: string | null;
  liveStartedAt: string | null;
  endRequestedAt: string | null;
  endedAt: string | null;
  cancelledAt: string | null;
  contributionRoomName: string;
  deliveryStreamName: string;
  contributionReadyAt: string | null;
  deliveryReadyAt: string | null;
  failureReason: string | null;
  lifecycleVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type BroadcastResponse = {
  broadcast: Broadcast;
};

export type BroadcastListResponse = {
  broadcasts: Broadcast[];
};

export type PublicBroadcast = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: BroadcastState;
  scheduledStartAt: string | null;
  liveStartedAt: string | null;
  endedAt: string | null;
  organisation: {
    id: string;
    name: string;
    slug: string;
  };
  channel: {
    id: string;
    name: string;
    slug: string;
    category: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type PublicBroadcastResponse = {
  broadcast: PublicBroadcast;
};

export type PublicBroadcastListResponse = {
  broadcasts: PublicBroadcast[];
};

export type ReplayAccess = 'public' | 'unlisted' | 'member';

export type PublicReplay = {
  id: string;
  recordingId: string;
  organisationId: string;
  channelId: string;
  broadcastId: string;
  title: string;
  slug: string;
  description: string | null;
  endedAt: string | null;
  publishedAt: string | null;
  media: {
    format: string;
    contentType: string;
    sizeBytes: number;
    durationMs: number;
  };
  organisation: {
    id: string;
    name: string;
    slug: string;
  };
  channel: {
    id: string;
    name: string;
    slug: string;
    category: string | null;
    visibility: ChannelVisibility;
  };
  access: ReplayAccess;
  updatedAt: string;
};

export type PublicReplayResponse = {
  replay: PublicReplay;
};

export type PublicReplayListResponse = {
  replays: PublicReplay[];
};

export type RecordingPlaybackAccessResponse = {
  access: {
    mode: 'playback';
    url: string;
    expiresAt: string;
  };
};

export type BroadcastPlaybackSource = {
  protocol: 'webrtc' | 'llhls';
  url: string;
};

export type BroadcastPlayback = {
  provider: 'ovenmediaengine';
  expiresAt: string;
  sources: BroadcastPlaybackSource[];
};

export type BroadcastPlaybackResponse = {
  playback: BroadcastPlayback;
};

export type GuestInvitationStatus =
  | 'pending'
  | 'accepted'
  | 'admitted'
  | 'revoked';

export type BroadcastGuestInvitation = {
  id: string;
  organisationId: string;
  broadcastId: string;
  invitedEmail: string | null;
  displayName: string | null;
  status: GuestInvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  admittedAt: string | null;
  revokedAt: string | null;
  sessionExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatedBroadcastGuestInvitation = BroadcastGuestInvitation & {
  acceptanceToken: string;
};

export type GuestSession = {
  invitationId: string;
  organisationId: string;
  broadcastId: string;
  displayName: string;
  admitted: boolean;
  expiresAt: string;
  sessionToken: string;
};

export type BackstageParticipant = {
  identity: string;
  name: string;
  role: 'host' | 'guest' | 'monitor' | 'unknown';
  connected: boolean;
  publishing: boolean;
  tracks: Array<{
    sid: string;
    source: string;
    muted: boolean;
  }>;
};

export type CallInStatus = 'pending' | 'approved' | 'rejected';

export type BroadcastCallInRequest = {
  id: string;
  organisationId: string;
  broadcastId: string;
  displayName: string;
  contactEmail: string | null;
  message: string | null;
  status: CallInStatus;
  invitationId: string | null;
  decidedByUserId: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BroadcastChatMessage = {
  id: string;
  organisationId: string;
  broadcastId: string;
  clientMessageId: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
  };
};

export type BroadcastChatModerationState = {
  chatDisabled: boolean;
  slowModeSeconds: number;
  mutedUntil: string | null;
  blocked: boolean;
};

export type BroadcastChatHistoryResponse = {
  messages: BroadcastChatMessage[];
  chat: {
    broadcastId: string;
    status: BroadcastState;
    canSend: boolean;
    moderation: BroadcastChatModerationState;
  };
  pageInfo: {
    hasMore: boolean;
    nextCursor: string | null;
  };
};

export type BroadcastChatMessageResponse = {
  message: BroadcastChatMessage;
  replayed: boolean;
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
};

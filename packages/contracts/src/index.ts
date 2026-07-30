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
    | 'channel-foundation';
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

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
};

export type BroadcastState =
  | 'draft'
  | 'scheduled'
  | 'preparing'
  | 'live'
  | 'reconnecting'
  | 'ended'
  | 'processing'
  | 'published'
  | 'failed';

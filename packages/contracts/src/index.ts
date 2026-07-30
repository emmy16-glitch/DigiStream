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
    | 'profiles-capabilities';
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

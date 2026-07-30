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
    | 'authentication-foundation';
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

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
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

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
  stage: 'foundation' | 'backend-data-foundation';
  responsiveTargets: readonly ['mobile', 'tablet', 'desktop'];
  capabilities: readonly string[];
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

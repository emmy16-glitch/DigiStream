export type ServiceHealth = {
  status: 'ok';
  service: 'digistream-api';
  timestamp: string;
  uptimeSeconds: number;
};

export type PlatformStatus = {
  product: 'DigiStream';
  stage: 'foundation';
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

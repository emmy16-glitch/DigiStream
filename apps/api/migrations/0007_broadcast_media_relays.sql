CREATE TYPE media_relay_protocol AS ENUM ('rtmp', 'srt');
CREATE TYPE media_relay_status AS ENUM (
  'starting',
  'active',
  'stopping',
  'stopped',
  'failed'
);

CREATE TABLE broadcast_media_relays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL UNIQUE REFERENCES broadcasts(id) ON DELETE CASCADE,
  provider varchar(40) NOT NULL DEFAULT 'livekit_egress',
  external_id varchar(160) UNIQUE,
  protocol media_relay_protocol NOT NULL,
  status media_relay_status NOT NULL DEFAULT 'starting',
  target_host varchar(255) NOT NULL,
  started_at timestamptz,
  stopped_at timestamptz,
  last_checked_at timestamptz,
  failure_reason varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT broadcast_media_relays_provider_check
    CHECK (provider = 'livekit_egress')
);

CREATE INDEX broadcast_media_relays_status_idx
  ON broadcast_media_relays(status, updated_at);
CREATE INDEX broadcast_media_relays_external_id_idx
  ON broadcast_media_relays(external_id)
  WHERE external_id IS NOT NULL;

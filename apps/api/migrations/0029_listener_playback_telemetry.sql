CREATE TABLE listener_playback_sessions (
  id uuid PRIMARY KEY,
  broadcast_id uuid NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  token_hash char(64) NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  last_heartbeat_at timestamptz,
  ended_at timestamptz,
  last_protocol varchar(16),
  active_seconds integer NOT NULL DEFAULT 0 CHECK (active_seconds >= 0),
  buffering_events integer NOT NULL DEFAULT 0 CHECK (buffering_events >= 0),
  fallback_events integer NOT NULL DEFAULT 0 CHECK (fallback_events >= 0),
  media_errors integer NOT NULL DEFAULT 0 CHECK (media_errors >= 0),
  last_event_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listener_playback_protocol_check
    CHECK (last_protocol IS NULL OR last_protocol IN ('webrtc', 'llhls'))
);

CREATE UNIQUE INDEX listener_playback_sessions_token_hash_idx
  ON listener_playback_sessions (token_hash);

CREATE INDEX listener_playback_sessions_broadcast_started_idx
  ON listener_playback_sessions (broadcast_id, started_at DESC, id DESC)
  WHERE started_at IS NOT NULL;

CREATE INDEX listener_playback_sessions_active_idx
  ON listener_playback_sessions (broadcast_id, last_heartbeat_at DESC)
  WHERE ended_at IS NULL AND started_at IS NOT NULL;

CREATE INDEX listener_playback_sessions_issued_at_idx
  ON listener_playback_sessions (issued_at);

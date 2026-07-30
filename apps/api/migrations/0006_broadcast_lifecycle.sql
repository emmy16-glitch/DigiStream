ALTER TYPE broadcast_status RENAME TO broadcast_status_legacy;

CREATE TYPE broadcast_status AS ENUM (
  'draft',
  'scheduled',
  'starting',
  'live',
  'reconnecting',
  'ending',
  'completed',
  'cancelled',
  'failed'
);

ALTER TABLE broadcasts
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE broadcasts
  ALTER COLUMN status TYPE broadcast_status
  USING (
    CASE status::text
      WHEN 'ended' THEN 'completed'
      ELSE status::text
    END
  )::broadcast_status;

ALTER TABLE broadcasts
  ALTER COLUMN status SET DEFAULT 'draft';

DROP TYPE broadcast_status_legacy;

ALTER TABLE broadcasts
  ADD COLUMN lifecycle_version integer NOT NULL DEFAULT 0,
  ADD COLUMN start_requested_at timestamptz,
  ADD COLUMN end_requested_at timestamptz,
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN contribution_room_name varchar(160),
  ADD COLUMN delivery_stream_name varchar(160),
  ADD COLUMN contribution_ready_at timestamptz,
  ADD COLUMN delivery_ready_at timestamptz,
  ADD COLUMN failure_reason varchar(500);

UPDATE broadcasts
SET
  contribution_room_name = 'broadcast-' || replace(id::text, '-', ''),
  delivery_stream_name = 'broadcast-' || replace(id::text, '-', '')
WHERE contribution_room_name IS NULL OR delivery_stream_name IS NULL;

ALTER TABLE broadcasts
  ALTER COLUMN contribution_room_name SET NOT NULL,
  ALTER COLUMN delivery_stream_name SET NOT NULL;

CREATE UNIQUE INDEX broadcasts_contribution_room_unique
  ON broadcasts (contribution_room_name);

CREATE UNIQUE INDEX broadcasts_delivery_stream_unique
  ON broadcasts (delivery_stream_name);

CREATE INDEX broadcasts_public_schedule_idx
  ON broadcasts (status, scheduled_start_at, created_at DESC);

CREATE TABLE broadcast_lifecycle_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  command varchar(40) NOT NULL,
  idempotency_key varchar(128) NOT NULL,
  request_hash varchar(64) NOT NULL,
  result_status broadcast_status NOT NULL,
  result_version integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX broadcast_lifecycle_commands_broadcast_key_unique
  ON broadcast_lifecycle_commands (broadcast_id, idempotency_key);

CREATE INDEX broadcast_lifecycle_commands_broadcast_created_idx
  ON broadcast_lifecycle_commands (broadcast_id, created_at DESC);

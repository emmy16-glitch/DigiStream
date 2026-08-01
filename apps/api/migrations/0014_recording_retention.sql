CREATE TABLE recording_retention_controls (
  recording_id uuid PRIMARY KEY REFERENCES recordings(id) ON DELETE CASCADE,
  retention_until timestamptz,
  deletion_requested_at timestamptz,
  purge_after timestamptz,
  legal_hold_at timestamptz,
  legal_hold_reason varchar(500),
  moderation_hold_at timestamptz,
  moderation_hold_reason varchar(500),
  purge_started_at timestamptz,
  purged_at timestamptz,
  purge_result varchar(32),
  purge_attempt_count integer NOT NULL DEFAULT 0,
  last_purge_error varchar(1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recording_retention_purge_schedule_consistency CHECK (
    (deletion_requested_at IS NULL AND purge_after IS NULL)
    OR (deletion_requested_at IS NOT NULL AND purge_after IS NOT NULL)
  ),
  CONSTRAINT recording_retention_legal_hold_consistency CHECK (
    (legal_hold_at IS NULL AND legal_hold_reason IS NULL)
    OR (legal_hold_at IS NOT NULL AND legal_hold_reason IS NOT NULL)
  ),
  CONSTRAINT recording_retention_moderation_hold_consistency CHECK (
    (moderation_hold_at IS NULL AND moderation_hold_reason IS NULL)
    OR (moderation_hold_at IS NOT NULL AND moderation_hold_reason IS NOT NULL)
  ),
  CONSTRAINT recording_retention_purge_result_check CHECK (
    purge_result IS NULL OR purge_result IN ('deleted', 'missing')
  ),
  CONSTRAINT recording_retention_purge_attempt_non_negative CHECK (
    purge_attempt_count >= 0
  )
);

CREATE INDEX recording_retention_due_purge_idx
  ON recording_retention_controls (purge_after, recording_id)
  WHERE deletion_requested_at IS NOT NULL
    AND purged_at IS NULL
    AND legal_hold_at IS NULL
    AND moderation_hold_at IS NULL;

CREATE INDEX recording_retention_hold_idx
  ON recording_retention_controls (recording_id)
  WHERE legal_hold_at IS NOT NULL OR moderation_hold_at IS NOT NULL;

CREATE OR REPLACE FUNCTION create_recording_retention_control()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO recording_retention_controls (recording_id)
  VALUES (NEW.id)
  ON CONFLICT (recording_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER recordings_create_retention_control
AFTER INSERT ON recordings
FOR EACH ROW
EXECUTE FUNCTION create_recording_retention_control();

INSERT INTO recording_retention_controls (recording_id)
SELECT recordings.id
FROM recordings
ON CONFLICT (recording_id) DO NOTHING;

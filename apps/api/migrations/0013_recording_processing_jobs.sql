CREATE TYPE recording_processing_job_state AS ENUM (
  'pending',
  'leased',
  'completed',
  'dead'
);

CREATE TABLE recording_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id uuid NOT NULL UNIQUE REFERENCES recordings(id) ON DELETE CASCADE,
  state recording_processing_job_state NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_owner varchar(100),
  lease_token_hash varchar(64),
  lease_expires_at timestamptz,
  last_heartbeat_at timestamptz,
  last_failure_code varchar(100),
  last_failure_message varchar(1000),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recording_processing_jobs_attempt_non_negative
    CHECK (attempt_count >= 0),
  CONSTRAINT recording_processing_jobs_max_attempts_positive
    CHECK (max_attempts BETWEEN 1 AND 20),
  CONSTRAINT recording_processing_jobs_lease_consistency CHECK (
    (
      state = 'leased'
      AND lease_owner IS NOT NULL
      AND lease_token_hash IS NOT NULL
      AND lease_expires_at IS NOT NULL
    )
    OR (
      state <> 'leased'
      AND lease_owner IS NULL
      AND lease_token_hash IS NULL
      AND lease_expires_at IS NULL
    )
  ),
  CONSTRAINT recording_processing_jobs_token_hash_check CHECK (
    lease_token_hash IS NULL OR lease_token_hash ~ '^[0-9a-f]{64}$'
  )
);

CREATE INDEX recording_processing_jobs_claim_idx
  ON recording_processing_jobs (state, next_attempt_at, created_at, id);

CREATE INDEX recording_processing_jobs_lease_expiry_idx
  ON recording_processing_jobs (lease_expires_at, id)
  WHERE state = 'leased';

CREATE OR REPLACE FUNCTION enqueue_recording_processing_job()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO recording_processing_jobs (recording_id)
  VALUES (NEW.id)
  ON CONFLICT (recording_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER recordings_enqueue_processing_job
AFTER INSERT ON recordings
FOR EACH ROW
EXECUTE FUNCTION enqueue_recording_processing_job();

INSERT INTO recording_processing_jobs (
  recording_id,
  state,
  attempt_count,
  next_attempt_at,
  completed_at
)
SELECT
  recordings.id,
  CASE
    WHEN recordings.status IN ('ready', 'published', 'private', 'archived', 'deleted')
      THEN 'completed'::recording_processing_job_state
    ELSE 'pending'::recording_processing_job_state
  END,
  recordings.retry_count,
  now(),
  CASE
    WHEN recordings.status IN ('ready', 'published', 'private', 'archived', 'deleted')
      THEN COALESCE(recordings.ready_at, recordings.updated_at)
    ELSE NULL
  END
FROM recordings
ON CONFLICT (recording_id) DO NOTHING;

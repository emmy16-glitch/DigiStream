CREATE TABLE recording_orphan_quarantine (
  original_key text PRIMARY KEY,
  quarantine_key text NOT NULL UNIQUE,
  status varchar(32) NOT NULL DEFAULT 'detected',
  size_bytes bigint NOT NULL,
  source_etag text,
  source_last_modified timestamptz,
  detected_at timestamptz NOT NULL DEFAULT now(),
  quarantined_at timestamptz,
  cleanup_after timestamptz NOT NULL,
  resolved_at timestamptz,
  resolution varchar(32),
  attempt_count integer NOT NULL DEFAULT 0,
  last_error varchar(1000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recording_orphan_status_check CHECK (
    status IN (
      'detected',
      'quarantining',
      'quarantined',
      'cleaning',
      'failed',
      'resolved'
    )
  ),
  CONSTRAINT recording_orphan_resolution_check CHECK (
    resolution IS NULL OR resolution IN ('deleted', 'restored', 'missing', 'recorded')
  ),
  CONSTRAINT recording_orphan_size_non_negative CHECK (size_bytes >= 0),
  CONSTRAINT recording_orphan_attempt_non_negative CHECK (attempt_count >= 0),
  CONSTRAINT recording_orphan_resolution_consistency CHECK (
    (status = 'resolved' AND resolved_at IS NOT NULL AND resolution IS NOT NULL)
    OR (status <> 'resolved' AND resolved_at IS NULL AND resolution IS NULL)
  )
);

CREATE INDEX recording_orphan_cleanup_due_idx
  ON recording_orphan_quarantine (cleanup_after, original_key)
  WHERE status IN ('quarantined', 'failed') AND quarantined_at IS NOT NULL;

CREATE INDEX recording_orphan_unresolved_idx
  ON recording_orphan_quarantine (status, updated_at, original_key)
  WHERE status <> 'resolved';

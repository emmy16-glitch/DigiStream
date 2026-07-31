CREATE TYPE recording_status AS ENUM (
  'recording',
  'uploading',
  'processing',
  'ready',
  'failed',
  'published',
  'private',
  'archived',
  'deleted'
);

CREATE TABLE recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  broadcast_id uuid NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  requested_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status recording_status NOT NULL DEFAULT 'recording',
  storage_key varchar(512) NOT NULL,
  provider varchar(80) NOT NULL DEFAULT 'media-worker',
  provider_artifact_id varchar(255),
  media_format varchar(32),
  content_type varchar(100),
  size_bytes bigint,
  duration_ms bigint,
  checksum_sha256 varchar(64),
  processing_error varchar(1000),
  retry_count integer NOT NULL DEFAULT 0,
  captured_at timestamptz,
  upload_started_at timestamptz,
  processing_started_at timestamptz,
  ready_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recordings_size_non_negative CHECK (size_bytes IS NULL OR size_bytes >= 0),
  CONSTRAINT recordings_duration_non_negative CHECK (duration_ms IS NULL OR duration_ms >= 0),
  CONSTRAINT recordings_retry_non_negative CHECK (retry_count >= 0),
  CONSTRAINT recordings_checksum_sha256_check CHECK (
    checksum_sha256 IS NULL OR checksum_sha256 ~ '^[0-9a-f]{64}$'
  )
);

CREATE UNIQUE INDEX recordings_broadcast_unique
  ON recordings (broadcast_id);

CREATE UNIQUE INDEX recordings_storage_key_unique
  ON recordings (storage_key);

CREATE UNIQUE INDEX recordings_provider_artifact_unique
  ON recordings (provider, provider_artifact_id)
  WHERE provider_artifact_id IS NOT NULL;

CREATE INDEX recordings_organisation_status_updated_idx
  ON recordings (organisation_id, status, updated_at DESC, id DESC);

CREATE INDEX recordings_channel_updated_idx
  ON recordings (channel_id, updated_at DESC, id DESC);

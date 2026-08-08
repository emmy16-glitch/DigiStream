ALTER TABLE channels
  ADD COLUMN moderated_at timestamptz,
  ADD COLUMN moderated_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN moderation_reason varchar(500),
  ADD COLUMN deleted_at timestamptz,
  ADD COLUMN retention_until timestamptz;

CREATE INDEX channels_retention_cleanup_idx
  ON channels (retention_until, id)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX channels_visible_public_idx
  ON channels (status, visibility, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;

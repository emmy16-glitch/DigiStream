CREATE TYPE channel_status AS ENUM (
  'draft',
  'pending_review',
  'active',
  'suspended',
  'archived'
);

CREATE TYPE channel_visibility AS ENUM (
  'public',
  'unlisted',
  'private'
);

ALTER TABLE channels
  ADD COLUMN status channel_status NOT NULL DEFAULT 'draft',
  ADD COLUMN visibility channel_visibility NOT NULL DEFAULT 'public',
  ADD COLUMN category varchar(40),
  ADD COLUMN created_by_user_id uuid REFERENCES users(id) ON DELETE RESTRICT;

UPDATE channels
SET visibility = CASE WHEN is_public THEN 'public'::channel_visibility ELSE 'private'::channel_visibility END;

ALTER TABLE channels
  DROP COLUMN is_public;

ALTER TABLE channels
  ADD CONSTRAINT channels_slug_normalized_check
    CHECK (slug = lower(btrim(slug)) AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  ADD CONSTRAINT channels_category_normalized_check
    CHECK (category IS NULL OR (category = lower(btrim(category)) AND category ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'));

CREATE INDEX channels_public_discovery_idx
  ON channels (status, visibility, category, created_at DESC)
  WHERE status = 'active' AND visibility = 'public';

CREATE INDEX channels_organisation_status_idx
  ON channels (organisation_id, status, created_at DESC);

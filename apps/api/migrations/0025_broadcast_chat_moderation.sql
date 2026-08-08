CREATE TABLE broadcast_chat_settings (
  broadcast_id uuid PRIMARY KEY REFERENCES broadcasts(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  chat_disabled boolean NOT NULL DEFAULT false,
  slow_mode_seconds integer NOT NULL DEFAULT 0,
  updated_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT broadcast_chat_settings_slow_mode_check
    CHECK (slow_mode_seconds BETWEEN 0 AND 300)
);

CREATE INDEX broadcast_chat_settings_organisation_idx
  ON broadcast_chat_settings (organisation_id, updated_at DESC);

CREATE TABLE broadcast_chat_user_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  broadcast_id uuid NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muted_until timestamptz,
  blocked_at timestamptz,
  reason varchar(500),
  updated_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX broadcast_chat_user_restrictions_broadcast_user_unique
  ON broadcast_chat_user_restrictions (broadcast_id, user_id);

CREATE INDEX broadcast_chat_user_restrictions_organisation_idx
  ON broadcast_chat_user_restrictions (organisation_id, updated_at DESC);

CREATE TABLE broadcast_chat_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  broadcast_id uuid NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES broadcast_chat_messages(id) ON DELETE CASCADE,
  reporter_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason varchar(500) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT broadcast_chat_reports_reason_length_check
    CHECK (char_length(reason) BETWEEN 1 AND 500)
);

CREATE UNIQUE INDEX broadcast_chat_reports_message_reporter_unique
  ON broadcast_chat_reports (message_id, reporter_user_id);

CREATE INDEX broadcast_chat_reports_broadcast_created_idx
  ON broadcast_chat_reports (broadcast_id, created_at DESC, id DESC);

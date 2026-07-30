ALTER TABLE users
  ADD CONSTRAINT users_email_normalized_check
  CHECK (email = lower(btrim(email)));

CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash varchar(64) NOT NULL,
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  user_agent varchar(500),
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_sessions_expiry_after_creation_check
    CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX auth_sessions_token_hash_unique
  ON auth_sessions (token_hash);
CREATE INDEX auth_sessions_user_id_idx
  ON auth_sessions (user_id);
CREATE INDEX auth_sessions_active_expiry_idx
  ON auth_sessions (expires_at)
  WHERE revoked_at IS NULL;

CREATE TYPE auth_account_token_purpose AS ENUM (
  'email_verification',
  'password_reset'
);

CREATE TABLE auth_account_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose auth_account_token_purpose NOT NULL,
  token_hash varchar(64) NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_account_tokens_token_hash_unique UNIQUE (token_hash)
);

CREATE INDEX auth_account_tokens_user_purpose_idx
  ON auth_account_tokens(user_id, purpose, created_at DESC);

CREATE INDEX auth_account_tokens_active_expiry_idx
  ON auth_account_tokens(purpose, expires_at)
  WHERE consumed_at IS NULL;

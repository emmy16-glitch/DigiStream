CREATE TYPE auth_login_attempt_outcome AS ENUM (
  'success',
  'invalid_credentials',
  'account_unavailable',
  'rate_limited'
);

CREATE TABLE auth_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash varchar(64) NOT NULL,
  ip_hash varchar(64) NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  outcome auth_login_attempt_outcome NOT NULL,
  request_id varchar(120),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_login_attempts_email_recent_idx
  ON auth_login_attempts (email_hash, created_at DESC);
CREATE INDEX auth_login_attempts_ip_recent_idx
  ON auth_login_attempts (ip_hash, created_at DESC);
CREATE INDEX auth_login_attempts_user_recent_idx
  ON auth_login_attempts (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

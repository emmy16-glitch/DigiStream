CREATE TABLE auth_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash varchar(64),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ip_address inet,
  user_agent varchar(500),
  outcome varchar(32) NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_login_attempts_outcome_check
    CHECK (outcome IN ('success', 'invalid_credentials', 'validation_error', 'rate_limited', 'account_unavailable'))
);

CREATE INDEX auth_login_attempts_email_time_idx
  ON auth_login_attempts (email_hash, occurred_at DESC)
  WHERE email_hash IS NOT NULL;

CREATE INDEX auth_login_attempts_ip_time_idx
  ON auth_login_attempts (ip_address, occurred_at DESC)
  WHERE ip_address IS NOT NULL;

CREATE INDEX auth_login_attempts_user_time_idx
  ON auth_login_attempts (user_id, occurred_at DESC)
  WHERE user_id IS NOT NULL;

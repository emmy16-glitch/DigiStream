CREATE TABLE organisation_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  email varchar(320) NOT NULL,
  role membership_role NOT NULL,
  token_hash varchar(64) NOT NULL,
  invited_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organisation_invitations_email_normalized_check
    CHECK (email = lower(btrim(email))),
  CONSTRAINT organisation_invitations_role_check
    CHECK (role <> 'owner'),
  CONSTRAINT organisation_invitations_expiry_check
    CHECK (expires_at > created_at),
  CONSTRAINT organisation_invitations_terminal_state_check
    CHECK (NOT (accepted_at IS NOT NULL AND revoked_at IS NOT NULL))
);

CREATE UNIQUE INDEX organisation_invitations_token_hash_unique
  ON organisation_invitations (token_hash);
CREATE UNIQUE INDEX organisation_invitations_pending_org_email_unique
  ON organisation_invitations (organisation_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX organisation_invitations_organisation_idx
  ON organisation_invitations (organisation_id, created_at DESC);
CREATE INDEX organisation_invitations_pending_expiry_idx
  ON organisation_invitations (expires_at)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

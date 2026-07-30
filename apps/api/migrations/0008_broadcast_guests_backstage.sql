CREATE TABLE broadcast_guest_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  broadcast_id uuid NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  invited_email varchar(320),
  display_name varchar(80),
  token_hash varchar(64) NOT NULL UNIQUE,
  status varchar(20) NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  admitted_at timestamptz,
  revoked_at timestamptz,
  session_token_hash varchar(64) UNIQUE,
  session_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT broadcast_guest_invitations_status_check
    CHECK (status IN ('pending', 'accepted', 'admitted', 'revoked')),
  CONSTRAINT broadcast_guest_invitations_acceptance_check
    CHECK ((accepted_at IS NULL) = (session_token_hash IS NULL)),
  CONSTRAINT broadcast_guest_invitations_session_expiry_check
    CHECK ((session_token_hash IS NULL) = (session_expires_at IS NULL))
);

CREATE INDEX broadcast_guest_invitations_broadcast_status_idx
  ON broadcast_guest_invitations (broadcast_id, status, created_at DESC);
CREATE INDEX broadcast_guest_invitations_session_lookup_idx
  ON broadcast_guest_invitations (session_token_hash, session_expires_at)
  WHERE session_token_hash IS NOT NULL;

CREATE TABLE broadcast_call_in_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  broadcast_id uuid NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  display_name varchar(80) NOT NULL,
  contact_email varchar(320),
  message varchar(500),
  status varchar(20) NOT NULL DEFAULT 'pending',
  invitation_id uuid REFERENCES broadcast_guest_invitations(id) ON DELETE SET NULL,
  decided_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT broadcast_call_in_requests_status_check
    CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX broadcast_call_in_requests_broadcast_status_idx
  ON broadcast_call_in_requests (broadcast_id, status, created_at ASC);

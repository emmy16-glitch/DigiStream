ALTER TABLE broadcast_call_in_requests
  ADD COLUMN requester_hash varchar(64),
  ADD COLUMN status_token_hash varchar(64),
  ADD COLUMN status_token_expires_at timestamptz;

CREATE UNIQUE INDEX broadcast_call_in_requests_status_token_unique
  ON broadcast_call_in_requests (status_token_hash)
  WHERE status_token_hash IS NOT NULL;

CREATE UNIQUE INDEX broadcast_call_in_requests_pending_requester_unique
  ON broadcast_call_in_requests (broadcast_id, requester_hash)
  WHERE requester_hash IS NOT NULL AND status = 'pending';

CREATE INDEX broadcast_call_in_requests_rate_limit_idx
  ON broadcast_call_in_requests (broadcast_id, requester_hash, created_at DESC)
  WHERE requester_hash IS NOT NULL;

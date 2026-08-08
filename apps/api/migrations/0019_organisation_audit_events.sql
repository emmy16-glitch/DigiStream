CREATE TABLE organisation_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action varchar(60) NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX organisation_audit_events_org_created_idx
  ON organisation_audit_events (organisation_id, created_at DESC, id DESC);

CREATE INDEX organisation_audit_events_actor_idx
  ON organisation_audit_events (actor_user_id, created_at DESC)
  WHERE actor_user_id IS NOT NULL;

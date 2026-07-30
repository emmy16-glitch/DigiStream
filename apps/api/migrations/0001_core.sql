CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE membership_role AS ENUM ('owner', 'admin', 'broadcaster', 'moderator', 'analyst');
CREATE TYPE broadcast_status AS ENUM ('draft', 'scheduled', 'live', 'ended', 'cancelled');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(320) NOT NULL,
  display_name varchar(100) NOT NULL,
  password_hash text NOT NULL,
  status user_status NOT NULL DEFAULT 'active',
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_unique ON users (email);

CREATE TABLE organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  slug varchar(80) NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX organisations_slug_unique ON organisations (slug);
CREATE INDEX organisations_created_by_user_idx ON organisations (created_by_user_id);

CREATE TABLE organisation_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role membership_role NOT NULL,
  invited_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX organisation_memberships_org_user_unique
  ON organisation_memberships (organisation_id, user_id);
CREATE INDEX organisation_memberships_user_idx
  ON organisation_memberships (user_id);
CREATE INDEX organisation_memberships_org_role_idx
  ON organisation_memberships (organisation_id, role);

CREATE TABLE channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  slug varchar(80) NOT NULL,
  description text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX channels_org_slug_unique ON channels (organisation_id, slug);
CREATE INDEX channels_organisation_idx ON channels (organisation_id);

CREATE TABLE broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title varchar(160) NOT NULL,
  slug varchar(100) NOT NULL,
  description text,
  status broadcast_status NOT NULL DEFAULT 'draft',
  scheduled_start_at timestamptz,
  live_started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX broadcasts_channel_slug_unique ON broadcasts (channel_id, slug);
CREATE INDEX broadcasts_organisation_status_idx ON broadcasts (organisation_id, status);
CREATE INDEX broadcasts_channel_scheduled_idx ON broadcasts (channel_id, scheduled_start_at);

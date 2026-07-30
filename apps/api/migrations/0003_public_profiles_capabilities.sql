CREATE TYPE platform_capability AS ENUM (
  'broadcaster',
  'platform_admin'
);

CREATE TABLE user_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username varchar(30) NOT NULL,
  biography varchar(500),
  is_discoverable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_profiles_username_normalized_check
    CHECK (username = lower(btrim(username))),
  CONSTRAINT user_profiles_username_format_check
    CHECK (username ~ '^[a-z0-9_]{3,30}$'),
  CONSTRAINT user_profiles_biography_length_check
    CHECK (biography IS NULL OR char_length(biography) <= 500)
);

CREATE UNIQUE INDEX user_profiles_username_unique
  ON user_profiles (username);
CREATE INDEX user_profiles_discoverable_username_idx
  ON user_profiles (username)
  WHERE is_discoverable = true;

CREATE TABLE user_platform_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  capability platform_capability NOT NULL,
  granted_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT user_platform_capabilities_revoke_after_grant_check
    CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);

CREATE UNIQUE INDEX user_platform_capabilities_user_capability_unique
  ON user_platform_capabilities (user_id, capability);
CREATE INDEX user_platform_capabilities_active_idx
  ON user_platform_capabilities (capability, user_id)
  WHERE revoked_at IS NULL;

CREATE TABLE profile_avatars (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  storage_key text NOT NULL UNIQUE,
  content_type varchar(64) NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 2097152),
  checksum_sha256 varchar(64) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profile_avatars_updated_at_idx ON profile_avatars(updated_at);

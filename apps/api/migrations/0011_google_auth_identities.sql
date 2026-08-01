CREATE TABLE auth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider varchar(40) NOT NULL,
  provider_subject varchar(255) NOT NULL,
  provider_email varchar(320),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_identities_provider_subject_unique
    UNIQUE (provider, provider_subject)
);

CREATE INDEX auth_identities_user_id_idx
  ON auth_identities (user_id);

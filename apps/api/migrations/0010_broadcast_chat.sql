CREATE TABLE broadcast_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  broadcast_id uuid NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  author_display_name varchar(100) NOT NULL,
  client_message_id uuid NOT NULL,
  body varchar(1000) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT broadcast_chat_messages_body_length_check
    CHECK (char_length(body) BETWEEN 1 AND 1000)
);

CREATE UNIQUE INDEX broadcast_chat_messages_author_client_unique
  ON broadcast_chat_messages (broadcast_id, author_user_id, client_message_id);

CREATE INDEX broadcast_chat_messages_broadcast_created_idx
  ON broadcast_chat_messages (broadcast_id, created_at DESC, id DESC);

CREATE INDEX broadcast_chat_messages_organisation_created_idx
  ON broadcast_chat_messages (organisation_id, created_at DESC);

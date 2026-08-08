CREATE TABLE saved_broadcasts (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broadcast_id uuid NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, broadcast_id)
);

CREATE INDEX saved_broadcasts_user_recent_idx
  ON saved_broadcasts (user_id, saved_at DESC, broadcast_id DESC);

CREATE TABLE listening_history (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broadcast_id uuid NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  last_listened_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, broadcast_id)
);

CREATE INDEX listening_history_user_recent_idx
  ON listening_history (user_id, last_listened_at DESC, broadcast_id DESC);

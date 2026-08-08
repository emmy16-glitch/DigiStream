CREATE TABLE channel_follows (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  followed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel_id)
);

CREATE INDEX channel_follows_user_followed_at_idx
  ON channel_follows(user_id, followed_at DESC, channel_id DESC);
CREATE INDEX channel_follows_channel_idx ON channel_follows(channel_id);

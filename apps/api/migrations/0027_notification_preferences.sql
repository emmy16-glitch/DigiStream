ALTER TABLE user_notifications
  ADD COLUMN archived_at timestamptz;

CREATE INDEX user_notifications_user_active_created_idx
  ON user_notifications (user_id, created_at DESC, id DESC)
  WHERE archived_at IS NULL;

CREATE TABLE user_notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  realtime_delivery_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

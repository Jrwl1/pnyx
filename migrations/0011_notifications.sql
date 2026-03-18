-- WHAT IT DO? Adds notification records, delivery tracking, and per-user notification preferences.

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id TEXT PRIMARY KEY,
  in_app_enabled INTEGER NOT NULL DEFAULT 1 CHECK(in_app_enabled IN (0, 1)),
  email_enabled INTEGER NOT NULL DEFAULT 0 CHECK(email_enabled IN (0, 1)),
  review_updates_enabled INTEGER NOT NULL DEFAULT 1 CHECK(review_updates_enabled IN (0, 1)),
  moderator_assignments_enabled INTEGER NOT NULL DEFAULT 1 CHECK(moderator_assignments_enabled IN (0, 1)),
  role_updates_enabled INTEGER NOT NULL DEFAULT 1 CHECK(role_updates_enabled IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  related_path TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON notifications(user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, read_at, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_id INTEGER NOT NULL,
  channel TEXT NOT NULL CHECK(channel IN ('inapp', 'email')),
  delivery_state TEXT NOT NULL CHECK(delivery_state IN ('pending', 'delivered', 'failed', 'skipped')),
  provider_message_id TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification
ON notification_deliveries(notification_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_channel_state
ON notification_deliveries(channel, delivery_state, created_at DESC, id DESC);

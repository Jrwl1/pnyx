-- WHAT IT DO? Adds bounded page discussions, reports, and moderation actions separate from canonical facts.

CREATE TABLE IF NOT EXISTS discussion_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_kind TEXT NOT NULL CHECK(entity_kind IN ('politician', 'canonical_promise')),
  entity_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'locked', 'hidden', 'removed', 'escalated')),
  moderation_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_discussion_threads_entity
ON discussion_threads(entity_kind, entity_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS discussion_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible' CHECK(status IN ('visible', 'hidden', 'removed')),
  moderation_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (thread_id) REFERENCES discussion_threads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_discussion_comments_thread
ON discussion_comments(thread_id, status, created_at ASC);

CREATE TABLE IF NOT EXISTS discussion_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_kind TEXT NOT NULL CHECK(target_kind IN ('thread', 'comment')),
  target_id INTEGER NOT NULL,
  reporter_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'escalated')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_discussion_reports_status
ON discussion_reports(status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_discussion_reports_target
ON discussion_reports(target_kind, target_id);

CREATE TABLE IF NOT EXISTS discussion_moderation_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_kind TEXT NOT NULL CHECK(target_kind IN ('thread', 'comment', 'report')),
  target_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_discussion_moderation_actions_target
ON discussion_moderation_actions(target_kind, target_id, created_at DESC);

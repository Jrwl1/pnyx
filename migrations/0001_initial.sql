-- WHAT IT DO? Creates baseline V1 schema for users, politicians, statements, votes, and revision audit history.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('user', 'moderator', 'admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS politicians (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  region TEXT,
  office TEXT,
  external_id TEXT UNIQUE,
  verified INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  normalized_key TEXT GENERATED ALWAYS AS (
    lower(trim(name)) || '|' || lower(trim(COALESCE(region, ''))) || '|' || lower(trim(COALESCE(office, '')))
  ) STORED
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_politicians_normalized_key_no_external
ON politicians(normalized_key)
WHERE external_id IS NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS statements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  politician_id INTEGER NOT NULL,
  source_url TEXT NOT NULL,
  body TEXT NOT NULL,
  date_said TEXT NOT NULL,
  normalized_body_hash TEXT NOT NULL,
  statement_fingerprint TEXT NOT NULL,
  verification_status TEXT NOT NULL CHECK(verification_status IN ('pending', 'verified', 'disputed', 'rejected')),
  author_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  withdrawn_at TEXT,
  pending_delete INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  FOREIGN KEY (politician_id) REFERENCES politicians(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_statements_fingerprint
ON statements(statement_fingerprint)
WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  statement_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  value TEXT NOT NULL CHECK(value IN ('support', 'oppose')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (statement_id) REFERENCES statements(id),
  UNIQUE(statement_id, user_id)
);

CREATE TABLE IF NOT EXISTS revision_audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  statement_id INTEGER NOT NULL,
  actor_id TEXT NOT NULL,
  change_type TEXT NOT NULL,
  from_value TEXT,
  to_value TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (statement_id) REFERENCES statements(id)
);

-- WHAT IT DO? Adds canonical promise records and accepted source bundles beside legacy statements.

CREATE TABLE IF NOT EXISTS canonical_promises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  politician_id INTEGER NOT NULL,
  promise_text TEXT NOT NULL,
  public_status TEXT NOT NULL DEFAULT 'draft' CHECK(public_status IN ('draft', 'public')),
  primary_statement_id INTEGER UNIQUE,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (politician_id) REFERENCES politicians(id),
  FOREIGN KEY (primary_statement_id) REFERENCES statements(id)
);

CREATE INDEX IF NOT EXISTS idx_canonical_promises_politician_status
ON canonical_promises(politician_id, public_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_canonical_promises_public
ON canonical_promises(public_status, created_at DESC)
WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS canonical_promise_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_promise_id INTEGER NOT NULL,
  statement_id INTEGER,
  source_url TEXT NOT NULL,
  source_note TEXT,
  accepted_by TEXT NOT NULL,
  accepted_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (canonical_promise_id) REFERENCES canonical_promises(id) ON DELETE CASCADE,
  FOREIGN KEY (statement_id) REFERENCES statements(id),
  UNIQUE(canonical_promise_id, source_url)
);

CREATE INDEX IF NOT EXISTS idx_canonical_promise_sources_promise
ON canonical_promise_sources(canonical_promise_id, id);

CREATE INDEX IF NOT EXISTS idx_canonical_promise_sources_statement
ON canonical_promise_sources(statement_id, canonical_promise_id);

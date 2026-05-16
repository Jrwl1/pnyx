-- WHAT IT DO? Adds reviewed page-readiness state for public authority pages.

CREATE TABLE IF NOT EXISTS page_readiness (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_kind TEXT NOT NULL CHECK(entity_kind IN ('politician', 'party', 'canonical_promise')),
  entity_id TEXT NOT NULL,
  readiness_state TEXT NOT NULL CHECK(readiness_state IN ('ready', 'thin_but_honest', 'not_ready')),
  freshness_checked_at TEXT,
  source_count INTEGER NOT NULL DEFAULT 0 CHECK(source_count >= 0),
  provenance_summary TEXT NOT NULL,
  missing_data_json TEXT NOT NULL DEFAULT '[]',
  reviewed_by TEXT NOT NULL,
  reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(entity_kind, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_page_readiness_entity
ON page_readiness(entity_kind, entity_id);

CREATE INDEX IF NOT EXISTS idx_page_readiness_state
ON page_readiness(entity_kind, readiness_state, updated_at DESC);

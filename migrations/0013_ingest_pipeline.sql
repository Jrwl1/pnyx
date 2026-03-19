-- WHAT IT DO? Adds ingest runs, raw records, and staging tables for Finland-first official-source imports.

CREATE TABLE IF NOT EXISTS ingest_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_family TEXT NOT NULL,
  source_key TEXT NOT NULL,
  source_url TEXT,
  triggered_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'fetched', 'staged', 'applied', 'failed')),
  fetched_count INTEGER NOT NULL DEFAULT 0,
  staged_count INTEGER NOT NULL DEFAULT 0,
  applied_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ingest_runs_source_created
ON ingest_runs(source_family, source_key, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS ingest_raw_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  source_family TEXT NOT NULL,
  source_key TEXT NOT NULL,
  record_type TEXT NOT NULL,
  source_record_key TEXT NOT NULL,
  source_url TEXT,
  payload_json TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (run_id) REFERENCES ingest_runs(id) ON DELETE CASCADE,
  UNIQUE(source_family, source_key, record_type, source_record_key, payload_hash)
);

CREATE INDEX IF NOT EXISTS idx_ingest_raw_records_run
ON ingest_raw_records(run_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_ingest_raw_records_source
ON ingest_raw_records(source_family, source_key, record_type, source_record_key, id DESC);

CREATE TABLE IF NOT EXISTS ingest_stage_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  raw_record_id INTEGER NOT NULL,
  stage_type TEXT NOT NULL CHECK(stage_type IN ('party_stance', 'vote_event', 'vote_record')),
  source_key TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  normalized_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'applied', 'rejected', 'failed')),
  applied_entity_kind TEXT,
  applied_entity_id TEXT,
  decided_by TEXT,
  decided_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (run_id) REFERENCES ingest_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (raw_record_id) REFERENCES ingest_raw_records(id) ON DELETE CASCADE,
  UNIQUE(source_key, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_ingest_stage_items_run
ON ingest_stage_items(run_id, status, id DESC);

CREATE INDEX IF NOT EXISTS idx_ingest_stage_items_status
ON ingest_stage_items(stage_type, status, created_at DESC, id DESC);

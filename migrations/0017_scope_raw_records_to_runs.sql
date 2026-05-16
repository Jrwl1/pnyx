-- WHAT IT DO? Scopes raw-record dedupe to an ingest run so repeated imports keep separate cascade ownership.

DROP INDEX IF EXISTS idx_ingest_stage_items_run;
DROP INDEX IF EXISTS idx_ingest_stage_items_status;
DROP INDEX IF EXISTS idx_ingest_raw_records_run;
DROP INDEX IF EXISTS idx_ingest_raw_records_source;

ALTER TABLE ingest_raw_records RENAME TO ingest_raw_records_old;

CREATE TABLE ingest_raw_records (
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
  UNIQUE(run_id, source_family, source_key, record_type, source_record_key, payload_hash)
);

INSERT INTO ingest_raw_records
  (id, run_id, source_family, source_key, record_type, source_record_key, source_url, payload_json, payload_hash, fetched_at)
SELECT id, run_id, source_family, source_key, record_type, source_record_key, source_url, payload_json, payload_hash, fetched_at
FROM ingest_raw_records_old;

ALTER TABLE ingest_stage_items RENAME TO ingest_stage_items_old;

CREATE TABLE ingest_stage_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  raw_record_id INTEGER NOT NULL,
  stage_type TEXT NOT NULL CHECK(stage_type IN ('party_stance', 'vote_event', 'vote_record', 'coverage_party_target', 'coverage_politician_target', 'canonical_promise', 'fulfillment_assessment', 'party_alignment', 'politician_statement')),
  source_key TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  normalized_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'applied', 'rejected', 'failed', 'needs_source')),
  applied_entity_kind TEXT,
  applied_entity_id TEXT,
  decided_by TEXT,
  decided_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (run_id) REFERENCES ingest_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (raw_record_id) REFERENCES ingest_raw_records(id) ON DELETE CASCADE,
  UNIQUE(run_id, source_key, dedupe_key)
);

INSERT INTO ingest_stage_items
  (id, run_id, raw_record_id, stage_type, source_key, dedupe_key, normalized_json, status,
   applied_entity_kind, applied_entity_id, decided_by, decided_at, error_message, created_at, updated_at)
SELECT id, run_id, raw_record_id, stage_type, source_key, dedupe_key, normalized_json, status,
       applied_entity_kind, applied_entity_id, decided_by, decided_at, error_message, created_at, updated_at
FROM ingest_stage_items_old;

DROP TABLE ingest_stage_items_old;
DROP TABLE ingest_raw_records_old;

CREATE INDEX IF NOT EXISTS idx_ingest_raw_records_run
ON ingest_raw_records(run_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_ingest_raw_records_source
ON ingest_raw_records(source_family, source_key, record_type, source_record_key, id DESC);

CREATE INDEX IF NOT EXISTS idx_ingest_stage_items_run
ON ingest_stage_items(run_id, status, id DESC);

CREATE INDEX IF NOT EXISTS idx_ingest_stage_items_status
ON ingest_stage_items(stage_type, status, created_at DESC, id DESC);

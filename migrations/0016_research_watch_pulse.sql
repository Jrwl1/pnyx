DROP INDEX IF EXISTS idx_ingest_stage_items_run;
DROP INDEX IF EXISTS idx_ingest_stage_items_status;

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

CREATE INDEX IF NOT EXISTS idx_ingest_stage_items_run
ON ingest_stage_items(run_id, status, id DESC);

CREATE INDEX IF NOT EXISTS idx_ingest_stage_items_status
ON ingest_stage_items(stage_type, status, created_at DESC, id DESC);

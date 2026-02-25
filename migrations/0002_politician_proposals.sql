-- WHAT IT DO? Adds moderated politician proposal queue schema and proposal audit log.

CREATE TABLE IF NOT EXISTS politician_proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submitted_by TEXT NOT NULL,
  name TEXT NOT NULL,
  region TEXT,
  office TEXT,
  external_id TEXT,
  source_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'duplicate')),
  decision_by TEXT,
  decision_reason TEXT,
  linked_politician_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at TEXT,
  normalized_submission_key TEXT GENERATED ALWAYS AS (
    lower(trim(name)) || '|' || lower(trim(COALESCE(region, ''))) || '|' || lower(trim(COALESCE(office, '')))
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_politician_proposals_status_created
ON politician_proposals(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_politician_proposals_submitter
ON politician_proposals(submitted_by, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_politician_proposals_pending_external
ON politician_proposals(external_id)
WHERE status = 'pending' AND external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_politician_proposals_pending_normalized
ON politician_proposals(normalized_submission_key)
WHERE status = 'pending' AND external_id IS NULL;

CREATE TABLE IF NOT EXISTS politician_proposal_audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id INTEGER NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('submitted', 'approved', 'rejected', 'duplicate', 'linked')),
  from_status TEXT,
  to_status TEXT,
  reason TEXT,
  linked_politician_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (proposal_id) REFERENCES politician_proposals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_politician_proposal_audits_proposal
ON politician_proposal_audits(proposal_id, id);

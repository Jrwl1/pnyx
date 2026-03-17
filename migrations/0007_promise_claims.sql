-- WHAT IT DO? Adds promise-source claim intake, equivalence signals, and moderation audit tables for canonization.

CREATE TABLE IF NOT EXISTS promise_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submitted_by TEXT NOT NULL,
  politician_id INTEGER NOT NULL,
  claim_text TEXT NOT NULL,
  source_url TEXT NOT NULL,
  date_said TEXT NOT NULL,
  source_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'merged', 'canonized', 'rejected')),
  assignee_id TEXT,
  assigned_at TEXT,
  decision_by TEXT,
  decision_reason TEXT,
  decision_code TEXT,
  linked_canonical_promise_id INTEGER,
  review_version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at TEXT,
  normalized_claim_key TEXT GENERATED ALWAYS AS (
    lower(trim(claim_text)) || '|' || lower(trim(source_url)) || '|' || lower(trim(date_said))
  ) STORED,
  FOREIGN KEY (politician_id) REFERENCES politicians(id),
  FOREIGN KEY (linked_canonical_promise_id) REFERENCES canonical_promises(id)
);

CREATE INDEX IF NOT EXISTS idx_promise_claims_status_assignee_created
ON promise_claims(status, assignee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promise_claims_submitter_created
ON promise_claims(submitted_by, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_promise_claims_pending_key
ON promise_claims(politician_id, normalized_claim_key)
WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS promise_claim_audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_id INTEGER NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('submitted', 'claimed', 'released', 'merged', 'canonized', 'rejected')),
  from_status TEXT,
  to_status TEXT,
  reason TEXT,
  reason_code TEXT,
  linked_canonical_promise_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (claim_id) REFERENCES promise_claims(id) ON DELETE CASCADE,
  FOREIGN KEY (linked_canonical_promise_id) REFERENCES canonical_promises(id)
);

CREATE INDEX IF NOT EXISTS idx_promise_claim_audits_claim
ON promise_claim_audits(claim_id, id);

CREATE INDEX IF NOT EXISTS idx_promise_claim_audits_actor_created
ON promise_claim_audits(actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS claim_equivalence_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_id INTEGER NOT NULL,
  actor_id TEXT NOT NULL,
  target_kind TEXT NOT NULL CHECK(target_kind IN ('canonical_promise', 'claim')),
  target_id INTEGER NOT NULL,
  relation TEXT NOT NULL CHECK(relation IN ('same_as', 'non_match')),
  reason_code TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (claim_id) REFERENCES promise_claims(id) ON DELETE CASCADE,
  UNIQUE(claim_id, actor_id, target_kind, target_id)
);

CREATE INDEX IF NOT EXISTS idx_claim_equivalence_signals_claim
ON claim_equivalence_signals(claim_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_claim_equivalence_signals_target
ON claim_equivalence_signals(target_kind, target_id, created_at DESC);

-- WHAT IT DO? Adds source-backed party stances, vote events, and trust assessment records for Finland-first accountability reads.

CREATE TABLE IF NOT EXISTS party_stances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  party_id TEXT NOT NULL,
  issue TEXT,
  stance_text TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_note TEXT,
  date_said TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  normalized_stance_key TEXT GENERATED ALWAYS AS (
    lower(trim(stance_text)) || '|' || lower(trim(source_url)) || '|' || lower(trim(date_said))
  ) STORED,
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE,
  UNIQUE(party_id, normalized_stance_key)
);

CREATE INDEX IF NOT EXISTS idx_party_stances_party_date
ON party_stances(party_id, date_said DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_party_stances_issue_date
ON party_stances(issue, date_said DESC, id DESC);

CREATE TABLE IF NOT EXISTS vote_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_key TEXT,
  country_code TEXT NOT NULL DEFAULT 'FI',
  institution_name TEXT NOT NULL DEFAULT 'Eduskunta',
  issue TEXT,
  title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_note TEXT,
  event_date TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (country_code = upper(country_code))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vote_events_external_key
ON vote_events(external_key)
WHERE external_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vote_events_country_date
ON vote_events(country_code, event_date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_vote_events_issue_date
ON vote_events(issue, event_date DESC, id DESC);

CREATE TABLE IF NOT EXISTS politician_vote_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vote_event_id INTEGER NOT NULL,
  politician_id INTEGER NOT NULL,
  vote_value TEXT NOT NULL CHECK(vote_value IN ('for', 'against', 'abstain', 'absent')),
  source_note TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (vote_event_id) REFERENCES vote_events(id) ON DELETE CASCADE,
  FOREIGN KEY (politician_id) REFERENCES politicians(id) ON DELETE CASCADE,
  UNIQUE(vote_event_id, politician_id)
);

CREATE INDEX IF NOT EXISTS idx_politician_vote_records_politician
ON politician_vote_records(politician_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_politician_vote_records_event
ON politician_vote_records(vote_event_id, id);

CREATE TABLE IF NOT EXISTS canonical_promise_vote_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_promise_id INTEGER NOT NULL,
  vote_event_id INTEGER NOT NULL,
  aligned_vote_value TEXT NOT NULL CHECK(aligned_vote_value IN ('for', 'against', 'abstain')),
  comparison_note TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (canonical_promise_id) REFERENCES canonical_promises(id) ON DELETE CASCADE,
  FOREIGN KEY (vote_event_id) REFERENCES vote_events(id) ON DELETE CASCADE,
  UNIQUE(canonical_promise_id, vote_event_id)
);

CREATE INDEX IF NOT EXISTS idx_canonical_promise_vote_links_promise
ON canonical_promise_vote_links(canonical_promise_id, id);

CREATE INDEX IF NOT EXISTS idx_canonical_promise_vote_links_event
ON canonical_promise_vote_links(vote_event_id, id);

CREATE TABLE IF NOT EXISTS promise_fulfillment_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_promise_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('fulfilled', 'broken', 'in_progress', 'unknown')),
  summary TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_note TEXT,
  evidence_date TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (canonical_promise_id) REFERENCES canonical_promises(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_promise_fulfillment_assessments_promise
ON promise_fulfillment_assessments(canonical_promise_id, evidence_date DESC, id DESC);

CREATE TABLE IF NOT EXISTS party_alignment_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_promise_id INTEGER NOT NULL,
  party_stance_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('aligned', 'broke_party_line')),
  reason TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (canonical_promise_id) REFERENCES canonical_promises(id) ON DELETE CASCADE,
  FOREIGN KEY (party_stance_id) REFERENCES party_stances(id) ON DELETE CASCADE,
  UNIQUE(canonical_promise_id, party_stance_id)
);

CREATE INDEX IF NOT EXISTS idx_party_alignment_assessments_promise
ON party_alignment_assessments(canonical_promise_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_party_alignment_assessments_stance
ON party_alignment_assessments(party_stance_id, id DESC);

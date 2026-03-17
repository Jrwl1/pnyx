-- WHAT IT DO? Adds party membership history for linking politicians to canonical parties over time.

CREATE TABLE IF NOT EXISTS party_memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  politician_id INTEGER NOT NULL,
  party_id TEXT NOT NULL,
  role_title TEXT,
  start_date TEXT,
  end_date TEXT,
  source_note TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (politician_id) REFERENCES politicians(id) ON DELETE CASCADE,
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE,
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_party_memberships_current_politician
ON party_memberships(politician_id)
WHERE end_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_party_memberships_party_dates
ON party_memberships(party_id, end_date, start_date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_party_memberships_politician_dates
ON party_memberships(politician_id, end_date, start_date DESC, id DESC);

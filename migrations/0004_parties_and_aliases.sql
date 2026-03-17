-- WHAT IT DO? Adds canonical party and party-alias tables for backend-backed party identity reads.

CREATE TABLE IF NOT EXISTS parties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'FI',
  description TEXT,
  website_url TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_parties_name_active
ON parties(lower(trim(name)))
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_parties_short_name_active
ON parties(lower(trim(short_name)))
WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS party_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  party_id TEXT NOT NULL,
  alias TEXT NOT NULL,
  normalized_alias TEXT GENERATED ALWAYS AS (lower(trim(alias))) STORED,
  source_note TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE,
  UNIQUE(party_id, normalized_alias)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_party_aliases_normalized
ON party_aliases(normalized_alias);

CREATE INDEX IF NOT EXISTS idx_party_aliases_party
ON party_aliases(party_id, id);

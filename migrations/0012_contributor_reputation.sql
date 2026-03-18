-- WHAT IT DO? Adds contributor reputation aggregates and score storage for moderation-backed trust signals.

CREATE TABLE IF NOT EXISTS contributor_reputation (
  user_id TEXT PRIMARY KEY,
  verified_statements INTEGER NOT NULL DEFAULT 0,
  disputed_statements INTEGER NOT NULL DEFAULT 0,
  rejected_statements INTEGER NOT NULL DEFAULT 0,
  approved_proposals INTEGER NOT NULL DEFAULT 0,
  duplicate_proposals INTEGER NOT NULL DEFAULT 0,
  rejected_proposals INTEGER NOT NULL DEFAULT 0,
  merged_claims INTEGER NOT NULL DEFAULT 0,
  canonized_claims INTEGER NOT NULL DEFAULT 0,
  rejected_claims INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contributor_reputation_score
ON contributor_reputation(score DESC, updated_at DESC, user_id);

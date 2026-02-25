-- WHAT IT DO? Adds moderation operations fields and indexes for proposal queue hardening.

ALTER TABLE politician_proposals ADD COLUMN assignee_id TEXT;
ALTER TABLE politician_proposals ADD COLUMN assigned_at TEXT;
ALTER TABLE politician_proposals ADD COLUMN decision_code TEXT;
ALTER TABLE politician_proposals ADD COLUMN review_version INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_politician_proposals_status_assignee_created
ON politician_proposals(status, assignee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_politician_proposals_assignee_status_created
ON politician_proposals(assignee_id, status, created_at DESC);

ALTER TABLE politician_proposal_audits ADD COLUMN reason_code TEXT;

CREATE INDEX IF NOT EXISTS idx_politician_proposal_audits_actor_created
ON politician_proposal_audits(actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_politician_proposal_audits_action_created
ON politician_proposal_audits(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_politician_proposal_audits_status_created
ON politician_proposal_audits(to_status, created_at DESC);

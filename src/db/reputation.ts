// WHAT IT DO? Computes and stores contributor reputation aggregates from statement, proposal, and claim outcomes.

import { db } from "./client.js";

export type ContributorReputationRow = {
  userId: string;
  verifiedStatements: number;
  disputedStatements: number;
  rejectedStatements: number;
  approvedProposals: number;
  duplicateProposals: number;
  rejectedProposals: number;
  mergedClaims: number;
  canonizedClaims: number;
  rejectedClaims: number;
  score: number;
  updatedAt: string;
};

export const REPUTATION_WEIGHTS = {
  verifiedStatements: 1,
  disputedStatements: -1,
  rejectedStatements: -2,
  approvedProposals: 4,
  duplicateProposals: -1,
  rejectedProposals: -2,
  mergedClaims: 2,
  canonizedClaims: 3,
  rejectedClaims: -2
} as const;

const buildReputationScore = (counts: Omit<ContributorReputationRow, "userId" | "score" | "updatedAt">): number => {
  return (
    counts.verifiedStatements * REPUTATION_WEIGHTS.verifiedStatements +
    counts.disputedStatements * REPUTATION_WEIGHTS.disputedStatements +
    counts.rejectedStatements * REPUTATION_WEIGHTS.rejectedStatements +
    counts.approvedProposals * REPUTATION_WEIGHTS.approvedProposals +
    counts.duplicateProposals * REPUTATION_WEIGHTS.duplicateProposals +
    counts.rejectedProposals * REPUTATION_WEIGHTS.rejectedProposals +
    counts.mergedClaims * REPUTATION_WEIGHTS.mergedClaims +
    counts.canonizedClaims * REPUTATION_WEIGHTS.canonizedClaims +
    counts.rejectedClaims * REPUTATION_WEIGHTS.rejectedClaims
  );
};

export const recomputeContributorReputation = (userId: string): ContributorReputationRow => {
  const statementCounts = db
    .prepare(
      `SELECT
        SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) AS verifiedStatements,
        SUM(CASE WHEN verification_status = 'disputed' THEN 1 ELSE 0 END) AS disputedStatements,
        SUM(CASE WHEN verification_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedStatements
       FROM statements
       WHERE author_id = ? AND deleted_at IS NULL`
    )
    .get(userId) as { verifiedStatements: number | null; disputedStatements: number | null; rejectedStatements: number | null };

  const proposalCounts = db
    .prepare(
      `SELECT
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approvedProposals,
        SUM(CASE WHEN status = 'duplicate' THEN 1 ELSE 0 END) AS duplicateProposals,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejectedProposals
       FROM politician_proposals
       WHERE submitted_by = ?`
    )
    .get(userId) as { approvedProposals: number | null; duplicateProposals: number | null; rejectedProposals: number | null };

  const claimCounts = db
    .prepare(
      `SELECT
        SUM(CASE WHEN status = 'merged' THEN 1 ELSE 0 END) AS mergedClaims,
        SUM(CASE WHEN status = 'canonized' THEN 1 ELSE 0 END) AS canonizedClaims,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejectedClaims
       FROM promise_claims
       WHERE submitted_by = ?`
    )
    .get(userId) as { mergedClaims: number | null; canonizedClaims: number | null; rejectedClaims: number | null };

  const counts = {
    verifiedStatements: Number(statementCounts.verifiedStatements ?? 0),
    disputedStatements: Number(statementCounts.disputedStatements ?? 0),
    rejectedStatements: Number(statementCounts.rejectedStatements ?? 0),
    approvedProposals: Number(proposalCounts.approvedProposals ?? 0),
    duplicateProposals: Number(proposalCounts.duplicateProposals ?? 0),
    rejectedProposals: Number(proposalCounts.rejectedProposals ?? 0),
    mergedClaims: Number(claimCounts.mergedClaims ?? 0),
    canonizedClaims: Number(claimCounts.canonizedClaims ?? 0),
    rejectedClaims: Number(claimCounts.rejectedClaims ?? 0)
  };
  const score = buildReputationScore(counts);

  db.prepare(
    `INSERT INTO contributor_reputation
     (user_id, verified_statements, disputed_statements, rejected_statements, approved_proposals, duplicate_proposals, rejected_proposals, merged_claims, canonized_claims, rejected_claims, score, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id)
     DO UPDATE SET
       verified_statements = excluded.verified_statements,
       disputed_statements = excluded.disputed_statements,
       rejected_statements = excluded.rejected_statements,
       approved_proposals = excluded.approved_proposals,
       duplicate_proposals = excluded.duplicate_proposals,
       rejected_proposals = excluded.rejected_proposals,
       merged_claims = excluded.merged_claims,
       canonized_claims = excluded.canonized_claims,
       rejected_claims = excluded.rejected_claims,
       score = excluded.score,
       updated_at = datetime('now')`
  ).run(
    userId,
    counts.verifiedStatements,
    counts.disputedStatements,
    counts.rejectedStatements,
    counts.approvedProposals,
    counts.duplicateProposals,
    counts.rejectedProposals,
    counts.mergedClaims,
    counts.canonizedClaims,
    counts.rejectedClaims,
    score
  );

  return db
    .prepare(
      `SELECT user_id AS userId,
        verified_statements AS verifiedStatements,
        disputed_statements AS disputedStatements,
        rejected_statements AS rejectedStatements,
        approved_proposals AS approvedProposals,
        duplicate_proposals AS duplicateProposals,
        rejected_proposals AS rejectedProposals,
        merged_claims AS mergedClaims,
        canonized_claims AS canonizedClaims,
        rejected_claims AS rejectedClaims,
        score,
        updated_at AS updatedAt
       FROM contributor_reputation
       WHERE user_id = ?`
    )
    .get(userId) as ContributorReputationRow;
};

export const recomputeAllContributorReputation = (): ContributorReputationRow[] => {
  const rows = db
    .prepare(
      `SELECT DISTINCT user_id AS userId
       FROM (
         SELECT author_id AS user_id FROM statements WHERE author_id IS NOT NULL AND author_id NOT IN ('system', 'moderation', 'unknown')
         UNION
         SELECT submitted_by AS user_id FROM politician_proposals WHERE submitted_by IS NOT NULL AND submitted_by NOT IN ('system', 'moderation', 'unknown')
         UNION
         SELECT submitted_by AS user_id FROM promise_claims WHERE submitted_by IS NOT NULL AND submitted_by NOT IN ('system', 'moderation', 'unknown')
       )`
    )
    .all() as Array<{ userId: string }>;

  return rows.map((row) => recomputeContributorReputation(row.userId));
};

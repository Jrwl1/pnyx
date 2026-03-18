# V1 success metrics plan

WHAT IT DO? Defines deterministic, repeatable measurement commands for locked V1 success criteria using current SQLite schema and moderation workflow data.

## Metric goals (from locked V1)

- Number of tracked politicians and statements.
- Percent of statements with a non-pending verification status.
- Active user engagement (votes and moderation/review activity).
- Retention of returning users.
- Number of public canonical promises, pending promise claims, and canonized claim decisions.
- Number of official party stances, vote events, and trust-assessed canonical promises.

## Snapshot command (single JSON output)

Run from repo root against the configured `DB_PATH`:

```bash
pnpm tsx -e "import { db } from './src/db/client.ts'; const row = db.prepare(\`
WITH statement_stats AS (
  SELECT
    COUNT(*) AS tracked_statements,
    COALESCE(SUM(CASE WHEN verification_status != 'pending' THEN 1 ELSE 0 END), 0) AS verified_or_reviewed
  FROM statements
  WHERE deleted_at IS NULL
),
engagement AS (
  SELECT
    (SELECT COUNT(*) FROM votes) AS vote_events,
    (SELECT COUNT(*) FROM politician_proposal_audits WHERE action IN ('approved','rejected','duplicate')) AS moderation_decisions
),
retention AS (
  WITH activity AS (
    SELECT author_id AS actor_id, date(created_at) AS activity_day FROM statements
    UNION ALL
    SELECT user_id AS actor_id, date(created_at) AS activity_day FROM votes
    UNION ALL
    SELECT submitted_by AS actor_id, date(created_at) AS activity_day FROM politician_proposals
    UNION ALL
    SELECT actor_id AS actor_id, date(created_at) AS activity_day FROM politician_proposal_audits
  )
  SELECT COUNT(*) AS returning_actors_2plus_days
  FROM (
    SELECT actor_id
    FROM activity
    WHERE actor_id IS NOT NULL
      AND actor_id NOT IN ('system', 'moderation', 'unknown')
    GROUP BY actor_id
    HAVING COUNT(DISTINCT activity_day) >= 2
  )
)
SELECT
  (SELECT COUNT(*) FROM politicians WHERE deleted_at IS NULL) AS tracked_politicians,
  statement_stats.tracked_statements,
  statement_stats.verified_or_reviewed,
  CASE
    WHEN statement_stats.tracked_statements = 0 THEN 0
    ELSE ROUND((statement_stats.verified_or_reviewed * 100.0) / statement_stats.tracked_statements, 2)
  END AS verification_assigned_pct,
  engagement.vote_events,
  engagement.moderation_decisions,
  retention.returning_actors_2plus_days
FROM statement_stats, engagement, retention;
\`).get() as Record<string, unknown>; console.log(JSON.stringify(row, null, 2));"
```

## Output schema

- `tracked_politicians` (number): canonical politicians with `deleted_at IS NULL`.
- `tracked_statements` (number): statements with `deleted_at IS NULL`.
- `verified_or_reviewed` (number): non-pending statements (`verification_status != 'pending'`).
- `verification_assigned_pct` (number): `(verified_or_reviewed / tracked_statements) * 100` rounded to 2 decimals.
- `vote_events` (number): total vote rows (one active vote per actor/statement).
- `moderation_decisions` (number): proposal decisions (`approved|rejected|duplicate`).
- `returning_actors_2plus_days` (number): actors with activity on at least two distinct days across statements, votes, proposal submissions, or proposal audits.

## Suggested reporting cadence

- Daily lightweight snapshot in development/staging.
- Pre-release and post-release checkpoints recorded in release notes.
- Compare week-over-week trend deltas for engagement and retention proxies.
- Record `pnpm seed:launch-rehearsal` and `pnpm launch:coverage` outcomes for each seeded launch dry run.
- Record `pnpm proof:launch` and `pnpm smoke:release` outcomes at each release rehearsal checkpoint.

## Notes and caveats

- Retention is a proxy based on persisted activity rows; no session analytics table exists in V1.
- Soft-deleted statements are excluded from tracked statement counts.
- If schema changes affect these queries, update this file and `docs/TRACEABILITY_V1.md` in the same commit.

## Expanded accountability snapshot (S21..S26)

Run from repo root against the configured `DB_PATH`:

```bash
pnpm tsx -e "import { db } from './src/db/client.ts'; const row = db.prepare(\\`\n+SELECT\n+  (SELECT COUNT(*) FROM canonical_promises WHERE deleted_at IS NULL AND public_status = 'public') AS public_canonical_promises,\n+  (SELECT COUNT(*) FROM promise_claims WHERE status = 'pending') AS pending_promise_claims,\n+  (SELECT COUNT(*) FROM promise_claim_audits WHERE action = 'canonized') AS canonized_claim_decisions,\n+  (SELECT COUNT(*) FROM party_stances) AS party_stances,\n+  (SELECT COUNT(*) FROM vote_events) AS vote_events,\n+  (SELECT COUNT(DISTINCT canonical_promise_id) FROM promise_fulfillment_assessments) AS promises_with_fulfillment_assessment,\n+  (SELECT COUNT(DISTINCT canonical_promise_id) FROM canonical_promise_vote_links) AS promises_with_vote_links,\n+  (SELECT COUNT(DISTINCT canonical_promise_id) FROM party_alignment_assessments) AS promises_with_party_alignment\n+\\`).get() as Record<string, unknown>; console.log(JSON.stringify(row, null, 2));"
```

Output schema:

- `public_canonical_promises`: public canonical promise count.
- `pending_promise_claims`: claims still awaiting moderator decision.
- `canonized_claim_decisions`: total canonize actions recorded in claim audit history.
- `party_stances`: total official party stance records.
- `vote_events`: total vote-event records.
- `promises_with_fulfillment_assessment`: canonical promises with at least one fulfillment assessment.
- `promises_with_vote_links`: canonical promises mapped to at least one vote event.
- `promises_with_party_alignment`: canonical promises with at least one party-line assessment.

## Launch rehearsal evidence

At each release rehearsal, capture:

- `pnpm seed:launch-rehearsal` pass/fail
- `pnpm launch:coverage` pass/fail
- `pnpm proof:launch` pass/fail
- `pnpm smoke:release` pass/fail
- browser/accessibility audit summary
- snapshot output from the base and expanded accountability metrics

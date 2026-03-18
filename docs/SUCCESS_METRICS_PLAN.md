# V1 success metrics plan

WHAT IT DO? Defines deterministic, repeatable measurement commands for locked V1 success criteria using current SQLite schema and moderation workflow data.

## Metric goals (from locked V1)

- Number of tracked politicians and statements.
- Percent of statements with a non-pending verification status.
- Active user engagement from explicit product-event rows plus votes.
- Retention of returning users from explicit product-event activity.
- Number of public canonical promises, pending promise claims, and canonized claim decisions.
- Number of official party stances, vote events, and trust-assessed canonical promises.
- Notification volume and delivery backlog.

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
    (SELECT COUNT(*) FROM product_events WHERE event_domain = 'moderation' AND event_name LIKE '%reviewed') AS moderation_decisions,
    (SELECT COUNT(*) FROM product_events) AS product_event_rows
),
retention AS (
  SELECT COUNT(*) AS returning_actors_2plus_days
  FROM (
    SELECT actor_id
    FROM product_events
    WHERE actor_id IS NOT NULL
      AND actor_id NOT IN ('system', 'moderation', 'unknown')
    GROUP BY actor_id
    HAVING COUNT(DISTINCT date(created_at)) >= 2
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
  engagement.product_event_rows,
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
- `moderation_decisions` (number): moderation review decisions derived from `product_events`.
- `product_event_rows` (number): total append-only rows in `product_events`.
- `returning_actors_2plus_days` (number): actors with product-event activity on at least two distinct days.

## Suggested reporting cadence

- Daily lightweight snapshot in development/staging.
- Pre-release and post-release checkpoints recorded in release notes.
- Compare week-over-week trend deltas for explicit product-event engagement and retention counts.
- Record `pnpm seed:launch-rehearsal` and `pnpm launch:coverage` outcomes for each seeded launch dry run.
- Record `pnpm proof:launch` and `pnpm smoke:release` outcomes at each release rehearsal checkpoint.

## Notes and caveats

- Retention now comes from append-only `product_events` rather than a derived proxy over mixed domain tables.
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

## Notification and event snapshot

Run from repo root against the configured `DB_PATH`:

```bash
pnpm tsx -e "import { db } from './src/db/client.ts'; const row = db.prepare(\`
SELECT
  (SELECT COUNT(*) FROM product_events) AS product_events_total,
  (SELECT COUNT(*) FROM notifications) AS notifications_total,
  (SELECT COUNT(*) FROM notifications WHERE read_at IS NULL) AS notifications_unread,
  (SELECT COUNT(*) FROM notification_deliveries WHERE channel = 'email' AND delivery_state = 'pending') AS email_deliveries_pending,
  (SELECT COUNT(*) FROM notification_deliveries WHERE channel = 'inapp' AND delivery_state = 'delivered') AS inapp_deliveries_delivered
\`).get() as Record<string, unknown>; console.log(JSON.stringify(row, null, 2));"
```

Output schema:

- `product_events_total`: total append-only product-event rows.
- `notifications_total`: total notification rows.
- `notifications_unread`: unread notification rows.
- `email_deliveries_pending`: email delivery rows waiting on a future sender.
- `inapp_deliveries_delivered`: in-app delivery rows recorded as delivered.

## Launch rehearsal evidence

At each release rehearsal, capture:

- `pnpm seed:launch-rehearsal` pass/fail
- `pnpm launch:coverage` pass/fail
- `pnpm proof:launch` pass/fail
- `pnpm smoke:release` pass/fail
- browser/accessibility audit summary
- snapshot output from the base and expanded accountability metrics

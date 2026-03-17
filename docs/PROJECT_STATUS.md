# Project status

Last updated: 2026-03-17

## Goal

Deliver Pnyx as a Finland-first public political accountability product with trustworthy politician, promise, and party-context surfaces.

## Active milestone

**M4: Contribution, party graph, and canonical promise foundation** (see `docs/ROADMAP.md`).

## Current state

- M3 public discovery hardening is complete: the citizen-facing frontend route set, copy, Finland-first framing, and accessibility/browser proof all landed in `frontend/`.
- `S-21` is complete: the frontend now exposes registration, sign-in, sign-out, politician proposal submission, statement submission, promise voting, and moderator proposal review against the existing backend flows.
- `S-22` is complete: canonical `parties`, `party_aliases`, and `party_memberships` now exist, public party reads are live, and the home/parties/politician party surfaces use backend-backed party identity and membership data.
- Promise pages still map frontend "promise" UX to raw `statements`; there is no canonical promise model, accepted-source bundle, or claim canonization flow yet.
- Trust surfaces remain intentionally unknown because fulfillment, vote-alignment, party-stance, and party-line assessment models do not exist yet.
- The active queue now expands into S-21..S-26 so Pnyx can move from read-first public alpha to contribution-capable accountability product without faking its trust graph.

## Top blockers

1. Canonical promises and accepted-source bundles do not exist yet, so promise routes still treat raw `statements` as the public promise model.
2. Claim equivalence, canonization, fulfillment, and party-line assessments are not modeled yet, blocking real politician and party trust metrics.
3. Release hardening still needs the post-schema search, auditability, regression, and full-site verification work queued in `S-26`.

## Next actions

1. Execute `S-23` to introduce canonical promises while keeping current statement-backed public reads compatible.
2. Execute `S-24` to add claim submission, equivalence, and moderator canonization flows for promise records.
3. Execute `S-25` and `S-26` to add trust dimensions, release hardening, and a full UI audit/manual verification pass.

## Key links

- `AGENTS.md`
- `docs/CANONICAL.md`
- `docs/CANONICAL_REPORT.md`
- `docs/ROADMAP.md`
- `docs/SPRINT.md`
- `docs/BACKLOG.md`
- `docs/DECISIONS.md`

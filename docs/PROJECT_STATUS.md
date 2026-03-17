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
- `S-23` is complete: canonical promises and accepted-source bundles now exist beside legacy statements, and the frontend distinguishes canonical public promises from raw submission history while keeping the existing `/promises/:id` route functional.
- Trust surfaces remain intentionally unknown because fulfillment, vote-alignment, party-stance, and party-line assessment models do not exist yet.
- The active queue now expands into S-21..S-26 so Pnyx can move from read-first public alpha to contribution-capable accountability product without faking its trust graph.

## Top blockers

1. Claim submission, equivalence, merge, and canonization flows do not exist yet, so moderators cannot turn competing promise claims into a durable canonical graph.
2. Fulfillment, vote-alignment, party-stance, and party-line assessments are still not modeled, so trust surfaces remain intentionally unknown.
3. Release hardening still needs the post-graph search, auditability, regression, and full-site verification work queued in `S-26`.

## Next actions

1. Execute `S-24` to add claim submission, equivalence, merge, and moderator canonization flows for promise records.
2. Execute `S-25` to add backend-derived trust dimensions from party stances, vote events, and fulfillment assessments.
3. Execute `S-26` to harden search, auditability, release proof, and the full UI/manual verification pass.

## Key links

- `AGENTS.md`
- `docs/CANONICAL.md`
- `docs/CANONICAL_REPORT.md`
- `docs/ROADMAP.md`
- `docs/SPRINT.md`
- `docs/BACKLOG.md`
- `docs/DECISIONS.md`

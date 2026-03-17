# Project status

Last updated: 2026-03-17

## Goal

Deliver Pnyx as a Finland-first public political accountability product with trustworthy politician, promise, and party-context surfaces.

## Active milestone

**M4: Contribution, party graph, and canonical promise foundation** (see `docs/ROADMAP.md`).

## Current state

- M3 public discovery hardening is complete: the citizen-facing frontend route set, copy, Finland-first framing, and accessibility/browser proof all landed in `frontend/`.
- The backend already supports registration, statement capture, statement voting, and politician-proposal moderation, but the frontend still behaves like a read-first public alpha because those flows are not exposed there yet.
- Party pages are still backed by frontend placeholder data; there is no backend `parties`, `party_aliases`, or `party_memberships` schema yet.
- Promise pages still map frontend "promise" UX to raw `statements`; there is no canonical promise model, accepted-source bundle, or claim canonization flow yet.
- Trust surfaces remain intentionally unknown because fulfillment, vote-alignment, party-stance, and party-line assessment models do not exist yet.
- The active queue now expands into S-21..S-26 so Pnyx can move from read-first public alpha to contribution-capable accountability product without faking its trust graph.

## Top blockers

1. Existing backend contribution and moderation capability is not reachable from the frontend.
2. Real party, membership, and canonical promise entities do not exist, so party pages and trust surfaces cannot become honest without schema/API work.
3. Claim equivalence, canonization, fulfillment, and party-line assessments are not modeled yet, blocking real politician and party trust metrics.

## Next actions

1. Execute `S-21` to expose auth, contribution, voting, and politician-proposal moderation flows in the frontend.
2. Execute `S-22` and `S-23` to add real party data and canonical promises while keeping current public reads compatible.
3. Execute `S-24` through `S-26` to add claim canonization, backend-derived trust dimensions, release hardening, and a full UI audit/manual verification pass.

## Key links

- `AGENTS.md`
- `docs/CANONICAL.md`
- `docs/CANONICAL_REPORT.md`
- `docs/ROADMAP.md`
- `docs/SPRINT.md`
- `docs/BACKLOG.md`
- `docs/DECISIONS.md`

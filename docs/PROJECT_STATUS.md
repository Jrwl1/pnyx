# Project status

Last updated: 2026-03-17

## Goal

Deliver Pnyx as a Finland-first public political accountability product with trustworthy politician, promise, and party-context surfaces.

## Active milestone

**S-21..S-26 completion snapshot** (see `docs/ROADMAP.md`).

## Current state

- M3 public discovery hardening is complete: the citizen-facing frontend route set, copy, Finland-first framing, and accessibility/browser proof all landed in `frontend/`.
- `S-21` is complete: the frontend now exposes registration, sign-in, sign-out, politician proposal submission, statement submission, promise voting, and moderator proposal review against the existing backend flows.
- `S-22` is complete: canonical `parties`, `party_aliases`, and `party_memberships` now exist, public party reads are live, and the home/parties/politician party surfaces use backend-backed party identity and membership data.
- `S-23` is complete: canonical promises and accepted-source bundles now exist beside legacy statements, and the frontend distinguishes canonical public promises from raw submission history while keeping the existing `/promises/:id` route functional.
- `S-24` is complete: contributors can submit promise-source claims, signal equivalence, moderators can merge or canonize claims, and public promise detail now exposes accepted sources plus canonical change history for merged claim sources.
- `S-25` is complete: official party stances, vote events, fulfillment assessments, and party-line assessments now exist, and backend-derived trust summaries drive politician, party, promise, and methodology surfaces with explicit unknown handling.
- `S-26` is complete: backend-backed search, public contributor activity, stronger moderation visibility, refreshed release docs, the full static/backend proof chain, and the route-wide UI/browser audit all landed and passed from a clean tree.
- All active sprint rows `S-21..S-26` are now complete and accepted in REVIEW.

## Top blockers

1. No active in-sprint blockers remain inside `S-21..S-26`; the next repo action is a fresh `PLAN` pass from the completed baseline.
2. Release/deploy sequencing beyond this sprint is not yet scheduled in canonical planning docs.
3. Any post-sprint feature work now depends on re-baselining roadmap and backlog priorities against the completed contribution/trust graph.

## Next actions

1. Run `PLAN` to re-baseline roadmap, backlog, and sprint priorities from the completed `S-21..S-26` state.
2. Decide release/deploy sequencing from the proof-backed, clean-tree baseline.
3. Prioritize post-sprint work using the refreshed traceability, release-readiness, and success-metrics docs.

## Key links

- `AGENTS.md`
- `docs/CANONICAL.md`
- `docs/CANONICAL_REPORT.md`
- `docs/ROADMAP.md`
- `docs/SPRINT.md`
- `docs/BACKLOG.md`
- `docs/DECISIONS.md`

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
- `S-24` is complete: contributors can submit promise-source claims, signal equivalence, moderators can merge or canonize claims, and public promise detail now exposes accepted sources plus canonical change history for merged claim sources.
- `S-25` is complete: official party stances, vote events, fulfillment assessments, and party-line assessments now exist, and backend-derived trust summaries drive politician, party, promise, and methodology surfaces with explicit unknown handling.
- The active queue now narrows to `S-26`, where search, auditability, release proof, and the full-site UI/manual verification pass still need to land.

## Top blockers

1. Search, contributor-activity, moderation auditability, and release hardening still need the post-graph work queued in `S-26`.
2. The full static/backend proof chain, browser/accessibility route sweep, and manual UI audit across `S-21..S-26` still remain open in `S-26`.
3. Traceability, release-readiness, success-metrics, and frontend route docs still need the final refresh for the implemented trust graph and canonization flows.

## Next actions

1. Execute `S-26` to harden search, auditability, release proof, and the full UI/manual verification pass.
2. Keep the new trust and party-line records covered as search, audit, and contributor-activity surfaces expand on top of the canonical graph.
3. Close the remaining release docs and full-site verification work once `S-26` is accepted in REVIEW.

## Key links

- `AGENTS.md`
- `docs/CANONICAL.md`
- `docs/CANONICAL_REPORT.md`
- `docs/ROADMAP.md`
- `docs/SPRINT.md`
- `docs/BACKLOG.md`
- `docs/DECISIONS.md`

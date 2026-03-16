# Project status

Last updated: 2026-03-16

## Goal

Deliver Pnyx as a Finland-first public political accountability product with trustworthy politician, promise, and party-context surfaces.

## Active milestone

**M1: Finland-first public discovery and party context lock** (see `docs/ROADMAP.md`).

## Current state

- The old always-on `ai/` repository OS has been removed from the repo and replaced with an opt-in `PLAN` / `DO` / `RUNSPRINT` / `REVIEW` contract.
- Backend moderation and proposal flows exist in `src/` and `test/`.
- A public Frontend V3 already exists in `frontend/` with routes for `/`, `/politicians`, `/politicians/:id`, `/promises/:id`, `/methodology`, and optional `/ops`.
- `docs/FRONTEND_V3_SPEC.md` and `docs/TRACEABILITY_V1.md` capture the current public-surface intent and traceability baseline.
- The next missing canonical slice is Finland-first public discovery plus party pages, party stance records, and politician-vs-party alignment surfaces.

## Top blockers

1. Party pages and party-context surfaces are in historical notes, but not yet locked in the active canonical docs.
2. The next implementation queue is not yet expressed as an executable `docs/SPRINT.md` plan against the shipped `frontend/` and `src/` state.
3. Legacy delegation and autopilot guidance previously created repo-level confusion and has now been removed; remaining planning docs need to stay aligned with the new contract.

## Next actions

1. Run `PLAN` to lock the Finland-first discovery and party-context milestone against current code and specs.
2. Turn that milestone into an executable sprint queue with concrete `frontend/`, `src/`, and `test/` scopes.
3. Use `DO` to land the first public discovery slice after the sprint queue is locked.

## Key links

- `AGENTS.md`
- `docs/CANONICAL.md`
- `docs/CANONICAL_REPORT.md`
- `docs/ROADMAP.md`
- `docs/SPRINT.md`
- `docs/BACKLOG.md`
- `docs/DECISIONS.md`

# Project status

Last updated: 2026-03-17

## Goal

Deliver Pnyx as a Finland-first public political accountability product with trustworthy politician, promise, and party-context surfaces.

## Active milestone

**M2: Public discovery implementation** (see `docs/ROADMAP.md`).

## Current state

- The old always-on `ai/` repository OS has been removed from the repo and replaced with an opt-in `PLAN` / `DO` / `RUNSPRINT` / `REVIEW` contract.
- Backend moderation and proposal flows exist in `src/` and `test/`.
- A public Frontend V3 already exists in `frontend/` with routes for `/`, `/politicians`, `/politicians/:id`, `/promises/:id`, `/methodology`, and optional `/ops`.
- `docs/FRONTEND_V3_SPEC.md` is now absorbed into the Finland-first, party-aware public discovery target.
- The active gap is implementation: current code still lacks party routes, party pages, Finland-first content updates, and party-context surfaces on profile/detail pages.

## Top blockers

1. Current backend APIs expose politicians/statements only, so party pages must begin with honest unknown states or frontend-local placeholder structures.
2. Current public nav and route shell are still politician-only.
3. Frontend verification for the overhaul is not yet wired into focused regression coverage.

## Next actions

1. Use `DO` or `RUNSPRINT` against the new frontend implementation queue in `docs/SPRINT.md`.
2. Land route-shell and nav changes first, then home/directory refresh, then party-context detail surfaces.
3. Follow the frontend build/typecheck/browser-proof steps in each sprint row before moving to trust hardening work.

## Key links

- `AGENTS.md`
- `docs/CANONICAL.md`
- `docs/CANONICAL_REPORT.md`
- `docs/ROADMAP.md`
- `docs/SPRINT.md`
- `docs/BACKLOG.md`
- `docs/DECISIONS.md`

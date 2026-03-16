# Project status

Last updated: 2026-03-17

## Goal

Deliver Pnyx as a Finland-first public political accountability product with trustworthy politician, promise, and party-context surfaces.

## Active milestone

**M2: Public discovery implementation** (see `docs/ROADMAP.md`).

## Current state

- The old always-on `ai/` repository OS has been removed from the repo and replaced with an opt-in `PLAN` / `DO` / `RUNSPRINT` / `REVIEW` contract.
- Backend moderation and proposal flows exist in `src/` and `test/`.
- A public Frontend V3 already exists in `frontend/` with routes for `/`, `/politicians`, `/politicians/:id`, `/parties`, `/parties/:id`, `/promises/:id`, `/methodology`, and optional `/ops`.
- `docs/FRONTEND_V3_SPEC.md` is now absorbed into the Finland-first, party-aware public discovery target.
- The active gap is implementation: route-shell and placeholder party pages now exist, while home/directory refresh, party-context detail surfaces, and browser verification remain unfinished.

## Top blockers

1. Current backend APIs expose politicians/statements only, so party pages must begin with honest unknown states or frontend-local placeholder structures.
2. Home and politician-directory copy still reflect the older politician-first scope rather than the Finland-first public discovery target.
3. Frontend verification for the overhaul is not yet wired into focused regression coverage.

## Next actions

1. Continue `RUNSPRINT` with `S-12` to refresh home and politician-directory surfaces for Finland-first public discovery.
2. Land `S-13` after the directory refresh to add party-context blocks to politician, promise, and methodology pages.
3. Close `S-14` with static proof plus browser verification before moving to trust hardening work.

## Key links

- `AGENTS.md`
- `docs/CANONICAL.md`
- `docs/CANONICAL_REPORT.md`
- `docs/ROADMAP.md`
- `docs/SPRINT.md`
- `docs/BACKLOG.md`
- `docs/DECISIONS.md`

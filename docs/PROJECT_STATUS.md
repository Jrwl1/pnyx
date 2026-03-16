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
- The active gap is verification: route-shell, home/directory refresh, and detail-page party context are now implemented, while final static proof and browser verification remain unfinished.

## Top blockers

1. Current backend APIs still expose politicians/statements only, so party and party-line surfaces must continue relying on honest unknown states or frontend-local placeholders.
2. The sprint still needs one clean full-slice static proof pass captured under `S-14`.
3. Browser verification across the public routes is still outstanding and may expose bounded same-area regressions.

## Next actions

1. Continue `RUNSPRINT` with `S-14` to capture the final static proof and browser verification across Home, Politicians, Parties, and Methodology.
2. Fix any bounded same-area frontend regressions revealed by `S-14` before closing the sprint.
3. Move to trust hardening work only after `S-14` closes with clean verification evidence.

## Key links

- `AGENTS.md`
- `docs/CANONICAL.md`
- `docs/CANONICAL_REPORT.md`
- `docs/ROADMAP.md`
- `docs/SPRINT.md`
- `docs/BACKLOG.md`
- `docs/DECISIONS.md`

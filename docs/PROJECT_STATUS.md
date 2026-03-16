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
- Sprint rows `S-11` through `S-14` are complete: the public discovery slice is implemented, statically proved, and browser-verified across Home, Politicians, Parties, and Methodology.

## Top blockers

1. No blockers remain inside the completed public-discovery sprint queue.
2. Backend party, membership, and stance APIs are still future follow-up work, but they are no longer blocking the shipped honest unknown-state slice.
3. A future `PLAN` pass is still needed to roll the completed slice into the next milestone queue and close out roadmap/backlog status.

## Next actions

1. Run `PLAN` to roll the completed public-discovery slice into roadmap/backlog status and open the next executable queue.
2. Prioritize M3 trust, moderation, and release-readiness work now that the public slice is verified.
3. Schedule backend-ready follow-up work for canonical parties, memberships, and party stances when that delivery track is ready.

## Key links

- `AGENTS.md`
- `docs/CANONICAL.md`
- `docs/CANONICAL_REPORT.md`
- `docs/ROADMAP.md`
- `docs/SPRINT.md`
- `docs/BACKLOG.md`
- `docs/DECISIONS.md`

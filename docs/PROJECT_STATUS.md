# Project status

Last updated: 2026-03-18

## Goal

Deliver Pnyx as a Finland-first public political accountability product with trustworthy politician, promise, and party-context surfaces, then harden it into a sustainable post-launch service.

## Active milestone

**M8: Post-launch product hardening, automation, and growth** is now active, and `docs/SPRINT.md` is re-based around `S-32` through `S-37`.

## Current state

- M0 through M7 are complete in code and accepted sprint evidence: public discovery, contribution flows, canonical parties, canonical promises, claim canonization, trust records, launch-safe email auth, editorial ops, browser regression coverage, release rehearsal, and final launch audit all landed.
- `S-32` is complete in code and review evidence: the legacy `/auth/token` path is gone, protected party and canonical-promise admin surfaces now exist at `/ops/admin`, public promise discovery now has `/promises`, and Playwright coverage exercises the new routes.
- The launch regression floor remains `pnpm seed:launch-rehearsal`, `pnpm launch:coverage`, `pnpm proof:launch`, and `pnpm smoke:release`.
- The next implementation gap is now the `S-33` through `S-37` queue: SEO metadata, explicit event and notification infrastructure, moderation ergonomics, Finland-first ingest, and post-launch proof refresh.
- The active execution queue now starts with `S-33` SEO and search-preview work.

## Top blockers

1. SEO metadata and search-preview tags are still missing from the widened public surface.
2. Event-backed retention metrics, notification infrastructure, and user preference surfaces are still planned but unimplemented.
3. Contributor reputation, deeper moderation ergonomics, and Finland-first ingest remain ahead in the active queue.

## Next actions

1. Execute `S-33` next and keep the row order in `docs/SPRINT.md` deterministic.
2. Hold the existing launch proof chain as the regression floor while expanding post-launch coverage.
3. Re-baseline roadmap, backlog, and release docs only through accepted sprint evidence; do not open a parallel planning system.

## Key links

- `AGENTS.md`
- `docs/CANONICAL.md`
- `docs/CANONICAL_REPORT.md`
- `docs/ROADMAP.md`
- `docs/SPRINT.md`
- `docs/BACKLOG.md`
- `docs/DECISIONS.md`

# Project status

Last updated: 2026-03-18

## Goal

Deliver Pnyx as a Finland-first public political accountability product with trustworthy politician, promise, and party-context surfaces, then harden it into a sustainable post-launch service.

## Active milestone

**M8: Post-launch product hardening, automation, and growth** is now active, and `docs/SPRINT.md` is re-based around `S-32` through `S-37`.

## Current state

- M0 through M7 are complete in code and accepted sprint evidence: public discovery, contribution flows, canonical parties, canonical promises, claim canonization, trust records, launch-safe email auth, editorial ops, browser regression coverage, release rehearsal, and final launch audit all landed.
- The launch regression floor remains `pnpm seed:launch-rehearsal`, `pnpm launch:coverage`, `pnpm proof:launch`, and `pnpm smoke:release`.
- The next implementation gap is no longer launchability. It is post-launch completeness: removing leftover auth debt, exposing missing admin and public surfaces, shipping SEO metadata, adding explicit event and notification infrastructure, improving moderation ergonomics, and automating Finland-first ingest.
- The active execution queue now starts with `S-32` debt retirement and missing-surface delivery before it moves into SEO, metrics and notifications, reputation, ingest, and proof refresh work.

## Top blockers

1. Legacy shared-secret `/auth/token` still exists as implementation debt even though public auth now uses email codes.
2. Backend-supported party-admin and direct canonical-promise operations are not yet fully reachable through protected product UI, and public promise discovery still lacks a dedicated browse route.
3. SEO metadata, notifications, event-backed retention metrics, contributor reputation, and Finland-first ingest are planned but unimplemented.

## Next actions

1. Execute `S-32` first and keep the row order in `docs/SPRINT.md` deterministic.
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

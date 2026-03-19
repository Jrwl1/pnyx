# Project status

Last updated: 2026-03-18

## Goal

Deliver Pnyx as a Finland-first public political accountability product with trustworthy politician, promise, and party-context surfaces, then harden it into a sustainable post-launch service.

## Active milestone

**M8: Post-launch product hardening, automation, and growth** is now active, and `docs/SPRINT.md` is re-based around `S-32` through `S-37`.

## Current state

- M0 through M7 are complete in code and accepted sprint evidence: public discovery, contribution flows, canonical parties, canonical promises, claim canonization, trust records, launch-safe email auth, editorial ops, browser regression coverage, release rehearsal, and final launch audit all landed.
- `S-32` is complete in code and review evidence: the legacy `/auth/token` path is gone, protected party and canonical-promise admin surfaces now exist at `/ops/admin`, public promise discovery now has `/promises`, and Playwright coverage exercises the new routes.
- `S-33` is complete in code and review evidence: the public surface now emits route-level title, description, canonical, Open Graph, and Twitter metadata, the frontend build generates `robots.txt` and `sitemap.xml`, and Playwright verifies the metadata on the widened public route set.
- `S-34` is complete in code and review evidence: append-only `product_events` now cover auth, contribution, moderation, and editorial flows; notification preferences and inbox APIs exist; an authenticated `/notifications` surface is live; metrics and traceability docs now reference explicit event and notification data; and the route is covered in Playwright.
- `S-35` is complete in code and review evidence: contributor reputation now has schema-backed scoring and backfill helpers, both moderation queues surface submitter risk summaries and high-risk priority filters, and Playwright covers the new queue controls.
- `S-36` is complete in code and review evidence: Finland-first ingest now has official-source adapters for Eduskunta vote data and an official SDP stance article, raw/stage provenance tables, apply or reject operator controls at `/ops/imports`, a repeatable CLI trigger, regression coverage, and browser verification for the protected ingest route.
- The launch regression floor remains `pnpm seed:launch-rehearsal`, `pnpm launch:coverage`, `pnpm proof:launch`, and `pnpm smoke:release`.
- The next implementation gap is now `S-37`: post-launch proof refresh and final release evidence.
- The active execution queue now starts with `S-37` proof refresh.

## Top blockers

1. The widened post-launch proof refresh still remains ahead in the active queue.
2. Remaining work is now concentrated in proof, seeded coverage, workflow wiring, and release evidence rather than product-surface gaps.
3. No new ingest blocker remains ahead of the final proof-refresh row.

## Next actions

1. Execute `S-37` next and keep the row order in `docs/SPRINT.md` deterministic.
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

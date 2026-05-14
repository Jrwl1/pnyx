# Project status

Last updated: 2026-03-19

## Goal

Deliver Pnyx as a Finland-first public political accountability product with trustworthy politician, promise, and party-context surfaces, then harden it into a sustainable post-launch service.

## Active milestone

**M8: Post-launch product hardening, automation, and growth** is complete in accepted sprint evidence across `S-32` through `S-37`.

## Current state

- M0 through M7 are complete in code and accepted sprint evidence: public discovery, contribution flows, canonical parties, canonical promises, claim canonization, trust records, launch-safe email auth, editorial ops, browser regression coverage, release rehearsal, and final launch audit all landed.
- `S-32` is complete in code and review evidence: the legacy `/auth/token` path is gone, protected party and canonical-promise admin surfaces now exist at `/ops/admin`, public promise discovery now has `/promises`, and Playwright coverage exercises the new routes.
- `S-33` is complete in code and review evidence: the public surface now emits route-level title, description, canonical, Open Graph, and Twitter metadata, the frontend build generates `robots.txt` and `sitemap.xml`, and Playwright verifies the metadata on the widened public route set.
- `S-34` is complete in code and review evidence: append-only `product_events` now cover auth, contribution, moderation, and editorial flows; notification preferences and inbox APIs exist; an authenticated `/notifications` surface is live; metrics and traceability docs now reference explicit event and notification data; and the route is covered in Playwright.
- `S-35` is complete in code and review evidence: contributor reputation now has schema-backed scoring and backfill helpers, both moderation queues surface submitter risk summaries and high-risk priority filters, and Playwright covers the new queue controls.
- `S-36` is complete in code and review evidence: Finland-first ingest now has official-source adapters for Eduskunta vote data and an official SDP stance article, raw/stage provenance tables, apply or reject operator controls at `/ops/imports`, a repeatable CLI trigger, regression coverage, and browser verification for the protected ingest route.
- `S-37` is complete in code and review evidence: seeded rehearsal coverage now includes notifications, contributor reputation, and ingest staging; traceability and metrics docs were corrected to the post-launch proof chain; CI and release rehearsal workflows seed before proof; and the final proof path passed with isolated smoke on `3016`.
- The post-launch regression floor is now `pnpm seed:launch-rehearsal`, `pnpm launch:coverage`, `pnpm proof:postlaunch` (with `pnpm proof:launch` retained as an alias), and `pnpm smoke:release`.
- No active sprint rows remain in `docs/SPRINT.md`.

## Top blockers

1. No active sprint blocker remains inside the accepted `S-32..S-37` queue.
2. The next repo action is planning, not implementation, if the user wants a new milestone or backlog slice.
3. Roadmap re-baselining is the next doc task if post-M8 scope is opened.

## Next actions

1. Keep the post-launch proof chain as the regression floor for future changes.
2. Start the next cycle with `PLAN` if new scope is selected.
3. Preserve the accepted `S-32..S-37` evidence as the baseline for any future milestone rebase.

## Key links

- `AGENTS.md`
- `docs/CANONICAL.md`
- `docs/CANONICAL_REPORT.md`
- `docs/ROADMAP.md`
- `docs/SPRINT.md`
- `docs/BACKLOG.md`
- `docs/DECISIONS.md`

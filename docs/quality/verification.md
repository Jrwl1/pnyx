# Verification

Last checked: 2026-05-16

## Standard proof commands

Use the narrowest command set that proves the change, then broaden for high-risk work.

- Backend or domain logic: `pnpm test`
- Backend types: `pnpm typecheck`
- Frontend types: `pnpm frontend:typecheck`
- Frontend build and SEO artifacts: `pnpm frontend:build`
- Browser/UI behavior: `pnpm test:ui`
- E2E API config: `pnpm test:e2e`
- Full post-launch proof: `pnpm proof:postlaunch`
- Launch/release compatibility alias: `pnpm proof:launch`
- Rehearsal seed: `pnpm seed:launch-rehearsal`
- Rehearsal coverage: `pnpm launch:coverage`
- Live smoke: `SMOKE_BASE_URL=http://127.0.0.1:<port> pnpm smoke:release`
- Harness docs: `pnpm docs:check`
- Research pulse proof: `pnpm test -- test/research-watchlist.test.ts test/research-ollama.test.ts test/research-pulse.test.ts test/ingest.test.ts`
- Local Ollama health, when Ollama is installed: `pnpm ollama:health`

## Evidence expectations

When changing product behavior, record:

- files changed;
- commands run and results;
- browser routes checked when UI changes;
- known gaps or unverified areas;
- whether docs truth changed.

## Page-readiness proof

M9/M10 work should prove:

- data/API readiness state;
- page rendering of readiness, freshness, provenance, and missing-data calls to action;
- submission or ingest path into review;
- review outcome path to public page;
- comment/report moderation path when participation is involved.

## Release proof

Release proof continues to use:

- `pnpm seed:launch-rehearsal`
- `pnpm launch:coverage`
- `pnpm proof:postlaunch`
- `pnpm smoke:release`

See `docs/quality/release-readiness.md` for operational details.

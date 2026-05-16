# Repository truth

Last checked: 2026-05-16

## Purpose

This repo is the active mature Pnyx implementation at `C:\Users\john\aios\Pnyx`. It is a Finland-first public political accountability service, not the earlier `C:\Users\john\Pnyx` Next/Nest MVP line.

## Current stack

- Backend: TypeScript, Express, `better-sqlite3`, JWT, `tsx`, migration files under `migrations/`.
- Frontend: React 18, Vite, React Router, TypeScript.
- Tests: Vitest, Supertest, Playwright.
- Package manager: pnpm workspace.
- Database: SQLite via `DB_PATH`, with forward migrations tracked by `schema_migrations`.

This is verified by `package.json`, `frontend/package.json`, `src/server.ts`, `frontend/src/App.tsx`, `migrations/`, and `test/`.

## Important commands

- `pnpm dev`: backend dev server.
- `pnpm frontend:dev`: Vite frontend dev server.
- `pnpm migrate`: apply SQLite migrations.
- `pnpm test`: backend/unit integration tests.
- `pnpm test:e2e`: e2e Vitest config.
- `pnpm test:ui`: Playwright browser tests.
- `pnpm frontend:typecheck`: frontend typecheck.
- `pnpm frontend:build`: generate SEO artifacts and build frontend.
- `pnpm proof:postlaunch`: full proof chain.
- `pnpm proof:launch`: alias for `proof:postlaunch`.
- `pnpm seed:launch-rehearsal`: seed rehearsal data.
- `pnpm launch:coverage`: verify rehearsal coverage.
- `pnpm smoke:release`: live backend smoke check.
- `pnpm ingest:run`: run official-source ingest CLI.
- `pnpm research:pulse`: run the local research watch pulse through the ingest CLI.
- `pnpm ollama:health`: verify the local Ollama endpoint and extraction model.

## Current working model

The old repository protocol modes have been retired. Agents should no longer route work through the old mode-command system. The active system is a harness-style documentation map:

- `AGENTS.md` is the short map.
- `docs/index.md` is the documentation index.
- Truth lives in focused domain docs.
- Historical protocol files live under `docs/archive/legacy-protocol/`.

## Non-truth and local state

- `.serena/` is local tool state.
- Archived sprint/worklog/canonical files are historical evidence, not live instructions.
- Chat history is not product truth unless it is copied into repo docs.

## Known doc state after harness migration

- M8 is complete by accepted sprint evidence and current `docs/product/milestones.md`.
- The old root `docs/ROADMAP.md`, `docs/BACKLOG.md`, `docs/SPRINT.md`, and `docs/WORKLOG.md` were moved to `docs/archive/legacy-protocol/`.
- The temporary post-launch plan was moved into the archive because its M8 scope has already landed.

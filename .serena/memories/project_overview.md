# Pnyx project overview

Pnyx is a Finland-first public political accountability product. The current canonical goal is trustworthy public surfaces for politicians, parties, promises, party context, contribution flows, moderation/editorial ops, notifications, contributor reputation, and official-source ingest with provenance.

Tech stack: TypeScript monorepo-ish pnpm workspace. Backend is Express 4 on Node/tsx with better-sqlite3, migrations under `migrations/`, source under `src/`, and tests under `test/` using Vitest, Supertest, and Playwright. Frontend is React 18 + Vite + React Router under `frontend/`.

Rough structure:
- `src/server.ts`: main Express API and route wiring.
- `src/auth/**`: email-code auth, JWT/session context, role guards.
- `src/db/**`: data helpers for canonical promises, party graph, trust records, notifications, product events, ingest, reputation.
- `src/ingest/**`: official-source ingest adapters, CLI, staging/apply flow.
- `frontend/src/App.tsx`: route table; public routes include `/`, `/politicians`, `/parties`, `/promises`, `/methodology`; protected routes include contribution, notifications, `/ops`, `/ops/admin`, `/ops/imports`, `/ops/records`, `/ops/claims`.
- `docs/**`: canonical planning and evidence docs. `AGENTS.md` controls PLAN/DO/RUNSPRINT/REVIEW protocols.

Current canonical state as of 2026-03 docs: M0-M7 are complete, M8 post-launch hardening has accepted sprint evidence through S-37, and no active sprint rows remain. Next repo action is planning if new scope is opened.
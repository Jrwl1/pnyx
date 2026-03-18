# Security audit note

- **Timestamp:** 2026-03-18
- **PR / Commit:** pending-local

## Files reviewed

- .github/workflows/release-rehearsal.yml

## Context

- Added a manual release-rehearsal workflow for the launch proof chain and release smoke path.
- The workflow starts the app against a temporary database and runs the smoke-release script.

## Findings

- No new secrets were committed to the repo.
- Workflow secrets remain environment-driven through job env or repository secret configuration.
- The workflow executes the repo-managed proof chain before smoke rehearsal.

## Evidence

- `.github/workflows/release-rehearsal.yml`
- `package.json`
- `docs/RELEASE_READINESS_RUNBOOK.md`

## Fix / mitigations

- The workflow uses a temporary database path under `runner.temp`.
- The service only runs long enough to satisfy health and smoke checks.
- Failure output includes the captured `server.log`.

## Tests

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm frontend:typecheck`
- `pnpm frontend:build`
- `pnpm test:ui`
- `pnpm proof:launch`
- `pnpm smoke:release`

## Verdict

Verdict: SHIP

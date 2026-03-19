# Security audit note

- **Timestamp:** 2026-03-19
- **PR / Commit:** pending-local

## Files reviewed

- .github/workflows/ci-proof.yml
- .github/workflows/release-rehearsal.yml
- package.json

## Context

- Widened the proof path from launch-only assumptions to the current post-launch stack.
- Added rehearsal seed and coverage steps ahead of the proof chain in CI and release rehearsal.
- Introduced `proof:postlaunch` as the explicit post-launch proof command.

## Findings

- No new secrets were committed to the repo.
- Workflow changes still rely on repo-managed commands and temporary runner-local SQLite databases.
- The added seed and coverage steps operate against repo-managed fixtures and do not require unmanaged network state.

## Evidence

- `.github/workflows/ci-proof.yml`
- `.github/workflows/release-rehearsal.yml`
- `package.json`
- `test/helpers/launch-rehearsal.ts`

## Fix / mitigations

- The workflows now make the seeded post-launch state explicit before the proof chain runs.
- Proof continues to depend on the checked-in test suite, browser suite, and build steps rather than ad hoc verification.

## Tests

- `pnpm seed:launch-rehearsal`
- `pnpm launch:coverage`
- `pnpm proof:postlaunch`
- `pnpm smoke:release`

## Verdict

Verdict: SHIP

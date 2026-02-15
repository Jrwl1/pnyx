TEST_STRATEGY.md — Proof Plan

WHAT IT DO? Defines stack-specific proof commands, required test layers, and coverage targets needed before V1 lock and sprint closeout.

## Stack and tooling decisions (V1)

- Language/runtime: TypeScript.
- Test runner: Vitest.
- HTTP testing: Supertest (Express/Fastify) or framework-native test client.
- Database for integration/e2e: ephemeral Postgres using Docker Compose or Testcontainers.

## Minimum checks required every sprint

Run all checks that exist for the selected stack. Concrete placeholders to wire into package scripts:

- Lint: `pnpm lint` (or `npm run lint`)
- Typecheck: `pnpm typecheck` (or `npm run typecheck`)
- Unit+integration: `pnpm test` (or `npm test`)
- E2E: `pnpm test:e2e` (or `npm run test:e2e`)
- Build/package: `pnpm build` (or `npm run build`)

Suggested DB lifecycle commands:

- Docker Compose path: `docker compose up -d postgres-test` then `pnpm test:integration` and `docker compose down -v`.
- Testcontainers path: `pnpm test:integration` (container lifecycle managed by tests).

Evidence rule:
- For each reported pass, record command and summarized result in WORKLOG with commit hash.

## Required test layers

- Unit:
  - services/business rules (status transitions, downgrade reason requirement, duplicate normalization/hash generation, vote overwrite behavior, rate-limit policy evaluation).
- Integration:
  - repository/DB behavior with migrations applied.
  - unique constraints and lifecycle filters (duplicate claim key, one vote row per user/statement, soft-delete and pending-delete visibility defaults).
- E2E:
  - auth + add statement + vote + moderator status update + admin approve delete.

## Regression coverage (required)

- Politician identity and dedupe
  - create politician success
  - duplicate by externalId -> 409
  - duplicate by normalized name+region+office -> 409
- Statement capture
  - create statement requires politicianId/sourceUrl/body/dateSaid
  - create with unknown politician -> 404
  - duplicate statement key `(politicianId, normalizedTextHash, sourceUrl)` -> 409
  - list ordering by dateSaid DESC, createdAt DESC, id ASC
- Verification lifecycle
  - allowed transitions only (`pending->verified|disputed|rejected`, `verified->disputed|rejected`, `disputed->verified`, `rejected->disputed`)
  - missing reason on downgrade transition -> validation error
  - disallowed/no-op transition -> 409
  - status change writes audit row with reason when required
- Voting
  - authenticated vote success with value support/oppose
  - second vote by same user updates existing vote row (overwrite)
  - anonymous vote -> 403
  - aggregate updated correctly after overwrite
- Delete and visibility lifecycle
  - author withdraw soft-deletes statement
  - moderator propose delete sets pending flag
  - admin approve delete requires pending state
  - public lists exclude deleted and pending-delete by default
  - moderator/admin lists include pending-delete by default and exclude deleted by default
- Rate limiting
  - login/register/add-statement/vote/global fallback limits trigger 429 with clear message

## Auth negative tests (required)

- Anonymous denied for add politician, add statement, vote, edit, withdraw.
- User denied for set verification status, propose delete, approve delete.
- Moderator denied for approve delete.

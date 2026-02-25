ARCHITECTURE.md — Boundaries + Module Responsibilities

WHAT IT DO? Documents implemented runtime boundaries, module ownership, request lifecycle, and cross-cutting controls for the current V1 service.

## Runtime shape

- Single-process TypeScript Node service using Express and SQLite (`better-sqlite3`).
- Startup path:
  1) `src/index.ts` applies migrations
  2) `src/index.ts` starts HTTP server
- Database model is migration-driven (`migrations/0001..0003.sql`) and loaded by `src/db/migrate.ts`.

## Folder and module boundaries

- `src/index.ts`
  - Process entrypoint; no business logic.
- `src/server.ts`
  - HTTP wiring and route handlers.
  - Business rules (validation, lifecycle state checks, dedupe checks, optimistic locking, audit writes).
  - In-memory fixed-window rate limiting.
- `src/auth/context.ts`
  - Converts bearer JWT into `req.auth` context; invalid token becomes `anonymous`.
- `src/auth/jwt.ts`
  - Signs and verifies JWT payload (`userId`, `role`).
- `src/auth/role-guard.ts`
  - Minimum-role middleware for protected routes.
- `src/db/client.ts`
  - Creates SQLite connection, sets WAL mode, exports singleton `db` handle.
- `src/db/migrate.ts`
  - Applies new SQL files exactly once via `schema_migrations` table.
- `src/types/roles.ts`
  - Role type and role ordering for access checks.
- `migrations/*.sql`
  - Source-of-truth for persisted schema.
- `test/*.test.ts`
  - Behavior/regression coverage across role gates, lifecycle transitions, and moderation operations.

## Request lifecycle

1. Request enters Express JSON middleware.
2. `authContext` resolves caller role from `Authorization: Bearer <jwt>`.
3. Global limiter executes (`app.use(globalLimiter)`).
4. Route-specific limiter (when configured) executes.
5. Role guard middleware (`requireRole`) enforces minimum role.
6. Handler validates inputs and business state.
7. Handler runs SQL reads/writes; proposal mutation paths use SQLite transactions for atomicity.
8. Handler returns JSON response with explicit status codes.

## Data ownership and consistency boundaries

- **API layer (`src/server.ts`) owns domain rules**
  - lifecycle transition validity
  - dedupe behavior
  - moderation reason taxonomy
  - optimistic locking
- **Database owns structural constraints**
  - PK/unique/check constraints
  - generated canonical keys
  - proposal/audit indexes
- **Transaction boundaries**
  - proposal claim/release/review flows execute in explicit DB transactions.
  - canonical create + proposal review update are committed atomically in review path.

## Cross-cutting concerns

- **Authentication**
  - JWT-based request auth only; no header spoof role trust.
- **Authorization**
  - role hierarchy enforced centrally by `requireRole`.
- **Abuse control**
  - in-memory fixed-window rate limiters with per-route buckets and global fallback.
- **Auditability**
  - proposal lifecycle actions are audit logged (`politician_proposal_audits`).
  - statement lifecycle actions currently audited for create/edit/verification.
- **Error handling style**
  - deterministic `400/403/404/409/429` for known branches.
  - `500` fallback for unexpected failures.

## Test architecture alignment

- Tests use in-memory SQLite (`DB_PATH=:memory:`) with migrations applied once per run.
- `test/helpers/auth.ts` obtains signed JWT headers via `POST /auth/token`.
- Role-matrix and moderation-ops suites enforce authorization and lifecycle behaviors across anonymous/user/moderator/admin paths.

## Operational characteristics and limits

- No background worker/queue process; all moderation operations are synchronous request/response.
- No distributed/shared rate-limit store; limiter state is process-local memory.
- No ORM/repository abstraction; SQL is embedded in route handlers.
- No structured logging pipeline yet; server emits startup log only.

## Non-goals (current V1 architecture)

- Microservice split for auth/moderation/read APIs.
- External cache or distributed lock manager.
- Public third-party API gateway.
- Async job orchestration for moderation actions.

## Decisions and follow-up areas

- Keep schema-first + direct SQL approach until V1 closeout.
- Keep lock-safe scope: architecture changes should not alter V1 behavior without accepted CR.
- If decomposition is needed in later milestones, record decision proposals in `ai/memory/DECISIONS.md` before refactor.

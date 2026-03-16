API_CONTRACT.md — Internal Interface Contract (Implemented V1)

WHAT IT DO? Defines the current internal HTTP contract implemented in `src/server.ts`, including auth gates, request/response semantics, and error/rate-limit behavior used by tests.

## Scope

- V1 exposes internal backend endpoints only (no external/public API contract).
- Paths and semantics below reflect the implemented service (`src/server.ts`) rather than hypothetical `/internal/*` routes.

## Auth model

- `anonymous`: read-only routes without guard middleware.
- `user`: baseline authenticated writes.
- `moderator`: user privileges plus moderation actions.
- `admin`: moderator privileges plus admin-only delete approval.

Role enforcement model:
- `requireRole("user")` allows `user|moderator|admin`.
- `requireRole("moderator")` allows `moderator|admin`.
- `requireRole("admin")` allows only `admin`.

## Error contract

- `400`: validation failure (missing/invalid fields, unsupported filters, invalid reason taxonomy).
- `401`: invalid token grant input for `POST /auth/token`.
- `403`: authenticated but insufficient role or blocked policy action (for example privileged self-assignment on register or invalid CAPTCHA token).
- `404`: target not found on read/write paths that require existing resources.
- `409`: lifecycle/version/duplicate conflict.
- `429`: rate-limit exceeded (`{ error: "rate_limited", message, retryAfterSeconds }`).
- `500`: internal server failure fallback.

## Rate limiting (runtime defaults)

Global behavior:
- Global limiter applies to all routes first.
- In `NODE_ENV=test`, rate limiting is disabled unless header `x-enable-rate-limit-test: 1` is provided.
- Optional test scoping header `x-rate-limit-test-key` isolates counters.

Default windows and maxima (`RATE_LIMIT_WINDOW_MS` default `60000`):
- `global`: `RATE_LIMIT_GLOBAL_MAX` default `500`
- `login`: `RATE_LIMIT_LOGIN_MAX` default `30`
- `register`: `RATE_LIMIT_REGISTER_MAX` default `20`
- `add-statement`: `RATE_LIMIT_ADD_STATEMENT_MAX` default `60`
- `politician-proposal`: `RATE_LIMIT_POLITICIAN_PROPOSAL_MAX` default `20`
- `politician-create`: `RATE_LIMIT_POLITICIAN_CREATE_MAX` default `40`
- `proposal-claim`: `RATE_LIMIT_PROPOSAL_CLAIM_MAX` default `60`
- `proposal-review`: `RATE_LIMIT_PROPOSAL_REVIEW_MAX` default `80`
- `proposal-assist`: `RATE_LIMIT_PROPOSAL_ASSIST_MAX` default `100`
- `vote`: `RATE_LIMIT_VOTE_MAX` default `120`

CAPTCHA enforcement knobs:
- `CAPTCHA_ENFORCE_REGISTER` (`1` enables register CAPTCHA checks)
- `CAPTCHA_ENFORCE_PROPOSAL_SUBMIT` (`1` enables proposal-submit CAPTCHA checks for eligible callers)
- `CAPTCHA_STATIC_TOKEN` (deterministic verifier token used by current implementation)
- Test-mode enforcement toggle header: `x-enable-captcha-test: 1`

## Endpoint contract

### Auth

#### `POST /auth/token`
- Auth: none
- Rate limit: `login`
- Body: `{ userId: string, role: "user"|"moderator"|"admin", secret: string }`
- `200`: `{ token: string }`
- Errors:
  - `401` invalid/missing credentials or wrong secret
  - `400` invalid role value

#### `POST /auth/register`
- Auth: none
- Rate limit: `register`
- Body: `{ email: string, role?: string, captchaToken?: string }`
- `201`: `{ id: string, email: string, role: "user" }`
- Policy:
  - public registration always creates `user`
  - requested `moderator|admin` is rejected (not normalized)
  - when CAPTCHA enforcement is enabled, request must include valid `captchaToken`
- Errors:
  - `400` missing email, unknown role string, or missing required captcha token
  - `403` privileged role request via public register
  - `403` invalid captcha token
  - `409` duplicate email

### Service health

#### `GET /health`
- Auth: any
- `200`: `{ ok: true }`

#### `GET /abuse/metrics`
- Auth: `moderator|admin`
- `200`: `{ captcha: { register, proposalSubmit }, rateLimit: { [rule]: { allowed, blocked } }, generatedAt }`
- Notes:
  - Captcha counters expose `checked`, `passed`, `failed`, `missing`, `skipped`.
  - Rate-limit counters expose per-rule `allowed` and `blocked` totals.

### Canonical politicians

#### `GET /politicians`
- Auth: any
- `200`: `{ items: Array<{ id, name, region, office, externalId, verified, createdAt }> }`
- Visibility: excludes soft-deleted canonical rows (`deleted_at IS NULL`)

#### `POST /politicians`
- Auth: `admin`
- Rate limit: `politician-create`
- Body: `{ name: string, region?: string, office?: string, externalId?: string }`
- `201`: `{ id: number }`
- Errors:
  - `400` missing name
  - `409` duplicate canonical identity
  - `500` insert failure fallback

### Politician proposals (moderated intake)

#### `POST /politician-proposals`
- Auth: `user|moderator|admin` (guard minimum `user`)
- Rate limit: `politician-proposal`
- Body: `{ name: string, region?: string, office?: string, externalId?: string, sourceNote?: string, captchaToken?: string }`
- `201`: `{ id: number, status: "pending" }`
- Side effects:
  - insert proposal row
  - append proposal audit action `submitted`
  - when caller role is `user` and CAPTCHA enforcement is enabled, validates captcha token before proposal insert
- Errors:
  - `400` missing/blank name or missing required captcha token
  - `403` invalid captcha token
  - `409` duplicate canonical identity or duplicate pending proposal

#### `GET /politician-proposals`
- Auth: `user|moderator|admin`
- Query:
  - `status`: `pending|approved|rejected|duplicate|all`
  - `assignee`: `unassigned|me|<actorId>` (moderator/admin only)
  - `ageBucket`: `lt1h|1to24h|gt24h`
  - `sort`: `asc|desc` (default `desc`)
  - `page`: integer >= 1 (default `1`)
  - `pageSize`: integer >= 1, max `100` (default `20`)
- Visibility:
  - `user` receives only `submitted_by = req.auth.userId`
  - `moderator|admin` can query across queue
- `200`: `{ items, page, pageSize, total }`
- Errors:
  - `400` invalid filter values or assignee filter by non-moderator

#### `GET /politician-proposals/metrics`
- Auth: `moderator|admin`
- `200`:
  - `{ pending: { total, assigned, unassigned }, ageBuckets: { lt1h, oneTo24h, gt24h } }`

#### `POST /politician-proposals/:id/claim`
- Auth: `moderator|admin`
- Rate limit: `proposal-claim`
- Body: `{ expectedVersion?: number }`
- `200`: `{ ok: true, assigneeId: string, reviewVersion: number }`
- Semantics:
  - only `pending` proposals are claimable
  - idempotent if already claimed by same actor
  - optimistic lock via `review_version` when `expectedVersion` supplied
- Errors:
  - `400` invalid id/version input
  - `404` proposal missing
  - `409` not pending, claimed by another moderator, or version conflict

#### `POST /politician-proposals/:id/release`
- Auth: `moderator|admin`
- Rate limit: `proposal-claim`
- Body: `{ expectedVersion?: number }`
- `200`: `{ ok: true, reviewVersion: number }`
- Semantics:
  - assignee can release own claim; admin can release any claim
  - requires pending + currently claimed
- Errors:
  - `400` invalid id/version input
  - `403` non-admin releasing another moderator claim
  - `404` proposal missing
  - `409` not pending/not claimed/version conflict

#### `PATCH /politician-proposals/:id/review`
- Auth: `moderator|admin`
- Rate limit: `proposal-review`
- Body:
  - `{ decision: "approve"|"reject"|"duplicate", reason?: string, reasonCode?: string, linkedPoliticianId?: number, expectedVersion?: number }`
- `200`: `{ ok: true, status: "approved"|"rejected"|"duplicate", politicianId: number|null, reviewVersion: number }`
- Semantics:
  - only pending proposals can be reviewed
  - claimed proposal can only be reviewed by assignee (admin override allowed)
  - `reject` requires reasonCode from reject taxonomy
  - `duplicate` requires reasonCode from duplicate taxonomy
  - `approve` forbids reasonCode
  - optimistic lock enforced when `expectedVersion` provided
  - writes proposal audit row with action/reason/reasonCode
- Errors:
  - `400` invalid decision/reason taxonomy/version
  - `404` proposal not found or linked politician missing
  - `409` status conflict, claim conflict, or version conflict

#### `GET /politician-proposals/:id/duplicate-assist`
- Auth: `moderator|admin`
- Rate limit: `proposal-assist`
- `200`: `{ proposalId, canonicalMatches, pendingProposalMatches, fuzzyHints: { canonical, pendingProposals } }`
- Match semantics:
  - deterministic exact matching (`externalId` and normalized key)
  - deterministic bounded fuzzy hints for triage scoring only
  - no automatic merge/approval side effects
- `404` when proposal is missing

#### `GET /politician-proposals/:id/audits`
- Auth: `moderator|admin`
- Query:
  - `actorId?`, `action?`, `status?`, `fromDate?`, `toDate?`, `page?`, `pageSize?`
- `200`: `{ items, page, pageSize, total }`
- Errors:
  - `400` invalid action/status filter
  - `404` proposal missing

### Statements and lifecycle

#### `GET /statements`
- Auth: any
- `200`: `{ items }`
- Visibility defaults:
  - anonymous/user exclude pending-delete and deleted rows
  - moderator/admin include pending-delete rows, still exclude deleted rows

#### `GET /statements/:id`
- Auth: any
- `200`: `{ id, politicianId, sourceUrl, body, dateSaid, verificationStatus, authorId, createdAt, updatedAt, aggregate, revisionCount, revisionHistoryUrl }`
- `404` if not found, deleted, or hidden by pending-delete visibility for caller role

#### `POST /statements`
- Auth: `user|moderator|admin`
- Rate limit: `add-statement`
- Body: `{ politicianId: number, sourceUrl: string, body: string, dateSaid: string }`
- `201`: `{ id: number, verificationStatus: "pending" }`
- Side effects:
  - inserts statement row with fingerprint dedupe
  - appends revision audit `createStatement`
- Errors:
  - `400` required fields missing
  - `404` politician missing
  - `409` duplicate statement

#### `PATCH /statements/:id`
- Auth: `user|moderator|admin`
- Body: `{ body?: string, sourceUrl?: string, dateSaid?: string }`
- `200`: `{ ok: true, updatedAt: string }`
- Semantics:
  - at least one patch field required
  - author may edit own statement within 30 minutes of creation
  - moderator/admin may edit any non-deleted statement
  - duplicate fingerprint conflicts are rejected
  - appends revision audit `editStatement`
- Errors:
  - `400` invalid patch payload or empty patched values
  - `403` edit window/ownership violation
  - `404` statement missing/deleted
  - `409` duplicate statement conflict

#### `PATCH /statements/:id/verification`
- Auth: `moderator|admin`
- Body: `{ newStatus: "pending"|"verified"|"disputed"|"rejected", reason?: string }`
- `200`: `{ ok: true }`
- Implemented transition map:
  - `pending -> verified|disputed|rejected`
  - `verified -> disputed|rejected`
  - `disputed -> verified|rejected`
  - `rejected -> pending`
- Reason requirement:
  - required for confidence-lowering transitions (ranked comparison)
- Side effects:
  - updates `verification_status`
  - appends revision audit with `change_type = 'verification_status'`
- Errors:
  - `400` required downgrade reason missing
  - `404` statement missing/deleted
  - `409` invalid status value, invalid transition, or no-op transition

#### `POST /statements/:id/votes`
- Auth: `user|moderator|admin`
- Rate limit: `vote`
- Body: `{ value: "support"|"oppose" }`
- `200`: `{ ok: true, aggregate: { support: number, oppose: number } }`
- Semantics:
  - upsert by `(statement_id, user_id)` (recast overwrites)
- Errors:
  - `400` invalid vote value
  - `404` statement missing/deleted

#### `POST /statements/:id/pending-delete`
- Auth: `moderator|admin`
- `200`: `{ ok: true }`
- Side effects:
  - sets `pending_delete = 1`
  - appends revision audit with `change_type = 'pendingDeleteStatement'`
- Errors:
  - `404` statement missing/deleted

#### `POST /statements/:id/withdraw`
- Auth: `user|moderator|admin`
- `200`: `{ ok: true }`
- Semantics:
  - only author may withdraw
  - sets `withdrawn_at`, `deleted_at`, clears `pending_delete`
- Side effects:
  - appends revision audit with `change_type = 'withdrawStatement'`
- Errors:
  - `403` caller is not author
  - `404` statement missing/deleted

#### `POST /statements/:id/approve-delete`
- Auth: `admin`
- `200`: `{ ok: true }`
- Semantics:
  - requires `pending_delete = 1`
  - sets `deleted_at`, clears `pending_delete`
- Side effects:
  - appends revision audit with `change_type = 'approveDeleteStatement'`
- Errors:
  - `409` not pending delete (including missing id)

#### `GET /statements/:id/revisions`
- Auth: any
- `200`: `{ items: Array<{ id, statementId, actorId, changeType, fromValue, toValue, reason, createdAt }> }`
- Ordering: `id ASC`
- Errors:
  - `404` statement missing/deleted

## Versioning and change control

- Behavior is pinned to locked V1 scope; lock changes require accepted CR and dependent doc updates.
- Contract changes that alter role gates, lifecycle semantics, status/error behavior, or rate-limit policy must be reflected in `ai/planning/V1_SPEC_LOCK.md` via protocol.

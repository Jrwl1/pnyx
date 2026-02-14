API_CONTRACT.md — Internal Interface Contract (V1)

WHAT IT DO? Defines testable internal UI<->backend operations for V1 (no public API), with role auth, inputs/outputs, and 403/404/409 behavior.

## Scope

- No external/public API in V1.
- Interfaces are internal only (`ui -> backend`).
- Contract is written in HTTP-like operation form because it is directly testable.

## Auth model (role gates)

- `anonymous`: read-only.
- `user`: read + add politician + add statement + vote + edit own statement within grace window + withdraw own statement.
- `moderator`: all user actions + edit any statement + set verification status + propose delete.
- `admin`: all moderator actions + approve delete.

## Error contract

- `403 FORBIDDEN`: authenticated user exists but lacks permission for requested action.
- `404 NOT_FOUND`: target resource does not exist or is not readable in current lifecycle state.
- `409 CONFLICT`: uniqueness/rule conflict (duplicate politician identity, duplicate statement, duplicate vote, invalid lifecycle transition, no-op status update).

## Internal operations

### OP-001 List politicians
- Method/path: `GET /internal/politicians`
- Auth: `anonymous|user|moderator|admin`
- Input:
  - query optional: `q`, `region`, `office`, `limit`, `cursor`
- Output `200`:
  - `{ items: PoliticianSummary[], nextCursor?: string }`

### OP-002 Add politician (CAP-002)
- Method/path: `POST /internal/politicians`
- Auth: `user|moderator|admin`
- Input body:
  - `{ name: string, region?: string, office?: string, externalId?: string }`
- Output `201`:
  - `{ id: string, createdAt: string }`
- Errors:
  - `403` when role is anonymous.
  - `409` when canonical identity collides (`externalId` or normalized `name+region+office`).

### OP-003 Get politician statements
- Method/path: `GET /internal/politicians/{politicianId}/statements`
- Auth: `anonymous|user|moderator|admin`
- Input:
  - path: `politicianId`
  - query optional: `includeDeleted=false`
- Output `200`:
  - `{ items: StatementListItem[] }`
- Ordering rule:
  - `dateSaid DESC`, then `createdAt DESC`, then `id ASC`.
- Errors:
  - `404` when politician does not exist.

### OP-004 Add statement (CAP-003)
- Method/path: `POST /internal/statements`
- Auth: `user|moderator|admin`
- Input body:
  - `{ politicianId: string, sourceUrl: string, body: string, dateSaid: string }`
- Output `201`:
  - `{ id: string, verificationStatus: "pending" }`
- Side effects:
  - creates statement with `verificationStatus=pending`.
  - creates `RevisionAudit(changeType=createStatement)`.
- Errors:
  - `403` for anonymous.
  - `404` when politician not found.
  - `409` duplicate statement for same politician/date/body fingerprint (deny policy).

### OP-005 Edit statement (CAP-004)
- Method/path: `PATCH /internal/statements/{statementId}`
- Auth: `user|moderator|admin`
- Input body:
  - `{ sourceUrl?: string, body?: string, dateSaid?: string }`
- Output `200`:
  - `{ id: string, updatedAt: string }`
- Rules:
  - `user` may edit only own statement and only within 30 minutes of `createdAt`.
  - `moderator|admin` may edit any non-deleted statement.
  - every edit appends `RevisionAudit(changeType=editStatement)`.
- Errors:
  - `403` for out-of-window author edit or non-owner user.
  - `404` statement not found.

### OP-006 Set verification status (CAP-005)
- Method/path: `POST /internal/statements/{statementId}/verification-status`
- Auth: `moderator|admin`
- Input body:
  - `{ newStatus: "pending"|"verified"|"disputed", reason?: string }`
- Output `200`:
  - `{ id: string, verificationStatus: string, updatedAt: string }`
- Rules:
  - allowed transitions: `pending->verified|disputed`, `verified->disputed`, `disputed->verified`.
  - no-op transition (`newStatus` equals current) is conflict.
  - append `RevisionAudit(changeType=setVerificationStatus)`.
- Errors:
  - `403` for role below moderator.
  - `404` statement not found.
  - `409` invalid transition or no-op transition.

### OP-007 Vote on statement (CAP-006)
- Method/path: `POST /internal/statements/{statementId}/votes`
- Auth: `user|moderator|admin`
- Input body:
  - `{ value: "support"|"oppose" }`
- Output `201`:
  - `{ statementId: string, myVote: "support"|"oppose", aggregate: { support: number, oppose: number, score: number } }`
- Rules:
  - one vote per `(statementId,userId)` in V1.
  - duplicate create is rejected (no overwrite).
- Errors:
  - `403` anonymous cannot vote.
  - `404` statement not found (or soft deleted).
  - `409` duplicate vote by same user on same statement.

### OP-008 Withdraw statement (author)
- Method/path: `POST /internal/statements/{statementId}/withdraw`
- Auth: `user|moderator|admin`
- Input body: `{}`
- Output `200`: `{ id: string, deletedAt: string }`
- Rules:
  - `user` may withdraw only own statement.
  - withdraw performs immediate soft delete (`deletedAt` set) and appends `RevisionAudit(changeType=withdrawStatement)`.
- Errors:
  - `403` not owner.
  - `404` statement not found.

### OP-009 Propose delete (moderator)
- Method/path: `POST /internal/statements/{statementId}/pending-delete`
- Auth: `moderator|admin`
- Input body:
  - `{ reason?: string }`
- Output `200`: `{ id: string, pendingDelete: true }`
- Rules:
  - sets `pendingDelete=true`, stores actor/time, appends `RevisionAudit(changeType=proposeDelete)`.
- Errors:
  - `403` role below moderator.
  - `404` statement not found.
  - `409` already pending delete or already deleted.

### OP-010 Approve delete (admin)
- Method/path: `POST /internal/statements/{statementId}/approve-delete`
- Auth: `admin`
- Input body:
  - `{ reason?: string }`
- Output `200`: `{ id: string, deletedAt: string }`
- Rules:
  - requires `pendingDelete=true`.
  - sets `deletedAt/deletedBy`, clears `pendingDelete`, appends `RevisionAudit(changeType=approveDelete)`.
- Errors:
  - `403` role below admin.
  - `404` statement not found.
  - `409` statement not pending delete or already deleted.

### OP-011 List revision history (CAP-008)
- Method/path: `GET /internal/statements/{statementId}/revisions`
- Auth: `anonymous|user|moderator|admin`
- Input:
  - path: `statementId`
- Output `200`:
  - `{ items: RevisionAuditItem[] }`
- Ordering rule:
  - `createdAt DESC`, then `id DESC`.
- Errors:
  - `404` statement not found.

## Versioning strategy (V1)

- Contract version is pinned by the V1 spec lock document.
- Any contract change that affects operation behavior, auth gates, or 403/404/409 semantics requires lock doc update plus dependent planning doc updates.

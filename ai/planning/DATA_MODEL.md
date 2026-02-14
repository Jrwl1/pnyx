DATA_MODEL.md — Entities, Relationships, Invariants

WHAT IT DO? Defines V1 entities, fields, constraints, status lifecycle, and global invariants used by lock, requirements, flows, and tests.

## Enums

`verificationStatus` (closed set):
- `pending`
- `verified`
- `disputed`

`voteValue` (closed set):
- `support`
- `oppose`

`revisionChangeType` (closed set):
- `createStatement`
- `editStatement`
- `setVerificationStatus`
- `withdrawStatement`
- `proposeDelete`
- `approveDelete`

`statementDeletionState` (derived):
- Active: `withdrawnAt IS NULL AND pendingDelete=false AND deletedAt IS NULL`
- Pending delete: `pendingDelete=true AND deletedAt IS NULL`
- Soft deleted: `deletedAt IS NOT NULL`

## ENTITY: Politician

Purpose:
- Canonical identity record that statements are attributed to.

Fields:
- `id` (string/uuid, PK, required)
- `name` (string, required)
- `region` (string, nullable)
- `office` (string, nullable)
- `externalId` (string, nullable)
- `verified` (boolean, required, default `false`)
- `createdBy` (string/uuid, FK -> User.id, required)
- `createdAt` (datetime, required)
- `updatedAt` (datetime, required)
- `deletedAt` (datetime, nullable; soft delete marker, not used in normal V1 flows)

Relationships:
- One-to-many with `Statement` (`Politician.id` -> `Statement.politicianId`).

Index/constraints notes:
- PK: `id`.
- Unique: `externalId` where `externalId IS NOT NULL`.
- Unique canonical tuple: `(normalizedName, normalizedRegion, normalizedOffice)`.
- Normalization for canonical tuple: trim + lowercase; null `region/office` are treated as empty string in canonical key.
- Canonical dedupe precedence: if `externalId` is present, dedupe uses `externalId` first; otherwise uses canonical tuple.
- If create input has both `externalId` and canonical tuple and either collides with a different politician id, reject with conflict.

## ENTITY: Statement

Purpose:
- Time-stamped claim/quote tied to exactly one politician, with moderation and deletion lifecycle.

Fields:
- `id` (string/uuid, PK, required)
- `politicianId` (string/uuid, FK -> Politician.id, required)
- `sourceUrl` (string/url, required)
- `body` (string/text, required)
- `dateSaid` (date or datetime, required)
- `verificationStatus` (enum, required, default `pending`)
- `authorId` (string/uuid, FK -> User.id, required)
- `createdAt` (datetime, required)
- `updatedAt` (datetime, required)
- `withdrawnAt` (datetime, nullable)
- `withdrawnBy` (string/uuid, FK -> User.id, nullable)
- `pendingDelete` (boolean, required, default `false`)
- `pendingDeleteSetAt` (datetime, nullable)
- `pendingDeleteSetBy` (string/uuid, FK -> User.id, nullable)
- `deletedAt` (datetime, nullable)
- `deletedBy` (string/uuid, FK -> User.id, nullable)

Relationships:
- Many-to-one with `Politician`.
- One-to-many with `Vote`.
- One-to-many with `RevisionAudit`.

Index/constraints notes:
- PK: `id`.
- FK: `politicianId` required and must reference existing politician.
- FK: `authorId`, `withdrawnBy`, `pendingDeleteSetBy`, `deletedBy` must reference existing users when not null.
- Optional duplicate-protection index (recommended): `(politicianId, dateSaid, normalizedBodyHash)` for fast duplicate detection.
- `deletedAt IS NOT NULL` implies statement is excluded from normal list/read responses.

Verification status transition rules:
- Allowed transitions by role `moderator|admin` only:
  - `pending -> verified`
  - `pending -> disputed`
  - `verified -> disputed`
  - `disputed -> verified`
- Direct transitions to same status are rejected as conflict.
- Every successful status transition must create a `RevisionAudit` row with `changeType=setVerificationStatus`.

## ENTITY: Vote

Purpose:
- One user opinion on one statement for aggregate display.

Fields:
- `id` (string/uuid, PK, required)
- `statementId` (string/uuid, FK -> Statement.id, required)
- `userId` (string/uuid, FK -> User.id, required)
- `value` (enum `support|oppose`, required)
- `createdAt` (datetime, required)

Relationships:
- Many-to-one with `Statement`.
- Many-to-one with `User`.

Index/constraints notes:
- PK: `id`.
- Unique: `(statementId, userId)`.
- Duplicate vote policy for V1: second create for same `(statementId, userId)` is rejected (conflict), no overwrite.
- Votes are not accepted on soft-deleted statements.

## ENTITY: RevisionAudit

Purpose:
- Immutable history of statement creation/edits/status/delete actions (no silent edits).

Fields:
- `id` (string/uuid, PK, required)
- `statementId` (string/uuid, FK -> Statement.id, required)
- `actorId` (string/uuid, FK -> User.id, required)
- `changeType` (enum, required)
- `fromValue` (json/text, nullable)
- `toValue` (json/text, nullable)
- `reason` (string/text, nullable)
- `createdAt` (datetime, required)

Relationships:
- Many-to-one with `Statement`.
- Many-to-one with `User`.

Index/constraints notes:
- PK: `id`.
- FK: `statementId`, `actorId` required.
- Ordered display index: `(statementId, createdAt DESC, id DESC)`.
- Rows are append-only in V1 (no update/delete of audit rows).

## Global invariants

- `INV-001`: Every statement references exactly one existing politician (`Statement.politicianId` non-null FK).
- `INV-002`: Every statement has exactly one `verificationStatus` from `{pending, verified, disputed}`.
- `INV-003`: At most one vote exists per `(statementId, userId)`.
- `INV-004`: No silent statement lifecycle changes: create/edit/status/withdraw/propose-delete/approve-delete each produce at least one `RevisionAudit` record.
- `INV-005`: Politician canonical identity is unique. Dedupe precedence is `externalId` when present, else normalized `(name, region, office)`.

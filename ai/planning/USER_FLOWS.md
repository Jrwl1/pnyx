USER_FLOWS.md — Flows + Edge Cases

WHAT IT DO? Defines concrete V1 user flows with actors, preconditions, steps, expected results, error cases, and state transitions.

---

FLOW-001: View politicians and statements (CAP-001)
Actors:
- Any user (`anonymous|user|moderator|admin`).
Preconditions:
- None (empty-state allowed).
Steps:
1. User requests politician list.
2. System returns politician summaries.
3. User selects a politician.
4. System returns statements ordered by `dateSaid DESC`, then `createdAt DESC`, then `id ASC`.
5. User opens a statement detail page showing status and vote aggregate.
Expected result:
- User can browse politician and statement data in read-only mode.
Error cases:
- Invalid politician id -> `404`.
- Politician with no statements -> empty list.
Visibility defaults:
- `anonymous|user` lists exclude pending-delete and soft-deleted statements.
- `moderator|admin` lists include pending-delete by default and exclude soft-deleted by default unless `includeDeleted=true`.
State transitions:
- None (read-only).

---

FLOW-002: Add politician (CAP-002)
Actors:
- `user|moderator|admin`.
Preconditions:
- Actor authenticated.
Steps:
1. Actor submits `name`, optional `region`, `office`, optional `externalId`.
2. System normalizes identity fields and checks canonical dedupe precedence (`externalId` first, else name+region+office).
3. System creates politician.
4. System returns new politician id.
Expected result:
- New politician is persisted and listable.
Error cases:
- Anonymous actor -> `403`.
- Canonical duplicate -> `409`.
State transitions:
- Politician record created.

---

FLOW-003: Add statement (CAP-003)
Actors:
- `user|moderator|admin`.
Preconditions:
- Politician exists.
- Actor authenticated.
Steps:
1. Actor submits `politicianId`, `sourceUrl`, `body`, `dateSaid`.
2. System validates required fields and politician existence.
3. System normalizes body (trim, collapse whitespace, lowercase, normalize quotes/dashes) and computes hash.
4. System checks duplicate statement key `(politicianId, normalizedTextHash, sourceUrl)`.
5. System creates statement with `verificationStatus=pending`.
6. System appends `RevisionAudit(changeType=createStatement)`.
Expected result:
- Statement is visible in politician list and has initial revision history.
Error cases:
- Missing required input -> validation error.
- Unknown politician -> `404`.
- Anonymous actor -> `403`.
- Duplicate statement key -> `409` with clear duplicate message.
- Add-statement rate limit exceeded -> `429`.
State transitions:
- Statement created.
- Revision audit created.

---

FLOW-004: Set verification status (CAP-005)
Actors:
- `moderator|admin`.
Preconditions:
- Statement exists.
Steps:
1. Actor submits `newStatus` in `{pending, verified, disputed, rejected}`.
2. For downgrade transitions, actor provides reason.
3. System validates role and transition rule.
4. System updates statement status.
5. System appends `RevisionAudit(changeType=setVerificationStatus)` including reason when required.
Expected result:
- Status changes are visible on statement detail and history.
Error cases:
- Role below moderator -> `403`.
- Statement not found -> `404`.
- Invalid/no-op/forbidden transition -> `409`.
- Required downgrade reason missing -> validation error.
State transitions:
- `pending -> verified|disputed|rejected`, `verified -> disputed|rejected`, `disputed -> verified`, `rejected -> disputed`.

---

FLOW-005: Vote on statement (CAP-006)
Actors:
- `user|moderator|admin`.
Preconditions:
- Statement exists and is not soft deleted.
- Actor authenticated.
Steps:
1. Actor submits vote value `support` or `oppose`.
2. System upserts by `(statementId,userId)`.
3. If no prior vote exists, create vote; else overwrite `value` on existing row.
4. System returns updated aggregate `{support, oppose, score}`.
Expected result:
- User has exactly one current vote per statement and aggregate reflects latest vote.
Error cases:
- Anonymous actor -> `403`.
- Statement not found -> `404`.
- Vote rate limit exceeded -> `429`.
State transitions:
- Vote record created or updated.

---

FLOW-006: Edit statement (CAP-004)
Actors:
- Author (`user`) for own statements; `moderator|admin` for any statement.
Preconditions:
- Statement exists.
Steps:
1. Actor submits statement edits (`sourceUrl`, `body`, `dateSaid`).
2. System validates role and ownership/window rules.
3. System updates statement fields.
4. System appends `RevisionAudit(changeType=editStatement)`.
Expected result:
- Updated statement content is returned and audit trail is extended.
Error cases:
- Statement not found -> `404`.
- Author outside 30-minute window -> `403`.
- Non-owner user edit -> `403`.
State transitions:
- Statement content updated.
- Revision audit created.

---

FLOW-007: Withdraw / pending delete / approve delete (CAP-007)
Actors:
- Withdraw: statement author.
- Propose delete: `moderator|admin`.
- Approve delete: `admin`.
Preconditions:
- Statement exists.
Steps:
1. Author may call withdraw; system soft-deletes immediately and logs `withdrawStatement`.
2. Moderator may set pending delete; system sets `pendingDelete=true` and logs `proposeDelete`.
3. Admin may approve pending delete; system sets `deletedAt`, clears pending flag, and logs `approveDelete`.
Expected result:
- Statement deletion lifecycle is role-gated and fully auditable.
Error cases:
- Statement not found -> `404`.
- Unauthorized role for step -> `403`.
- Approve when not pending delete or already deleted -> `409`.
State transitions:
- Active -> Soft deleted (withdraw).
- Active -> Pending delete (propose).
- Pending delete -> Soft deleted (approve).

---

FLOW-008: View revision history (CAP-008)
Actors:
- Any user.
Preconditions:
- Statement exists.
Steps:
1. User opens statement detail.
2. System returns revision history ordered `createdAt DESC`, then `id DESC`.
Expected result:
- User can inspect full statement lifecycle history.
Error cases:
- Statement not found -> `404`.
State transitions:
- None (read-only).

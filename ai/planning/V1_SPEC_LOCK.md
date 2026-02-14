V1_SPEC_LOCK.md — LOCKED V1 SPEC (source of truth)

WHAT IT DO? Condensed V1 source of truth (CAP IDs). Only Coordinator edits; changes via CHANGE_REQUESTS. No product code until LOCKED.

Status: DRAFT (do not implement product features until LOCKED)
Locked at:
Lock rules:

- Only Coordinator can edit this file.
- Any change requires an Accepted entry in ai/memory/CHANGE_REQUESTS.md and corresponding updates to dependent planning docs.

---

In scope (V1)

- Politicians as canonical identities (manual add; optional `externalId`; `verified` flag).
- Statements tied to one politician with required `sourceUrl`, `body`, `dateSaid`; statement starts `pending`.
- Verification status lifecycle managed only by moderator/admin.
- One vote per user per statement with visible aggregate.
- Community review by status + votes only (no comments in V1).
- Transparent statement lifecycle history (revision/audit records visible to users).
- Roles:
  - Anonymous: read-only.
  - Registered user: add politician, add statement, vote, edit own within grace window, withdraw own.
  - Moderator: edit any, set verification status, propose delete.
  - Admin: moderator abilities + approve delete.

Out of scope (V1)

- Partisan opinion platform features (commentary, threads).
- Replacing or duplicating investigative journalism workflows.
- Real-time political news coverage or live feeds.
- Public API for third-party consumers.
- Import pipelines for politicians (V2).

Non-goals (from PITCH)

- Becoming a partisan opinion platform.
- Replacing investigative journalism.
- Providing real-time political news coverage.

Success criteria (measurable, V1)

- Number of tracked politicians and statements.
- Percent of statements with verification status assigned (`!= pending`).
- Active user engagement (votes, reviews).
- Retention of returning users.

---

Policy decisions resolved

- Duplicate statement handling: **deny with 409** (no auto-merge in V1).
- Duplicate vote handling: **deny with 409** (no overwrite in V1).
- Author edit grace window: **30 minutes** from statement creation.
- Verification statuses: `{pending, verified, disputed}`.
- Verification transitions: `pending->verified|disputed`, `verified->disputed`, `disputed->verified`.
- Canonical politician dedupe precedence: `externalId` when present; otherwise normalized `(name, region, office)`.

---

Key user flows

- FLOW-001: View politicians and statements (CAP-001).
- FLOW-002: Add politician (CAP-002).
- FLOW-003: Add statement (CAP-003).
- FLOW-004: Set verification status (CAP-005).
- FLOW-005: Vote on statement (CAP-006).
- FLOW-006: Edit statement (CAP-004).
- FLOW-007: Withdraw / pending delete / approve delete (CAP-007).
- FLOW-008: View revision history (CAP-008).

---

Data model (minimal)

- Politician: `id`, `name`, `region?`, `office?`, `externalId?`, `verified`, `createdBy`, `createdAt`, `updatedAt`, `deletedAt?`.
  - Uniqueness: `externalId` unique when present; canonical tuple unique when no externalId.
- Statement: `id`, `politicianId`, `sourceUrl`, `body`, `dateSaid`, `verificationStatus`, `authorId`, `createdAt`, `updatedAt`, `withdrawnAt?`, `pendingDelete`, `deletedAt?`.
- Vote: `id`, `statementId`, `userId`, `value(support|oppose)`, `createdAt`.
  - Uniqueness: one vote per `(statementId,userId)`.
- RevisionAudit: `id`, `statementId`, `actorId`, `changeType`, `fromValue`, `toValue`, `reason?`, `createdAt`.

Global invariants

- INV-001: Every statement has exactly one politician (FK).
- INV-002: Every statement has exactly one verification status from `{pending, verified, disputed}`.
- INV-003: At most one vote per `(statementId, userId)`.
- INV-004: No silent statement lifecycle edits; audited via immutable revision records.
- INV-005: Politician canonical identity uniqueness with dedupe precedence (`externalId` first).

---

API contract (V1)

- No external API in V1.
- Internal UI/backend operations are defined in `ai/planning/API_CONTRACT.md` with explicit auth and 403/404/409 behavior.

Auth summary:

- Read endpoints: anonymous and authenticated users.
- Write endpoints (add/edit/vote/withdraw): authenticated users.
- Verification status + pending delete: moderator/admin.
- Approve delete: admin only.

---

Proof (test strategy)

- Minimum checks per sprint: lint, typecheck, tests, build (exact command names depend on selected stack and are tracked in TEST_STRATEGY).
- Required regression coverage: politician add/list + dedupe; statement create/list ordering; verification transitions + audit; vote uniqueness + aggregate; edit window enforcement; withdraw/pending-delete/approve-delete flow; revision history visibility.
- No proof claims without commit hash in WORKLOG.

---

V1 Capabilities (condensed, unambiguous)

CAP-001: List and view politicians and statements
- Behavior: Read-only browse of politicians and associated statements; statement detail includes verification status, vote aggregate, and revision history access.
- Inputs/outputs: List queries and read ids only; returns politicians, statements, and statement detail.
- Edge cases: Invalid id -> 404; no statements -> empty list.
- References: REQ-006, FLOW-001, INV-001, INV-002.

CAP-002: Add politician
- Behavior: Authenticated user manually adds politician under canonical dedupe rules.
- Inputs/outputs: Input `name`, optional `region`, `office`, `externalId`; output new politician id.
- Edge cases: Anonymous -> 403; duplicate canonical identity -> 409.
- References: REQ-001, REQ-007, FLOW-002, INV-005.

CAP-003: Add statement
- Behavior: Authenticated user submits statement; system creates with `pending` status and initial revision.
- Inputs/outputs: Input `politicianId`, `sourceUrl`, `body`, `dateSaid`; output statement id.
- Edge cases: Missing required -> validation error; invalid politician -> 404; duplicate statement -> 409; anonymous -> 403.
- References: REQ-002, FLOW-003, INV-001, INV-002, INV-004.

CAP-004: Edit statement
- Behavior: Author can edit own within 30 minutes; moderator/admin can edit any non-deleted statement; every edit is audited.
- Inputs/outputs: Input `statementId` + patchable fields; output success + updated timestamp.
- Edge cases: Not found -> 404; outside window or unauthorized -> 403.
- References: REQ-009, FLOW-006, INV-004.

CAP-005: Set verification status
- Behavior: Moderator/admin sets status using allowed transitions only; change is audited.
- Inputs/outputs: Input `statementId`, `newStatus`, optional reason; output success.
- Edge cases: Not found -> 404; unauthorized -> 403; invalid/no-op transition -> 409.
- References: REQ-003, FLOW-004, INV-002, INV-004.

CAP-006: Vote on statement
- Behavior: Authenticated user casts one vote (`support|oppose`) per statement; aggregate visible.
- Inputs/outputs: Input `statementId`, `value`; output success + aggregate.
- Edge cases: Not found -> 404; anonymous -> 403; duplicate vote -> 409.
- References: REQ-004, FLOW-005, INV-003.

CAP-007: Soft-delete / withdraw / approve delete
- Behavior: Author withdraws own statement (immediate soft delete); moderator/admin can propose delete; admin approves pending delete.
- Inputs/outputs: Input `statementId` and optional reason for moderated steps; output success.
- Edge cases: Not found -> 404; unauthorized -> 403; invalid lifecycle state -> 409.
- References: REQ-008, FLOW-007, INV-004.

CAP-008: View revision history
- Behavior: Any user can view ordered statement revision/audit records.
- Inputs/outputs: Read-only by `statementId`; output revision list.
- Edge cases: Statement not found -> 404.
- References: REQ-005, FLOW-008, INV-004.

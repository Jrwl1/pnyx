V1_SPEC_LOCK.md — LOCKED V1 SPEC (source of truth)

WHAT IT DO? Condensed V1 source of truth (CAP IDs). Only Coordinator edits; changes via CHANGE_REQUESTS. No product code until LOCKED.

Status: LOCKED
Locked at: 2025-02-15
Lock rules:

- Only Coordinator can edit this file.
- Any change requires an Accepted entry in ai/memory/CHANGE_REQUESTS.md and corresponding updates to dependent planning docs.

---

In scope (V1)

- Politicians as canonical identities (admin create only; optional `externalId`; `verified` flag).
- Statements tied to one politician with required `sourceUrl`, `body`, `dateSaid`; statement starts `pending`.
- Verification status lifecycle managed only by moderator/admin.
- One vote row per user per statement with visible aggregate and vote overwrite on recast.
- Community review by status + votes only (no comments in V1).
- Transparent statement lifecycle history (revision/audit records visible to users).
- Lightweight rate limits on auth and write operations.
- CAPTCHA validation on abuse-prone intake paths (`/auth/register`, `/politician-proposals`) in enforced environments.
- Moderation duplicate-assist includes exact-match plus bounded fuzzy candidate hints (assistive-only).
- Roles:
  - Anonymous: read-only.
  - Registered user: submit politician proposals, add statement, vote, edit own within grace window, withdraw own.
  - Moderator: approve/reject/mark-duplicate politician proposals; edit any statement; set verification status; propose delete.
  - Admin: moderator abilities + create canonical politicians + approve delete.

Out of scope (V1)

- Partisan opinion platform features (commentary, threads).
- Replacing or duplicating investigative journalism workflows.
- Real-time political news coverage or live feeds.
- Public API for third-party consumers.
- Import pipelines for politicians (V2).
- Fuzzy auto-merge/auto-reject moderation decisions.
- External CAPTCHA vendor lock-in requirements (provider implementation can remain pluggable).

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

- Duplicate statement handling: **deny with 409** using exact normalized key `(politicianId, normalizedTextHash, sourceUrl)`.
- Duplicate matching policy: exact keys enforce dedupe conflicts; moderation duplicate-assist may include bounded fuzzy hints for triage only (never auto-reject/auto-merge).
- Duplicate vote handling: **one vote row per user/statement, recast overwrites existing vote**.
- Author edit grace window: **30 minutes** from statement creation.
- Verification statuses: `{pending, verified, disputed, rejected}`.
- Verification transitions: `pending->verified|disputed|rejected`, `verified->disputed|rejected`, `disputed->verified`, `rejected->disputed`.
- Mandatory downgrade reason: required for confidence-lowering transitions (`verified->disputed|rejected`, `pending->rejected`).
- Soft-delete visibility defaults:
  - public/user lists exclude `isDeleted=true` and pending-delete by default.
  - moderator/admin lists include pending-delete by default and exclude `isDeleted=true` by default.
  - explicit filters: `includeDeleted=true`, `includePendingDelete=true|false`.
- Canonical politician dedupe precedence: `externalId` when present; otherwise normalized `(name, region, office)`.
- Politician intake policy: users submit proposals; only admin can create canonical politician records directly or via approved proposals.
- Registration role policy: public `/auth/register` may only create `user`; privileged role requests (`moderator|admin`) are rejected.
- CAPTCHA policy: `/auth/register` and `/politician-proposals` require valid captcha verification when enforcement is enabled; missing/invalid captcha returns deterministic error responses.
- V1 rate limits:
  - login: `5/min` per IP and per account
  - register: `3/min` per IP
  - submit politician proposal: `5/hour` per user
  - create politician (admin only): `30/hour` per actor
  - add statement: `10/hour` per user
  - vote: `30/min` per user
  - global fallback: `100/5min` per IP
  - limit breaches return `429` with clear message.

---

Key user flows

- FLOW-001: View politicians and statements (CAP-001).
- FLOW-002: Submit politician proposal (CAP-002 intake).
- FLOW-003: Add statement (CAP-003).
- FLOW-004: Set verification status (CAP-005).
- FLOW-005: Vote on statement (CAP-006).
- FLOW-006: Edit statement (CAP-004).
- FLOW-007: Withdraw / pending delete / approve delete (CAP-007).
- FLOW-008: View revision history (CAP-008).
- FLOW-009: Moderator/admin review of politician proposal queue.

---

Data model (minimal)

- Politician: `id`, `name`, `region?`, `office?`, `externalId?`, `verified`, `createdBy`, `createdAt`, `updatedAt`, `deletedAt?`.
  - Uniqueness: `externalId` unique when present; canonical tuple unique when no externalId.
- PoliticianProposal: `id`, `submittedBy`, `name`, `region?`, `office?`, `externalId?`, `sourceNote?`, `status(pending|approved|rejected|duplicate)`, `decisionBy?`, `decisionReason?`, `linkedPoliticianId?`, `createdAt`, `updatedAt`, `decidedAt?`.
- Statement: `id`, `politicianId`, `sourceUrl`, `body`, `dateSaid`, `normalizedBodyHash`, `statementFingerprint`, `verificationStatus`, `authorId`, `createdAt`, `updatedAt`, `withdrawnAt?`, `pendingDelete`, `deletedAt?`.
- Vote: `id`, `statementId`, `userId`, `value(support|oppose)`, `createdAt`, `updatedAt`.
  - Uniqueness: one vote row per `(statementId,userId)`.
- RevisionAudit: `id`, `statementId`, `actorId`, `changeType`, `fromValue`, `toValue`, `reason?`, `createdAt`.

Global invariants

- INV-001: Every statement has exactly one politician (FK).
- INV-002: Every statement has exactly one verification status from `{pending, verified, disputed, rejected}`.
- INV-003: At most one vote row per `(statementId, userId)`.
- INV-004: No silent statement lifecycle edits; audited via immutable revision records.
- INV-005: Politician canonical identity uniqueness with dedupe precedence (`externalId` first).
- INV-006: Soft-delete and pending-delete list defaults are role-aware and explicit.
- INV-007: Canonical politician rows are only created by admin actions.
- INV-008: Every politician proposal has immutable decision metadata when status != `pending`.

---

API contract (V1)

- No external API in V1.
- Internal UI/backend operations are defined in `ai/planning/API_CONTRACT.md` with explicit auth, lifecycle defaults, rate limits, and 403/404/409/429 behavior.

Auth summary:

- Read endpoints: anonymous and authenticated users.
- Write endpoints (statement/vote/edit/withdraw): authenticated users.
- Politician proposal submit: authenticated users.
- Politician canonical create: admin only.
- Politician proposal review: moderator/admin.
- Verification status + pending delete: moderator/admin.
- Approve delete: admin only.

---

Proof (test strategy)

- Minimum checks per sprint: lint, typecheck, tests, build (TypeScript stack command placeholders are defined in TEST_STRATEGY).
- Required regression coverage: politician add/list + dedupe; statement create/list ordering + exact duplicate key; verification transitions + downgrade reason + audit; vote overwrite + aggregate; edit window enforcement; withdraw/pending-delete/approve-delete flow; revision history visibility; rate-limit 429 behavior.
- Required regression coverage: politician add/list + dedupe; statement create/list ordering + exact duplicate key; verification transitions + downgrade reason + audit; vote overwrite + aggregate; edit window enforcement; withdraw/pending-delete/approve-delete flow; revision history visibility; captcha enforcement + bypass resistance; duplicate-assist deterministic fuzzy hints; rate-limit 429 behavior.
- No proof claims without commit hash in WORKLOG.

---

V1 Capabilities (condensed, unambiguous)

CAP-001: List and view politicians and statements
- Behavior: Read-only browse of politicians and associated statements; statement detail includes verification status, vote aggregate, and revision history access.
- Inputs/outputs: List queries and read ids only; returns politicians, statements, and statement detail.
- Edge cases: Invalid id -> 404; no statements -> empty list.
- References: REQ-006, FLOW-001, INV-001, INV-002, INV-006.

CAP-002: Politician proposal intake + moderated canonical create
- Behavior: Registered users submit politician proposals; moderator/admin review queue decisions are preserved, and canonical politician records are created by admin actions under dedupe rules.
- Inputs/outputs: Proposal input `name`, optional `region`, `office`, `externalId`, optional note; review action `approve|reject|duplicate` with optional decision reason; approval outputs linked canonical politician id.
- Edge cases: Anonymous submit/review -> 403; user direct canonical create -> 403; duplicate canonical identity on approve/create -> 409; unknown proposal -> 404.
- References: REQ-001, REQ-007, FLOW-002, FLOW-009, INV-005, INV-007, INV-008.

CAP-003: Add statement
- Behavior: Authenticated user submits statement; system creates with `pending` status and initial revision.
- Inputs/outputs: Input `politicianId`, `sourceUrl`, `body`, `dateSaid`; output statement id.
- Edge cases: Missing required -> validation error; invalid politician -> 404; duplicate statement -> 409; anonymous -> 403; rate-limited -> 429.
- References: REQ-002, REQ-010, FLOW-003, INV-001, INV-002, INV-004.

CAP-004: Edit statement
- Behavior: Author can edit own within 30 minutes; moderator/admin can edit any non-deleted statement; every edit is audited.
- Inputs/outputs: Input `statementId` + patchable fields; output success + updated timestamp.
- Edge cases: Not found -> 404; outside window or unauthorized -> 403.
- References: REQ-009, FLOW-006, INV-004.

CAP-005: Set verification status
- Behavior: Moderator/admin sets status using allowed transitions only; required downgrade reasons are audited.
- Inputs/outputs: Input `statementId`, `newStatus`, optional/required reason by transition; output success.
- Edge cases: Not found -> 404; unauthorized -> 403; invalid/no-op transition -> 409.
- References: REQ-003, FLOW-004, INV-002, INV-004.

CAP-006: Vote on statement
- Behavior: Authenticated user casts one vote (`support|oppose`) per statement; recast overwrites prior vote; aggregate visible.
- Inputs/outputs: Input `statementId`, `value`; output success + aggregate.
- Edge cases: Not found -> 404; anonymous -> 403; rate-limited -> 429.
- References: REQ-004, REQ-010, FLOW-005, INV-003.

CAP-007: Soft-delete / withdraw / approve delete
- Behavior: Author withdraws own statement (immediate soft delete); moderator/admin can propose delete; admin approves pending delete.
- Inputs/outputs: Input `statementId` and optional reason for moderated steps; output success.
- Edge cases: Not found -> 404; unauthorized -> 403; invalid lifecycle state -> 409.
- References: REQ-008, FLOW-007, INV-004, INV-006.

CAP-008: View revision history
- Behavior: Any user can view ordered statement revision/audit records.
- Inputs/outputs: Read-only by `statementId`; output revision list.
- Edge cases: Statement not found -> 404.
- References: REQ-005, FLOW-008, INV-004.

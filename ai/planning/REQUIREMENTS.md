REQUIREMENTS.md — Functional Requirements + Acceptance Criteria

WHAT IT DO? Defines V1 functional requirements with testable acceptance criteria, priority, and alignment to CAP/FLOW/INV decisions.

---

REQ-001: Politician identity catalog
Description:
- System stores canonical politician identities for statement attribution and discovery.
Acceptance criteria:
- AC1: System can create and list politicians with required fields `id`, `name`, `createdAt`.
- AC2: Canonical identity dedupe uses `externalId` when present, otherwise normalized `(name, region, office)`.
- AC3: Duplicate canonical identity is rejected with conflict.
Priority: Must
Notes: Aligns with INV-005 and CAP-002.

---

REQ-002: Statement capture
Description:
- System stores statements tied to one politician with source and date context.
Acceptance criteria:
- AC1: Create requires `politicianId`, `sourceUrl`, `body`, `dateSaid`.
- AC2: A created statement is initialized with `verificationStatus=pending`.
- AC3: Listing statements for one politician is ordered by `dateSaid DESC`, then `createdAt DESC`, then `id ASC`.
- AC4: Create writes an initial revision record (`changeType=createStatement`).
- AC5: Duplicate statement check in V1 uses exact normalized hash only:
  - normalize text with trim + collapsed whitespace + lowercase + quote/dash normalization.
  - reject duplicate claim key `(politicianId, normalizedTextHash, sourceUrl)`.
- AC6: Fuzzy matching is not used for rejection in V1; any V1.1 fuzzy mode is assistive-only UI and never auto-rejects.
Priority: Must
Notes: Aligns with INV-001, INV-002, INV-004 and CAP-003.

---

REQ-003: Verification status lifecycle
Description:
- Each statement has one verification status from a closed set with role-gated transitions.
Acceptance criteria:
- AC1: Allowed status values are exactly `pending`, `verified`, `disputed`, `rejected`.
- AC2: Only moderator/admin can change status.
- AC3: Allowed transitions are `pending->verified|disputed|rejected`, `verified->disputed|rejected`, `disputed->verified`, `rejected->disputed`; no-op transitions are rejected as conflict.
- AC4: Every status change writes a revision/audit entry.
- AC5: Reason is required for confidence-lowering transitions (`verified->disputed|rejected`, `pending->rejected`).
Priority: Must
Notes: Aligns with INV-002, INV-004 and CAP-005.

---

REQ-004: Voting semantics and aggregation
Description:
- Authenticated users can cast one vote per statement with deterministic meaning.
Acceptance criteria:
- AC1: Vote meaning is fixed as `support` or `oppose` for the statement claim.
- AC2: One vote row per `(statementId, userId)` is enforced.
- AC3: Submitting another vote by same user on same statement updates existing vote row (overwrite), not a second record.
- AC4: Statement detail exposes aggregate `{support, oppose, score}` after successful vote write.
- AC5: Anonymous vote attempts are forbidden.
Priority: Should
Notes: Aligns with INV-003 and CAP-006.

---

REQ-005: Revision history and no silent edits
Description:
- Statement lifecycle changes are transparently auditable and viewable.
Acceptance criteria:
- AC1: Create/edit/status/withdraw/propose-delete/approve-delete actions each append an audit row.
- AC2: Revision history view returns ordered records with actor, timestamp, change type, and before/after payload.
- AC3: Statement edits never replace content without an appended audit row.
- AC4: Required downgrade reasons are persisted in audit rows.
Priority: Must
Notes: Aligns with INV-004 and CAP-008.

---

REQ-006: Public read UX contract
Description:
- Any user can browse politicians and statements without authentication.
Acceptance criteria:
- AC1: Unauthenticated user can list politicians and list statements by politician.
- AC2: Statement detail shows verification status, vote aggregate, and revision history access.
- AC3: Read operations do not mutate data and do not require write permissions.
- AC4: Public and normal authenticated lists exclude soft-deleted statements by default.
Priority: Must
Notes: Aligns with CAP-001 and FLOW-001/FLOW-008.

---

REQ-007: Add politician capability (CAP-002)
Description:
- Registered users can manually add politician records under canonical dedupe rules.
Acceptance criteria:
- AC1: `user|moderator|admin` can add politician; anonymous cannot.
- AC2: On success, system returns new politician id and created timestamp.
- AC3: Duplicate canonical identity returns conflict.
Priority: Must
Notes: Direct CAP-002 coverage.

---

REQ-008: Withdraw and moderated delete workflow (CAP-007)
Description:
- Authors can withdraw their own statements; moderators can propose delete; admins can approve delete.
Acceptance criteria:
- AC1: Author withdraw performs immediate soft delete and logs audit entry.
- AC2: Moderator propose-delete sets `pendingDelete=true` and logs audit entry.
- AC3: Admin approve-delete requires pending delete and performs soft delete with audit entry.
- AC4: Unauthorized actor for each step is rejected with forbidden.
- AC5: Moderator/admin list views include `pendingDelete=true` statements by default but continue to exclude `isDeleted=true` by default.
Priority: Must
Notes: Direct CAP-007 coverage.

---

REQ-009: Edit window policy
Description:
- Edit permission for authors is bounded by a fixed grace window.
Acceptance criteria:
- AC1: Author may edit own statement only within 30 minutes from `createdAt`.
- AC2: Moderator/admin may edit any non-deleted statement outside author window.
- AC3: Author edit outside 30-minute window is forbidden.
Priority: Must
Notes: Resolves grace-window fork in lock-critical behavior; aligns with CAP-004.

---

REQ-010: Lightweight anti-abuse limits (V1)
Description:
- V1 enforces lightweight request rate limits on auth and write operations.
Acceptance criteria:
- AC1: Login is limited to `5/min` per IP and `5/min` per account identifier.
- AC2: Register is limited to `3/min` per IP.
- AC3: Add statement is limited to `10/hour` per authenticated user.
- AC4: Vote is limited to `30/min` per authenticated user.
- AC5: Global fallback limit is `100/5min` per IP.
- AC6: Limit breaches return `429` with clear retry message.
Priority: Must
Notes: CAPTCHA and stricter anti-abuse controls deferred to V1.1.

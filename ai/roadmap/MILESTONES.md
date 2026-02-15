MILESTONES.md — V0 → V1 Ladder (derived from locked V1)

WHAT IT DO? Vertical milestones from locked V1; each has acceptance criteria and proof commands. No spec change without CR.

Rule:
Milestones must not change V1 spec. If a milestone requires spec change, open a Change Request.

---

M0: V1 core implementation

Goal:
Deliver full V1 backend: app skeleton, data model, CAP-001..CAP-008, rate limits, and regression proof. One sprint (S0) implements M0.

Maps to V1 CAPs:
- CAP-001: List/view politicians and statements (read surfaces).
- CAP-002: Add politician (canonical dedupe).
- CAP-003: Add statement (exact duplicate key, pending).
- CAP-004: Edit statement (author window + mod/admin + audit).
- CAP-005: Set verification status (transitions + downgrade reason).
- CAP-006: Vote (one row per user/statement, overwrite, aggregate).
- CAP-007: Withdraw / pending delete / approve delete (role-aware visibility).
- CAP-008: View revision history.
- Rate limits: login, register, add-statement, vote, global fallback → 429.

Acceptance criteria:
- TypeScript service runs; migrations apply; role guards (anonymous/user/moderator/admin) wired.
- Politician create/list with dedupe (externalId first, else name/region/office); 409 on duplicate.
- Statement create/list with required fields, pending, exact duplicate key → 409.
- Edit policy: author 30-min window; moderator/admin any non-deleted; immutable RevisionAudit.
- Verification lifecycle: moderator/admin only; allowed transitions; downgrade reason required; audit.
- Vote: one row per (statement, user), recast overwrites; aggregate visible.
- Withdraw/pending-delete/approve-delete and list visibility defaults per V1_SPEC_LOCK.
- Revision history read by statement; 404 when not found.
- Rate limits enforced with clear 429 responses.
- Full regression: lint, typecheck, test, test:e2e, build green; review gate and closeout per protocol.

Proof commands required:
- `pnpm lint && pnpm typecheck && pnpm build`
- `pnpm test` (with -t filters per S0 tasks)
- `pnpm test:e2e`
- `git status --short` (clean at closeout)

Dependencies:
- V1_SPEC_LOCK.md LOCKED. No product code before lock.

Out-of-scope for M0:
- Public API (V1 has no external API).
- Fuzzy duplicate matching (V1.1).
- CAPTCHA hardening (V1.1).

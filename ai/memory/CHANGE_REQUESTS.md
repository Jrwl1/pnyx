CHANGE_REQUESTS.md — Spec Change Proposals (mid-build changes)

WHAT IT DO? Proposals to change V1_SPEC_LOCK. Only accepted entries allow Coordinator to edit lock. Tracks impact, risks, decision.

Rule:
Any change to V1_SPEC_LOCK must have an Accepted change request here.

Format:
CR-###: <title>

Proposed change:

Motivation:

Impacted V1 sections (CAP IDs):

Risks:

Testing/migration implications:

Decision: proposed / accepted / rejected

If accepted:

Spec updated in commit: <hash>

Docs updated: (list)

---

CR-001: Backfill VISION.md with explicit non-goals so lock checklist is satisfied

Proposed change: Add to ai/planning/VISION.md under "Non-goals (repeat here if needed):" the same non-goals as in PITCH and SCOPE (no partisan platform, no replacing journalism, no real-time news). Optionally fill "Success definition" and "Constraints" from PITCH/SCOPE so VISION is a single place for vision-level content.

Motivation: LOCK_CHECKLIST.md item 2 requires "VISION + SCOPE include explicit non-goals". SCOPE has out-of-scope and non-goals; VISION.md currently has the section header but no content. Until VISION includes explicit non-goals, the checklist is not fully true and V1_SPEC_LOCK status must remain DRAFT.

Impacted V1 sections (CAP IDs): None (doc-only).

Risks: None.

Testing/migration implications: None.

Decision: proposed

If accepted: Spec unchanged. Docs updated: ai/planning/VISION.md. After update, Coordinator may set V1_SPEC_LOCK status to LOCKED and add locked-at timestamp.

---

CR-002: Politician creation governance hardening (moderated queue)

Proposed change: Restrict canonical politician creation to moderator/admin only. Replace open user create flow with a moderated proposal queue where registered users can submit politician proposals and moderators/admins approve/reject/mark-duplicate.

Motivation: Reduce duplicate politician records and abuse potential while preserving community input.

Impacted V1 sections (CAP IDs): CAP-002, auth summary, role matrix, FLOW-002, data model, policy decisions, proof coverage.

Risks: Increased moderator workload; queue backlog risk; migration complexity for existing clients expecting direct create.

Testing/migration implications: Add proposal lifecycle endpoints/tests, update politician authorization tests, add register-role hardening tests, add migration for proposal tables/audit, and update rate-limit coverage for proposal/create paths.

Decision: accepted

If accepted:

Spec updated in commit: 2088788, dba6147

Docs updated: ai/planning/V1_SPEC_LOCK.md, ai/roadmap/MILESTONES.md, ai/roadmap/SPRINT.md, PROJECT_STATUS.md.

---

CR-003: V1.1 trust hardening (CAPTCHA + fuzzy duplicate assistive hints)

Proposed change: Add CAPTCHA validation to abuse-prone write paths (`POST /auth/register`, `POST /politician-proposals`) and upgrade moderation duplicate-assist to include bounded fuzzy candidate hints. Fuzzy output remains assistive-only (no auto-reject/auto-merge decisions).

Motivation: Reduce automated abuse pressure on public/intake paths and improve moderation throughput on near-duplicate identity review cases.

Impacted V1 sections (CAP IDs): CAP-002, CAP-003, CAP-006, CAP-008, policy decisions, proof coverage.

Risks: CAPTCHA friction for legitimate users, false-positive fuzzy suggestions if scoring/thresholds are poorly tuned, telemetry interpretation drift.

Testing/migration implications: Add captcha enforcement tests (required/missing/invalid/token bypass attempts), fuzzy duplicate assist determinism/ordering tests, abuse telemetry assertions, and invariant regression coverage for role/lifecycle/revision surfaces.

Decision: accepted

If accepted:

Spec updated in commit: ba995d3

Docs updated: ai/planning/V1_SPEC_LOCK.md, ai/roadmap/MILESTONES.md, ai/roadmap/SPRINT.md, PROJECT_STATUS.md.

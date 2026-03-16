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

---

CR-004: Admin-only canonical politician creation + local bootstrap helper

Proposed change: Tighten `POST /politicians` from `moderator|admin` to `admin` only, while keeping politician proposal review and statement creation behavior unchanged. Add a local-only bootstrap helper that seeds a predictable admin user and prints a ready-to-use JWT for development.

Motivation: Reduce the set of actors who can create canonical politician rows directly while keeping local development practical.

Impacted V1 sections (CAP IDs): CAP-002, role matrix, auth summary, policy decisions, proof coverage.

Risks: Slightly higher admin dependency for canonical create operations; tests and docs that assumed moderator create must be updated together.

Testing/migration implications: Update canonical-create authorization tests/setups, add bootstrap helper regression coverage, and sync the locked spec + traceability docs to the new role gate.

Decision: accepted

If accepted:

Spec updated in commit: 3f39f50

Docs updated: ai/planning/V1_SPEC_LOCK.md, ai/roadmap/MILESTONES.md, ai/planning/API_CONTRACT.md, ai/planning/DATA_MODEL.md, docs/TRACEABILITY_V1.md, PROJECT_STATUS.md.

---

CR-005: Finland-first party scope and stance separation

Proposed change: Expand locked public-product scope so the initial launch is Finland-only and includes party pages, party membership context, party stance records distinct from politician statements, and explicit surfacing of politician breaks from party stance when a mapped party stance exists. Keep home discovery search-first, allow latest promises/latest party stances, and defer public leaderboards until coverage and methodology are mature enough to avoid misleading comparisons.

Motivation: The product is meant to reflect how Finnish politics actually works. Party stance and politician stance are not interchangeable, and party-line discipline is part of the accountability story. A Finland-first rollout also keeps scope grounded before any cross-country expansion.

Impacted V1 sections (CAP IDs): CAP-001, CAP-002, public IA/discovery policy, data model, policy decisions, proof coverage; adds party read-surface capability and Finland launch boundary.

Risks: Scope growth, extra editorial/data-model complexity, historical party-membership edge cases, and misleading UX if party-line breaks are shown without a mapped stance source.

Testing/migration implications: Add planning for party entities, party membership, party stance records, party read surfaces, Finland-only scope guards/content, and party-line break derivation rules. Leaderboard/ranking surfaces remain deferred until later proof/coverage thresholds are defined.

Decision: accepted

If accepted:

Spec updated in commit: cdcc3cd

Docs updated: AGENTS.md, ai/planning/V1_SPEC_LOCK.md, ai/planning/DATA_MODEL.md, ai/roadmap/MILESTONES.md, PROJECT_STATUS.md, TASKS.md.

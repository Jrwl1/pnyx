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

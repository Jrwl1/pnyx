LOCK_CHECKLIST.md — Ready to Lock V1?

WHAT IT DO? Checklist to verify PITCH→REQs→flows→data→API→test→CAPs complete; then lock V1_SPEC_LOCK and log.

Checklist:

PITCH completed and matches intent

VISION + SCOPE include explicit non-goals

Every REQ has acceptance criteria

Every REQ maps to at least one FLOW

Data model defined with invariants (INV IDs)

API contract explicit (or explicitly absent)

Test strategy includes required proof commands

V1 spec condensed into CAP IDs with no critical TBDs

Milestones can be derived without inventing new scope

When all are true:

Set V1_SPEC_LOCK status to LOCKED and add timestamp.

Append WORKLOG entry with commit hash.

---

## Lock checklist run (2025-02-15)

| # | Item | Evidence | Verdict |
|---|------|----------|---------|
| 1 | PITCH completed and matches intent | ai/planning/PITCH.md: one-liner, user, problem, solution, success metrics, non-goals filled; aligns with V1 scope. | **PASS** |
| 2 | VISION + SCOPE include explicit non-goals | VISION.md: Non-goals section lists three (partisan platform, replacing journalism, real-time news). SCOPE.md: Out of scope lists same boundaries. | **PASS** |
| 3 | Every REQ has acceptance criteria | REQUIREMENTS.md: REQ-001..REQ-010 each have "Acceptance criteria:" and multiple ACs. | **PASS** |
| 4 | Every REQ maps to at least one FLOW | V1_SPEC_LOCK CAPs reference REQ + FLOW IDs; USER_FLOWS.md FLOW-001..FLOW-008 map to CAP-001..CAP-008; REQUIREMENTS cover all flows. | **PASS** |
| 5 | Data model defined with invariants (INV IDs) | DATA_MODEL.md: Politician, Statement, Vote, RevisionAudit entities; INV-001..INV-006 defined. | **PASS** |
| 6 | API contract explicit (or explicitly absent) | API_CONTRACT.md: Internal-only V1; auth by role; error contract 403/404/409/429; rate limits; operation-level inputs/outputs. | **PASS** |
| 7 | Test strategy includes required proof commands | TEST_STRATEGY.md: lint, typecheck, test, test:e2e, build; Vitest; unit/integration/e2e layers; evidence rule. | **PASS** |
| 8 | V1 spec condensed into CAP IDs with no critical TBDs | V1_SPEC_LOCK.md: CAP-001..CAP-008 with behavior, inputs/outputs, edge cases, references; policy decisions resolved; no critical TBD in scope. | **PASS** |
| 9 | Milestones can be derived without inventing new scope | ai/roadmap/MILESTONES.md exists; SPRINT.md S0 maps to CAP-001..CAP-008; M0 template allows derivation from locked V1. | **PASS** |

**Result: All items PASS.** Coordinator may set ai/planning/V1_SPEC_LOCK.md status to LOCKED, add "Locked at: <timestamp>", and append WORKLOG entry with commit hash.

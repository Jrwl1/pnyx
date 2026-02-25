TASKS.md — Backlog (planning + build)

WHAT IT DO? Backlog of planning steps and DO tasks. No prioritization here; order implies sequence.

Planning:

- [x] Fill PITCH.md
- [x] Define VISION.md and SCOPE.md
- [x] Write REQUIREMENTS.md (acceptance criteria for each)
- [x] Write USER_FLOWS.md (include error cases)
- [x] Write DATA_MODEL.md (entities + invariants)
- [x] Write API_CONTRACT.md (if applicable)
- [x] Write ARCHITECTURE.md (boundaries + folders)
- [x] Write TEST_STRATEGY.md
- [x] Run LOCK_CHECKLIST.md and lock V1_SPEC_LOCK.md

Roadmap:

- [x] Derive MILESTONES.md from locked V1
- [x] Set SPRINT.md for first milestone

DO (after lock):

- [x] Execute sprint via ai/workflows/DO_MODE.md

---

V1 backlog (from REQUIREMENTS + USER_FLOWS; implement after lock)

- REQ-001: Politician identity — proposal intake + moderated canonical create/list, canonical id (FLOW-001/FLOW-002/FLOW-009 dependency).
- REQ-002: Statement capture — create statement (politician, timestamp, body); list by politician (FLOW-003).
- REQ-003: Verification status — set/update status; store in history (FLOW-003).
- REQ-004: Voting — submit vote; aggregate visible; one per user per statement (FLOW-004).
- REQ-005: Revision history — store and expose edit/status history (FLOW-003, FLOW-004, FLOW-005).
- REQ-006: View politicians and statements — list politicians; list statements; statement detail + history + votes (FLOW-001, FLOW-005).
- FLOW-001: View politician and statements (read-only).
- FLOW-002: Submit politician proposal (registered user).
- FLOW-003: Set verification status (actor TBD).
- FLOW-004: Vote on statement.
- FLOW-005: View revision history.
- FLOW-009: Review politician proposal queue (moderator/admin).

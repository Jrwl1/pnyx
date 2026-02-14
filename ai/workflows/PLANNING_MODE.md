PLANNING_MODE.md — From Pitch to Locked V1

WHAT IT DO? Steps from PITCH → VISION/SCOPE → REQs/flows/data/API/arch/test → LOCK_CHECKLIST → locked V1_SPEC_LOCK. No product code before lock.

Goal:
Produce a locked ai/planning/V1_SPEC_LOCK.md that is unambiguous and testable, before any feature coding.

Allowed before lock:

OS docs (this system)

Tooling skeleton only if explicitly requested later (lint/test scaffolding), no product features.

Steps:

PITCH.md: elevator pitch filled.

VISION.md + SCOPE.md: define success + explicit non-goals.

REQUIREMENTS.md: numbered requirements with acceptance criteria.

USER_FLOWS.md: flows + error cases + state transitions.

DATA_MODEL.md: entities + relationships + invariants.

API_CONTRACT.md: only if there is an API (endpoints/events/interfaces). Otherwise explicitly state none.

ARCHITECTURE.md: boundaries, folder responsibilities, decisions needed.

TEST_STRATEGY.md: required proof commands + what must be tested.

Run LOCK_CHECKLIST.md; fix gaps.

Generate V1_SPEC_LOCK.md as condensed source of truth (CAP IDs).

Mark V1_SPEC_LOCK as LOCKED at the top with a timestamp.

Append a WORKLOG entry with commit hash anchoring the lock.

Lock rules:

Only Coordinator can edit V1_SPEC_LOCK.

Changes require an accepted entry in ai/memory/CHANGE_REQUESTS.md.

Exit criteria:

V1_SPEC_LOCK is locked.

Each requirement maps to at least one flow and at least one test category.

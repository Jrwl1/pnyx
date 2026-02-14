REQUIREMENTS.md — Functional Requirements + Acceptance Criteria

WHAT IT DO? Numbered requirements with acceptance criteria and priority. Each REQ maps to flows and test category.

Format:
REQ-001: <title>
Description:
Acceptance criteria:
AC1:
AC2:
Priority: Must / Should / Could
Notes:

Start listing requirements below.

---

REQ-001: Politician identity

Description: Store verified politician identities so statements can be attributed.

Acceptance criteria:
AC1: System can create and list politicians (minimal identity: name, stable id).
AC2: Each politician has a single canonical identity (no duplicates for same person in V1).

Priority: Must

Notes: Fields and source of truth for "verified" TBD in DATA_MODEL.

---

REQ-002: Statement capture

Description: Create and store statements tied to a politician with timestamp and content.

Acceptance criteria:
AC1: A statement has exactly one politician, a timestamp, and a body (text).
AC2: User can list statements for a given politician (ordered by time or relevance).
AC3: New statements are persisted and appear in list and in revision history.

Priority: Must

Notes: Who can create (actor) TBD; see OPEN QUESTIONS.

---

REQ-003: Verification status

Description: Each statement has a verification status from a defined set.

Acceptance criteria:
AC1: Every statement has exactly one verification status (e.g. unverified / verified / disputed; set TBD in DATA_MODEL).
AC2: Status can be updated; previous value is part of revision history.
AC3: Current status is visible wherever the statement is shown.

Priority: Must

Notes: Who can set/change status TBD; see OPEN QUESTIONS.

---

REQ-004: Voting on statements

Description: Users can vote on statements to signal agreement/disagreement or accuracy (semantic TBD).

Acceptance criteria:
AC1: A user can submit a vote on a statement (e.g. up/down or agree/disagree; schema TBD).
AC2: Aggregate vote outcome is visible (e.g. count or score) for the statement.
AC3: Vote is recorded and reflected in aggregates without requiring page reload (or within one refresh in V1).

Priority: Should

Notes: One vote per user per statement in V1 unless otherwise decided.

---

REQ-005: Revision history

Description: Edits to statements (and optionally status changes) are tracked; no silent edits.

Acceptance criteria:
AC1: For each statement, a history of changes (who, when, what changed) is stored.
AC2: Users can view revision history for a statement.
AC3: Edits do not overwrite without creating a history entry.

Priority: Must

Notes: Scope of "edits" (body only vs status, politician, etc.) TBD in DATA_MODEL.

---

REQ-006: View politicians and statements

Description: Users can discover and view politicians and their statements.

Acceptance criteria:
AC1: User can list politicians (e.g. by name or filter; minimal list in V1).
AC2: User can open a politician and see that politician’s statements with timestamp and verification status.
AC3: User can open a statement and see detail plus revision history and vote aggregate.

Priority: Must

Notes: Read-only flow; no auth required for view in V1 unless decided otherwise.

---

OPEN QUESTIONS

- Who is authorized to create statements and to set/change verification status? (REQ-002, REQ-003, SCOPE.)

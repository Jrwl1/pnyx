USER_FLOWS.md — Flows + Edge Cases

WHAT IT DO? Flows with actors, preconditions, steps, expected result, error cases, state transitions. Covers edge cases.

Format per flow:
FLOW-001: <name>
Actors:
Preconditions:
Steps:
Expected result:
Error cases:
State transitions:

List flows below.

---

FLOW-001: View politician and statements

Actors: Any user (unauthenticated or authenticated; V1 allows read without auth unless decided otherwise).

Preconditions: At least one politician exists (optional for empty state).

Steps:
1. User requests list of politicians.
2. System returns list (e.g. name, id).
3. User selects a politician.
4. System returns that politician’s statements with timestamp and verification status.
5. User may select a statement to see detail, revision history, and vote aggregate.

Expected result: User sees politicians and, for a chosen politician, statements with status and history; no data change.

Error cases: Invalid politician id → 404 or empty list. No statements → empty list, no error.

State transitions: None (read-only).

---

FLOW-002: Add statement

Actors: TBD (see OPEN QUESTIONS — e.g. curator, registered user, or import-only).

Preconditions: Politician exists; actor has permission to create statements (TBD).

Steps:
1. Actor submits new statement: politician id, body (text), optional timestamp (default now).
2. System validates required fields and politician existence.
3. System creates statement with initial verification status (e.g. unverified) and first revision entry.
4. System returns success and statement id (or redirect to statement view).

Expected result: Statement is stored, visible in politician’s statement list and in revision history.

Error cases: Missing politician id or body → validation error. Invalid politician id → 404 or validation error. Unauthorized → 403 (when auth is enforced).

State transitions: New statement created; one revision record created.

---

FLOW-003: Set verification status

Actors: TBD (e.g. moderator or curator; see OPEN QUESTIONS).

Preconditions: Statement exists; actor has permission to set status (TBD).

Steps:
1. Actor selects statement and chooses new verification status from allowed set.
2. System validates status value and permissions.
3. System updates statement status and appends revision entry (e.g. “status changed from X to Y”).
4. System returns success; UI shows updated status and updated history.

Expected result: Statement’s verification status updated; change visible in history and on statement view.

Error cases: Invalid status value → validation error. Statement not found → 404. Unauthorized → 403.

State transitions: Statement status changed; revision history appended.

---

FLOW-004: Vote on statement

Actors: User (authenticated in V1 if we require auth for voting; TBD).

Preconditions: Statement exists; user has not already voted (V1: one vote per user per statement unless decided otherwise).

Steps:
1. User selects statement and submits vote (e.g. up/down or agree/disagree; schema TBD).
2. System records vote and updates aggregate for that statement.
3. System returns success; UI shows updated aggregate.

Expected result: Vote is persisted; aggregate visible; user’s vote counted once.

Error cases: Statement not found → 404. Duplicate vote (same user, same statement) → 409 or overwrite policy (TBD). Unauthorized → 403 if auth required.

State transitions: Vote record created; statement aggregate updated.

---

FLOW-005: View revision history

Actors: Any user.

Preconditions: Statement exists.

Steps:
1. User opens statement detail.
2. User requests revision history (or it is shown by default).
3. System returns ordered list of changes (who, when, what changed).

Expected result: User sees full edit/status history; no silent edits.

Error cases: Statement not found → 404.

State transitions: None (read-only).

---

OPEN QUESTIONS

- Actors for FLOW-002 (add statement) and FLOW-003 (set verification status): role and permission model for V1 not yet defined. Resolve in SCOPE/REQUIREMENTS and DATA_MODEL.

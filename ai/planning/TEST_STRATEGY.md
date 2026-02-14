TEST_STRATEGY.md — Proof Plan

WHAT IT DO? Min checks per sprint (lint/typecheck/tests/build), regression rules, unit vs e2e. No proof without commit hash.

Define:

Minimum checks required for every sprint (lint/typecheck/tests/build)

- Lint: project’s linter must pass on changed code.
- Typecheck: if the stack is typed (e.g. TypeScript, typed Python), typecheck must pass.
- Tests: automated test suite must pass (unit and, where present, integration/e2e).
- Build: application build (or equivalent “runnable” artifact) must succeed.

What must have regression tests

- Politician identity: create, list, no duplicate identity (per REQ-001).
- Statement capture: create statement with politician + timestamp + body; list by politician (REQ-002).
- Verification status: set and update status; status visible and in history (REQ-003).
- Voting: submit vote; aggregate visible; one vote per user per statement if that is the rule (REQ-004).
- Revision history: every edit produces a history entry; history viewable (REQ-005).
- View flows: list politicians; list statements for politician; view statement detail and history (REQ-006, FLOW-001, FLOW-005).

Unit vs integration vs e2e guidance (if applicable)

- Unit: domain logic (e.g. statement validation, status transitions, vote aggregation) in isolation; fast, no DB.
- Integration: persistence and APIs (e.g. create/read statement, update status, record vote) against real or test DB.
- E2E: critical paths only for V1 — view politician and statements (FLOW-001), view revision history (FLOW-005); optionally add statement (FLOW-002) and vote (FLOW-004) once stack and auth are decided.

"No proof without commit hash" rule reminder

- Every non-trivial step must be anchored with a commit and recorded in WORKLOG.md with commit hash. CI or local run of lint/typecheck/tests/build counts as proof only when referenced by that commit.

OPEN QUESTIONS

- Test stack (language, test runner, DB for integration tests) to be decided when tech stack is chosen.

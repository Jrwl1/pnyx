COMMIT_PROTOCOL.md — Commit + Evidence Discipline

Principle:
Every meaningful step must be anchored by a commit, and WORKLOG must reference the commit hash.

Commit types:
A) Implementation commits (Fixer-owned):

code + tests + minimal required WORKLOG evidence entry

message: impl(M#): <change> / fix(M#): <bug> / test(M#): <coverage>

B) Docs sync/closeout commits (Coordinator-owned):

PROJECT_STATUS, TASKS, SPRINT, MILESTONES, RELEASE_CHECKLIST, lock status changes

message: docs(M#): sprint closeout / chore(status): <update>

Evidence requirements (WORKLOG):

Commands run + summarized result (pass/fail, key counts)

Commit hash that contains the change

Link to relevant issue/milestone/spec section

Review gating:

Reviewers may set Sprint to Ready only if evidence exists and is anchored to commits.

Coordinator sets Done only when:

both reviewers Ready

repo is clean (no uncommitted changes)

sprint scope matches milestone and V1 lock

closeout docs commit exists

No-dirty-tree rule:
Before marking sprint Done, git status must be clean.

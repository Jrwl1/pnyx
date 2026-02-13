DO_MODE.md — Execute Current Sprint (Build + Prove + Commit + Review + Closeout)

Prereqs:

ai/planning/V1_SPEC_LOCK.md must be LOCKED.

ai/roadmap/SPRINT.md status must be Active.

Batch loop (repeat per sprint item):

Select the smallest next sprint scope item.

Implement in a small batch (1–3 files). Avoid unrelated refactors.

Prove:

Run the relevant proof commands for that item (tests/lint/typecheck as applicable).

Capture summarized results.

Log:

Append WORKLOG entry including commands + summarized results.

Commit:

Create an implementation commit (impl/fix/test) and capture the commit hash.

Update the WORKLOG entry with the commit hash.

Drift handling:

If scope creep/refactor/tool spiral detected, follow RED_THREAD.md and log to ISSUES.md.

Review gate:

Run Reviewer A and Reviewer B (separately, independent).

Each reviewer must provide PASS/FAIL with WORKLOG reference(s).

Reviewers may change SPRINT status to Ready for Done only if evidence exists and is anchored by commit hashes.

Closeout (Coordinator only):

Verify: both reviewers Ready, repo clean (git status), sprint scope delivered, no open P0/P1 issues.

Update docs: PROJECT_STATUS.md, TASKS.md, SPRINT.md (Done), (optional) MILESTONES.md checkboxes.

Create a docs closeout commit and record hash in WORKLOG sprint closeout entry.

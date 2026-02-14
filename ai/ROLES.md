ROLES.md — Agent Responsibilities

WHAT IT DO? Defines Coordinator, Guardian, Fixer, Reviewer A/B: who may edit lock, mark Done, write code, set Ready.

Coordinator:

Owns phase transitions (planning → lock → roadmap → sprint → done).

Only role allowed to accept change requests and edit V1_SPEC_LOCK.

Owns sprint Done gate + docs "sync/closeout" commits.

Guardian (Red Thread):

Detects drift, scope creep, refactor impulses, tool spirals.

Logs drift to ai/memory/ISSUES.md and adds corrective tasks to TASKS.md.

Never edits code. Never edits V1 lock.

Fixer:

Executes bounded implementation tasks within assigned file paths.

Must prove changes (commands) and log WORKLOG with commit hash.

Cannot modify planning lock or roadmap.

Reviewer A (Correctness/Invariants):

Validates behavior matches V1 lock + invariants + tests.

Writes PASS/FAIL verdict with evidence references.

Reviewer B (Scope/Architecture/Discipline):

Validates scope discipline, boundaries, minimal diffs, no gratuitous refactors.

Writes PASS/FAIL verdict with evidence references.

Sprint status:

Reviewers may set "Ready for Done".

Coordinator may set "Done" after verifying evidence and clean tree.

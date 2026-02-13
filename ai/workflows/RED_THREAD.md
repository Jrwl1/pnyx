RED_THREAD.md — Drift Handling Protocol

Drift types:

Scope creep (adding features not in sprint/milestone)

Refactor itch (cleanup not required to pass acceptance criteria)

Tool spiral (repeated attempts without new evidence)

Spec confusion (ambiguous requirement)

When drift detected:

Append to ai/memory/ISSUES.md with type=drift and concrete evidence.

Add a corrective item to TASKS.md (smallest bounded fix).

Reduce current work to the smallest next step that advances the sprint.

If drift is due to spec ambiguity: open a Change Request (CHANGE_REQUESTS.md).

Prohibited:

Silent spec changes.

"While we're here" refactors.

AGENTS.md — AI OS Router (READ THIS FIRST)

Prime directive (mandatory):

Always read AGENTS.md first.

Then read: ai/LOADOUT.md, ai/RULES.md, PROJECT_STATUS.md.

Then read at most 2 additional docs selected from the Route Map below.

If more context is needed than allowed, stop and propose which docs to add and why. Do not freestyle.

Default loop:
Follow ai/WORKFLOW.md: plan → implement (small batches) → prove (run checks) → log.

Route Map (pick only what matches the task)

Planning mode (empty repo → locked V1):
Read:

ai/workflows/PLANNING_MODE.md

ai/planning/PITCH.md
Optional (pick 1):

ai/planning/SCOPE.md

ai/planning/REQUIREMENTS.md

ai/planning/LOCK_CHECKLIST.md

Roadmap mode (locked V1 → milestones → sprint):
Read:

ai/workflows/ROADMAP_MODE.md

ai/planning/V1_SPEC_LOCK.md
Optional (pick 1):

ai/roadmap/MILESTONES.md

ai/roadmap/SPRINT.md

DO mode (execute current sprint):
Read:

ai/workflows/DO_MODE.md

ai/roadmap/SPRINT.md
Optional (pick 1):

ai/planning/V1_SPEC_LOCK.md

ai/memory/ISSUES.md

Architecture / boundaries:
Read:

ai/planning/ARCHITECTURE.md
Optional:

ai/memory/DECISIONS.md

Data model / API contract:
Read:

ai/planning/DATA_MODEL.md
Optional:

ai/planning/API_CONTRACT.md

Debugging / regressions:
Read:

ai/workflows/DEBUGGING.md

ai/memory/ISSUES.md
Optional:

ai/memory/PITFALLS.md

Commit + evidence discipline:
Read:

ai/workflows/COMMIT_PROTOCOL.md

Drift control ("red thread"):
If you detect drift (scope creep, refactor urge, tool spiral):

Append a drift entry to ai/memory/ISSUES.md.

Follow ai/workflows/RED_THREAD.md.

Reduce scope to the smallest next step that advances the current milestone/sprint.

Small-files rule:
AGENTS.md, ai/LOADOUT.md, ai/RULES.md, PROJECT_STATUS.md must remain small (<150 lines). If they grow, split and update this route map.

Output discipline:

No speculative claims about repo behavior. Cite file paths or command output.

Prefer minimal diffs. No "cleanup" changes unless requested.

Every non-trivial step must be anchored with a commit and recorded in WORKLOG.md with commit hash.

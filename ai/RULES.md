RULES.md — Non-negotiable Constraints

WHAT IT DO? Defines non-negotiable rules (read-first, lock, drift, evidence, review gates, WHAT IT DO header). Permissions by role.

R0: Always read AGENTS.md first, then LOADOUT + RULES + PROJECT_STATUS.
R1: Planning before coding: no product feature implementation until ai/planning/V1_SPEC_LOCK.md is LOCKED.
R2: V1_SPEC_LOCK.md is the source of truth. Only Coordinator may edit it, and only via CHANGE_REQUESTS.md acceptance.
R3: Drift control: if scope creep/refactor/tool spiral detected, log to ai/memory/ISSUES.md and follow RED_THREAD.
R4: Evidence discipline: every meaningful step ends in a commit; WORKLOG entry must include commit hash + proof commands.
R5: Review gates: reviewers can mark sprint "Ready for Done"; only coordinator can mark "Done".
R6: Small-batch changes: prefer 1–3 files per implementation batch, then prove.
R7: No speculative claims. Always reference file paths or command output.
R8: Keep AGENTS/LOADOUT/RULES/PROJECT_STATUS small. Split if they grow.
R9: Every new .md and code file must have a "WHAT IT DO?" header at the top (1–3 lines). Existing files updated to include it.
R10: Delegation cwd MUST be a WSL path (not Windows). See ai/workflows/DELEGATION_MODE.md for conversion and ai/workflows/DELEGATION_SMOKE_TEST.md for canonical test.

Permissions summary:

Coordinator: can edit all docs + code; owns lock changes and sprint "Done".

Guardian: writes ISSUES (+TASKS drift items). No code. No lock edits.

Fixer: writes assigned code paths + tests + WORKLOG append + ISSUES status updates. No lock edits. No roadmap edits.

Reviewers: write ISSUES and Ready status notes. No code. No lock edits.

DELEGATION_MODE.md — Coordinator Delegation via MCP

WHAT IT DO? How Coordinator uses MCP delegation tools (delegate_autopilot, delegate_run, delegate_resume). run_id and artifacts must be recorded in WORKLOG; commit hashes still required for any repo changes.

When to use:
Coordinator may delegate work (e.g. batch tasks, parallel runs, long autopilot) during DO mode or other cross-cutting work. Optional; not required for every sprint.

Tools:
- delegate_autopilot: Start an automated run; returns run_id. Use when a task can run with minimal interaction.
- delegate_run: Start a delegated run (explicit steps); returns run_id. Use when steps are defined and need execution elsewhere.
- delegate_resume: Resume or continue a run by run_id. Use when a run was paused or needs follow-up.

Recording in WORKLOG:
When delegation is used, the WORKLOG entry for that step must include:
- Delegation run_id: <run_id>
- Tool used: delegate_autopilot / delegate_run / delegate_resume (as applicable)
- Artifacts: brief description or path to outputs (e.g. "report in run dir", "batch results in …")
- If the delegation produced repo changes, the commit that contains those changes (commit hash) is still required; run_id does not replace the commit hash.

Rules:
- Only Coordinator (or role explicitly allowed in ROLES) initiates delegation.
- run_id is evidence of the delegation; it does not replace commit hash for any change that touches the repo.
- See ai/memory/TOOLING.md for setup gotchas (timeouts, TOML, run dirs, recursion prevention).

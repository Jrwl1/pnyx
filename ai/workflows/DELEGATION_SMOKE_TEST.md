DELEGATION_SMOKE_TEST.md — Canonical delegation smoke test

WHAT IT DO? Single canonical procedure to verify MCP delegation (codex-specialized-subagents) works: pass/fail criteria, artifact check, triage when it fails.

When to run:
- After MCP or Codex config changes.
- After WSL or toolchain updates.
- When debugging "delegate_run failed" (see triage below).

Prerequisites:
- cwd MUST be a WSL path (e.g. /mnt/c/Users/john/aios/Pnyx). See ai/workflows/DELEGATION_MODE.md.
- Use skills_mode: explicit and skills: ["doc"] (or one known-good skill) to avoid empty skill selection. See DELEGATION_MODE.md "Skills fallback".

Procedure (canonical):
1. Invoke delegate_run with:
   - cwd: /mnt/c/Users/<you>/aios/Pnyx (replace with your WSL repo path).
   - sandbox: workspace-write
   - role: specialist
   - skills_mode: explicit
   - skills: ["doc"]
   - task: "Create docs/_mcp_smoke_test_<N>.md with exactly 4 separate lines: WHAT IT DO?\nTimestamp: <ISO>\nWorking directory: <dir>\nOK"
   (Use next N so existing artifacts are not overwritten; e.g. _mcp_smoke_test_3.md.)
2. After the tool returns, check:
   - status is "completed" (not "failed").
   - deliverables list includes the doc path.
3. Verify in repo: file docs/_mcp_smoke_test_<N>.md exists and contains the four lines (WHAT IT DO?, Timestamp: <ISO>, Working directory: <dir>, OK).

Pass:
- Tool status completed, artifact in deliverables, file exists locally with required content.

Fail:
- Tool status failed, or artifact missing, or file missing/wrong content.

Triage on failure:
- If status failed: note run_dir from tool output; open stderr.log and result.json in that run_dir (on delegator host). Check for Windows path in cwd (use WSL path). Check for "selected_skills is empty" (use skills_mode: explicit + skills: ["doc"]).
- Record run_dir and key error in docs/delegation/_latest_failed_run.md (see that file for format). Append issue to ai/memory/ISSUES.md and WORKLOG with run_dir.
- Do not mark delegation "locked" until a run passes.

Canonical prompt templates:
See ai/workflows/DELEGATION_PROMPT_TEMPLATES.md for copy-paste task text.

ISSUES.md — Issues + Drift Ledger

WHAT IT DO? Issues (bug/drift/tech-debt) with severity, repro, evidence, status. Drift entries go here per RED_THREAD.

Format:
ISS-###: <title>

Type: bug / drift / tech-debt

Severity: P0/P1/P2/P3

Repro:

Expected vs actual:

Evidence (file/line or WORKLOG ref):

Status: open / fixed

Fix commit: <hash>

Notes:

Start empty; append as needed.

---

ISS-001: delegate_run failed with Windows cwd (codex-specialized-subagents)

Type: bug

Severity: P1

Repro: Invoke delegate_run with cwd=c:\Users\john\aios\Pnyx (Windows path). Delegator runs in WSL/Linux.

Expected vs actual: Subagent should run in repo and create artifact. Actual: codex exec exited with code 1; no artifact; run_dir on delegator host.

Evidence (file/line or WORKLOG ref): docs/_mcp_smoke_test.md (Parameters, Status); docs/delegation/_latest_failed_run.md.

Status: fixed

Fix commit: 9e46b65

Fix: Use WSL cwd for delegation (e.g. /mnt/c/Users/john/aios/Pnyx). See ai/workflows/DELEGATION_MODE.md and docs/delegation/_latest_failed_run.md minimal fix.

Notes: Root cause = Windows path passed into WSL execution. Verified fixed by delegation smoke test run with WSL cwd (`/mnt/c/...`) and completed status (`docs/_mcp_smoke_test_3.md`, WORKLOG 2026-02-13 entry, commit 9e46b65).

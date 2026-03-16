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

---

ISS-002: Frontend V3 traceability lagged canonical docs

Type: drift

Severity: P2

Repro: Inspect canonical docs after the committed Frontend V3 landed. `frontend/` and `WORKLOG.md` had implementation evidence, but `PROJECT_STATUS.md` and `TASKS.md` did not mention the frontend, and `docs/FRONTEND_V3_SPEC.md` existed on disk without git tracking.

Expected vs actual: The implemented frontend and its spec should be tracked in git and reflected in canonical status/backlog docs. Actual: the frontend appears to have been built from a concrete spec, but canonical docs lagged behind the implementation.

Evidence (file/line or WORKLOG ref): `frontend/README.md`; `WORKLOG.md` entries for 2026-02-25 frontend implementation; `git ls-files docs/FRONTEND_V3_SPEC.md PROJECT_STATUS.md TASKS.md frontend/README.md`.

Status: fixed

Fix commit: 7aeeaa6

Notes: Verdict after audit = spec-backed, not ad hoc. Remaining gap is planning traceability: roadmap docs still stop at S5, so future frontend work should be formalized in the next milestone/sprint cycle.

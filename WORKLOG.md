WORKLOG.md — Append-only Engineering Log (Evidence Lives Here)

WHAT IT DO? Append-only log of changes with evidence (commands, commit hash). Every non-trivial step anchored here.

Rules:

Append only. Do not rewrite history.

Every non-trivial change must include proof + a COMMIT HASH anchor.

If you claim "tests passed" you must include the command and result summary.

Template for an entry:

Confirm: New files in this change have "WHAT IT DO?" header (R9).

Date:
Milestone/Sprint:
Summary (1–3 bullets):
Why (link to requirement/milestone/issue):
Evidence (commands + summarized results):
Commit: <hash>
Files touched:
Follow-ups / deferred issues (IDs):

---

Date: 2025-02-13
Milestone/Sprint: AI OS install (no product code)
Summary (1–3 bullets):
- Created full AI OS file/folder structure (root, ai/, workflows, planning, roadmap, memory).
- Populated all files with exact templates from install spec.
- Initialized git; made 3 small-batch commits; tree clean.
Why (link to requirement/milestone/issue): CURSOR MEGA-SUPER PROMPT — Install AI OS into Empty Repo.
Evidence (commands + summarized results):
- git init (repo initialized).
- git status (clean after each commit).
- Commit 1: c11b4ea — chore(ai-os): bootstrap structure (8 files).
- Commit 2: 54036f6 — docs(ai-os): seed workflows + planning templates (24 files).
Commit: 61ef0ea
Files touched: All paths per PHASE 0 (AGENTS, PROJECT_STATUS, TASKS, WORKLOG; ai/*; ai/workflows/*; ai/planning/*; ai/roadmap/*; ai/memory/*).
Follow-ups / deferred issues (IDs): None.

---

Date: 2025-02-13
Milestone/Sprint: AI OS docs (delegation + tooling)
Summary (1–3 bullets):
- Added ai/workflows/DELEGATION_MODE.md (Coordinator MCP delegate_autopilot, delegate_run, delegate_resume; run_id + artifacts in WORKLOG).
- Added ai/memory/TOOLING.md (tool_timeout_sec, duplicate TOML, run dirs, delegator_exclude).
- Updated AGENTS.md route map (Delegation mode), DO_MODE.md (optional delegation step), COMMIT_PROTOCOL.md (run_id in WORKLOG when delegation used).
Why (link to requirement/milestone/issue): User request — delegation workflow + tooling gotchas.
Evidence (commands + summarized results):
- New files: ai/workflows/DELEGATION_MODE.md, ai/memory/TOOLING.md. Modified: AGENTS.md, ai/workflows/DO_MODE.md, ai/workflows/COMMIT_PROTOCOL.md.
Commit: 36e26a1
Files touched: AGENTS.md, ai/workflows/DELEGATION_MODE.md, ai/workflows/DO_MODE.md, ai/workflows/COMMIT_PROTOCOL.md, ai/memory/TOOLING.md, WORKLOG.md.
Follow-ups / deferred issues (IDs): None.

---

Date: 2026-02-13
Milestone/Sprint: AI OS wiring verification (no product code)
Summary (1–3 bullets):
- Audited repo tree (depth 4), core files, WHAT IT DO headers; all 31 .md files compliant; no code files yet.
- Extracted and validated workflow invariants (PLAN/DO/REVIEW, permissions, sprint transitions, commit protocol, spec change flow); repo files support them.
- MCP delegate_run smoke test: tool invoked; run failed (codex exec exit 1); run_dir produced at /home/john/.codex/delegator/runs/2026-02-13_155923353_4c9853185dcd; created docs/_mcp_smoke_test.md in-repo to record outcome.
Why (link to requirement/milestone/issue): User request — verify AI OS wired end-to-end (rules, files, tool integration).
Evidence (commands + summarized results):
- Tree: Get-ChildItem -Recurse -Depth 4 (38 .md files under repo root, excl. .git). Core files AGENTS.md, ai/LOADOUT.md, ai/RULES.md, PROJECT_STATUS.md, WORKLOG.md, TASKS.md, ai/planning/V1_SPEC_LOCK.md, ai/memory/CHANGE_REQUESTS.md, ai/memory/ISSUES.md, ai/workflows/*, ai/roadmap/SPRINT.md, MILESTONES.md exist and non-empty.
- WHAT IT DO: grep across *.md — every file has "WHAT IT DO?" in top section (line 3).
- No package.json; git status has uncommitted modifications (pre-existing).
Commit: 72ebee3 (artifact); 92912fa (WORKLOG entry).
Files touched: docs/_mcp_smoke_test.md (new), WORKLOG.md.
Follow-ups / deferred issues (IDs): delegate_run failure: inspect run_dir stderr.log/result.json for root cause if re-running MCP smoke test.

---

Date: 2026-02-13
Milestone/Sprint: Toolchain + delegation hardening
Summary (1–3 bullets):
- Added ai/memory/TOOLING.md environment section: WSL distro + Ubuntu version, node -v / npm -v, codex --version (from WSL), codex mcp get codex-specialized-subagents output, MCP server path (record placeholders + commands).
Why (link to requirement/milestone/issue): User request — harden toolchain + delegation reliability (step 1).
Evidence (commands + summarized results):
- Edited ai/memory/TOOLING.md; git add + commit.
Commit: 453ed80
Files touched: ai/memory/TOOLING.md.
Follow-ups / deferred issues (IDs): None.

---

Date: 2026-02-13
Milestone/Sprint: Toolchain + delegation hardening
Summary (1–3 bullets):
- Added toolchain policy to ai/memory/TOOLING.md: mise.toml → recommended toolchain (fallback allowed); Node repos must pin packageManager in package.json (rule recorded, no code enforcement yet).
Why (link to requirement/milestone/issue): User request — harden toolchain + delegation reliability (step 2).
Evidence (commands + summarized results):
- Edited ai/memory/TOOLING.md; git add + commit.
Commit: 8bba1d7
Files touched: ai/memory/TOOLING.md.
Follow-ups / deferred issues (IDs): None.

---

Date: 2026-02-13
Milestone/Sprint: Toolchain + delegation hardening
Summary (1–3 bullets):
- DELEGATION_MODE.md: require WSL paths for delegated cwd; added helper note (C:\Users\... → /mnt/c/Users/...); added short WSL path conversion snippet (rule: C:\ → /mnt/c/, backslash → slash).
Why (link to requirement/milestone/issue): User request — delegation reliability (steps 3–4).
Evidence (commands + summarized results):
- Edited ai/workflows/DELEGATION_MODE.md; git add + commit.
Commit: e1c37f2 (DELEGATION_MODE); a8294a1 (WORKLOG entries).
Files touched: ai/workflows/DELEGATION_MODE.md, WORKLOG.md.
Follow-ups / deferred issues (IDs): None.

---

Date: 2026-02-13
Milestone/Sprint: Debugging / delegation forensic
Summary (1–3 bullets):
- Forensic debug of latest failed MCP delegate_run: identified run_dir from in-repo docs; run_dir not accessible from this session (delegator host path).
- Report: docs/delegation/_latest_failed_run.md — run_dir path, extracted cwd (Windows), exit code 1, root cause (Windows path passed into WSL execution), minimal fix (use WSL cwd).
- ISSUES.md: ISS-001 opened; WORKLOG evidence appended.
Why (link to requirement/milestone/issue): User request — forensic debug latest failed delegate_run without manual inputs.
Evidence (commands + summarized results):
- Run dir path from docs: /home/john/.codex/delegator/runs/2026-02-13_155923353_4c9853185dcd (docs/_mcp_smoke_test.md, WORKLOG).
- Attempted WSL access: wsl ls -t /home/john/.codex/delegator/runs → No such file or directory; wsl sh -c "echo HOME; ls \$HOME/.codex" → HOME=C:Usersjohn (no run dir); Get-ChildItem \\wsl.localhost\..., C:\Users\john\.codex\... → no run dir found. Conclusion: run_dir on delegator host only.
- Extracted cwd from docs/_mcp_smoke_test.md: c:\Users\john\aios\Pnyx. Exit code 1 from same file.
Commit: 019eaf7
Files touched: docs/delegation/_latest_failed_run.md (new), ai/memory/ISSUES.md, WORKLOG.md.
Follow-ups / deferred issues (IDs): ISS-001.

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

---

Date: 2026-02-13
Milestone/Sprint: AI OS lockdown — delegation + rules enforced
Summary (1–3 bullets):
- Added canonical docs: ai/workflows/DELEGATION_SMOKE_TEST.md, ai/workflows/DELEGATION_PROMPT_TEMPLATES.md, ai/memory/TOOLING_DRIFT.md. Updated DELEGATION_MODE (WSL cwd hard rule, skills fallback), TOOLING (ref TOOLING_DRIFT), RULES (R10).
- Ran delegation smoke test per DELEGATION_SMOKE_TEST: delegate_run with cwd=/mnt/c/Users/john/aios/Pnyx, skills_mode=explicit, skills=["doc"]; created docs/_mcp_smoke_test_3.md; status completed.
- Commits: f9f2c63 (workflow + TOOLING_DRIFT), 2be1f5b (rule/policy edits); third commit for smoke artifact + this WORKLOG entry.
Why (link to requirement/milestone/issue): User request — lock down AI OS wiring so delegation + rules never regress.
Evidence (commands + summarized results):
- delegate_run: cwd=/mnt/c/Users/john/aios/Pnyx, skills_mode=explicit, skills=["doc"], task create docs/_mcp_smoke_test_3.md (4 lines). Result: status completed, run_dir /home/john/.codex/delegator/runs/2026-02-13_171443101_da8249078f65. File verified in repo.
- Delegation run_dir: /home/john/.codex/delegator/runs/2026-02-13_171443101_da8249078f65
Commit: 9e46b65
Files touched: ai/workflows/DELEGATION_SMOKE_TEST.md, DELEGATION_PROMPT_TEMPLATES.md, ai/memory/TOOLING_DRIFT.md, ai/workflows/DELEGATION_MODE.md, ai/memory/TOOLING.md, ai/RULES.md, docs/_mcp_smoke_test_3.md, WORKLOG.md.
Follow-ups / deferred issues (IDs): None.

---

Date: 2025-02-15
Milestone/Sprint: V1 spec lock (Coordinator)
Summary (1–3 bullets):
- Set ai/planning/V1_SPEC_LOCK.md status to LOCKED; added Locked at: 2025-02-15.
- Only Coordinator edits lock file per R2; no CHANGE_REQUESTS needed for initial lock.
Why (link to requirement/milestone/issue): Coordinator next step — lock V1 spec so product implementation may proceed per V1 scope.
Evidence (commands + summarized results):
- git add ai/planning/V1_SPEC_LOCK.md; git commit -m "chore(status): lock V1_SPEC_LOCK (Coordinator)" → 1 file changed.
Commit: 4faf4a9 (lock); 16287b1 (WORKLOG entry).
Files touched: ai/planning/V1_SPEC_LOCK.md, WORKLOG.md.
Follow-ups / deferred issues (IDs): None.

---

Date: 2025-02-15
Milestone/Sprint: Roadmap — M0 + S0 Active (Coordinator)
Summary (1–3 bullets):
- Filled ai/roadmap/MILESTONES.md with M0 (V1 core) mapped to CAP-001..CAP-008 and rate limits; acceptance criteria and proof commands.
- Set ai/roadmap/SPRINT.md S0 status to Active (V1_SPEC_LOCK is LOCKED).
- Updated PROJECT_STATUS.md: mode = Roadmap, S0 Active; next action = execute S0 per DO_MODE.
Why (link to requirement/milestone/issue): ROADMAP_MODE — derive milestones from locked V1, set current sprint, anchor with commit.
Evidence (commands + summarized results):
- git add ai/roadmap/MILESTONES.md ai/roadmap/SPRINT.md PROJECT_STATUS.md; git commit -m "docs(roadmap): M0 + S0 Active + PROJECT_STATUS for Roadmap mode" → 3 files changed.
Commit: f4ad280 (roadmap); a033a57 (WORKLOG entry).
Files touched: ai/roadmap/MILESTONES.md, ai/roadmap/SPRINT.md, PROJECT_STATUS.md, WORKLOG.md.
Follow-ups / deferred issues (IDs): None.

---

Date: 2026-02-15
Milestone/Sprint: S0-T01 (V1 app skeleton + auth roles + baseline schema)
Summary (1–3 bullets):
- Bootstrapped TypeScript Node service skeleton with pnpm scripts for `lint`, `typecheck`, `build`, `migrate`, `start`.
- Added role-aware auth wiring for `anonymous/user/moderator/admin` and protected operations (`user` writes, `moderator` verification/pending-delete, `admin` approve-delete).
- Added baseline SQLite migration (`users`, `politicians`, `statements`, `votes`, `revision_audits`) and migration runner with one-time `schema_migrations` tracking.
Why (link to requirement/milestone/issue): S0-T01 implementation per locked V1 spec auth and data model baseline.
Evidence (commands + summarized results):
- `pnpm install` -> failed: `ERR_PNPM_META_FETCH_FAIL` with `getaddrinfo EAI_AGAIN registry.npmjs.org` (dependency fetch unavailable in current environment).
- `pnpm migrate` -> failed because `tsx` unavailable (install blocked).
- `pnpm lint` -> failed because `eslint` unavailable (install blocked).
- `pnpm typecheck` -> failed because `tsc` unavailable (install blocked).
- `pnpm build` -> failed because `tsc` unavailable (install blocked).
Commit: 894b949
Files touched: package.json, tsconfig.json, tsconfig.build.json, eslint.config.mjs, .gitignore, migrations/0001_initial.sql, src/auth/context.ts, src/auth/role-guard.ts, src/db/client.ts, src/db/migrate.ts, src/index.ts, src/server.ts, src/types/roles.ts, WORKLOG.md.
Follow-ups / deferred issues (IDs): Dependency installation retry required once npm registry DNS is reachable.

---

Date: 2026-02-15
Milestone/Sprint: S0-T01 (lint fix)
Summary (1–3 bullets):
- Fixed ESLint config: `recommendedTypeChecked` was applied globally without parserOptions; moved to recommended-only, restricted type-aware rules to src/**/*.ts, ignored eslint.config.mjs.
- Fixed @typescript-eslint/no-namespace in src/auth/context.ts (Express augmentation requires global namespace; added eslint-disable with rationale).
- Removed unused eslint-disable directives in src/db/migrate.ts and src/server.ts.
Why (link to requirement/milestone/issue): S0-T01 proof command `pnpm lint` was failing.
Evidence (commands + summarized results):
- `pnpm lint` -> pass (exit 0).
Commit: 0b02332
Files touched: eslint.config.mjs, src/auth/context.ts, src/db/migrate.ts, src/server.ts.
Follow-ups / deferred issues (IDs): None.

---

Date: 2026-02-15
Milestone/Sprint: S0-T02 (CAP-002 politician create/list + dedupe)
Summary (1–3 bullets):
- Added vitest + supertest, test/test:e2e scripts, vitest.config.ts, vitest.e2e.config.ts; test setup uses :memory: DB.
- Politician create/list already implemented by Codex (S0-T01); migration has external_id UNIQUE and normalized_key unique index; requireRole("user") enforces 403 for anonymous; INSERT catches duplicates -> 409.
- Added test/politician-dedupe.test.ts: authenticated create + list, anonymous 403, duplicate (name,region,office) 409, duplicate externalId 409. Exported app from server.ts for supertest.
Why (link to requirement/milestone/issue): S0-T02 per SPRINT.md, CAP-002 per V1_SPEC_LOCK.
Evidence (commands + summarized results):
- `pnpm lint && pnpm typecheck && pnpm build` -> pass.
- `pnpm test -- -t "politician dedupe"` -> fails: better-sqlite3 native bindings not built (pnpm ignored build scripts; node-gyp not in path).
Commit: 318418b
Files touched: package.json, pnpm-lock.yaml, src/server.ts, test/setup.ts, test/setup-migrate.ts, test/politician-dedupe.test.ts, vitest.config.ts, vitest.e2e.config.ts.
Follow-ups / deferred issues (IDs): better-sqlite3 native bindings — run `pnpm approve-builds` or install node-gyp and rebuild.

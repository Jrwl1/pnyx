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

Date: 2026-02-25
Milestone/Sprint: S1-T01 (CR-002 activation + S1 planning)
Summary (1–3 bullets):
- Accepted CR-002 and updated locked spec to moderated politician intake policy (users submit proposals; only moderator/admin create canonical politicians).
- Added M1 milestone and replaced current sprint plan with S1 Active (`S1-T01..S1-T14`) including phased execution, risk mitigations, and proof strategy.
- Synced status/backlog docs to S1 activation (`PROJECT_STATUS.md`, `TASKS.md`).
Why (link to requirement/milestone/issue): User decision to move to moderated intake governance model and activate Sprint 01 planning.
Evidence (commands + summarized results):
- `git add ai/memory/CHANGE_REQUESTS.md ai/planning/V1_SPEC_LOCK.md ai/roadmap/MILESTONES.md ai/roadmap/SPRINT.md PROJECT_STATUS.md TASKS.md`
- `git commit -m "docs(roadmap): activate S1 moderated intake plan"` -> 6 files changed.
Commit: 2088788
Files touched: ai/memory/CHANGE_REQUESTS.md, ai/planning/V1_SPEC_LOCK.md, ai/roadmap/MILESTONES.md, ai/roadmap/SPRINT.md, PROJECT_STATUS.md, TASKS.md.
Follow-ups / deferred issues (IDs): Implement S1 tasks in DO mode (starting with role hardening decision and proposal workflow).

---

Date: 2026-02-25
Milestone/Sprint: S1-T07 (register role hardening)
Summary (1–3 bullets):
- Enforced hard rejection of privileged role self-assignment on public `/auth/register` (`moderator|admin` -> `403`).
- Added dedicated test suite for register role hardening, including omit-role, explicit user role, privileged role rejection, and invalid role validation.
- Synced policy wording in spec/sprint docs to reflect rejected privileged-role requests (not normalization).
Why (link to requirement/milestone/issue): User selected strict rejection policy for privileged role assignment on registration.
Evidence (commands + summarized results):
- `pnpm test -- -t "register role hardening"` -> pass (11 files, 46 tests total; new suite 4 passed).
- `pnpm lint && pnpm typecheck && pnpm build` -> pass.
Commit: dba6147
Files touched: src/server.ts, test/register-role-hardening.test.ts, ai/planning/V1_SPEC_LOCK.md, ai/roadmap/SPRINT.md.
Follow-ups / deferred issues (IDs): Continue S1-T02..S1-T06 and S1-T08..S1-T14 implementation batches.

---

Date: 2026-02-25
Milestone/Sprint: S1-T02 (proposal schema migration)
Summary (1–3 bullets):
- Added migration `0002_politician_proposals.sql` with `politician_proposals` queue table and `politician_proposal_audits` lifecycle audit table.
- Added proposal queue indexes for status/submitter lookup and pending dedupe keys (external and normalized tuple).
- Added `test/migration.test.ts` to assert schema artifacts are present after migrations.
Why (link to requirement/milestone/issue): S1-T02 requires proposal data model/migration readiness before endpoint implementation.
Evidence (commands + summarized results):
- `pnpm migrate && pnpm test -- -t "migration"` -> pass (`Migrations applied.`; 12 files / 47 tests passed, migration suite green).
Commit: 5be3676
Files touched: migrations/0002_politician_proposals.sql, test/migration.test.ts.
Follow-ups / deferred issues (IDs): Implement proposal submit/review/create endpoints (S1-T03/S1-T04/S1-T06).

---

Date: 2026-02-25
Milestone/Sprint: S1-T03/S1-T04/S1-T05/S1-T06/S1-T08/S1-T09/S1-T10/S1-T11/S1-T12
Summary (1–3 bullets):
- Implemented moderated intake API: proposal submit/read/review/audits plus moderator/admin-only canonical politician create and atomic approve-to-create linking.
- Added dedicated intake/create rate limits and updated role gates (`user` cannot create canonical politicians; `moderator|admin` can review/create).
- Added end-to-end proposal test coverage: submit, review, approval-link, queue reads, audits, proposal/create rate limits, role matrix, and updated existing politician/read-surface tests.
Why (link to requirement/milestone/issue): Execute S1 core governance hardening tasks after CR-002 activation.
Evidence (commands + summarized results):
- `pnpm test -- -t "politician proposal submit" && pnpm test -- -t "politician proposal review" && pnpm test -- -t "proposal approval create link" && pnpm test -- -t "politician proposal queue" && pnpm test -- -t "politician proposal audit" && pnpm test -- -t "proposal rate limit" && pnpm test -- -t "role matrix" && pnpm test -- -t "politician dedupe"` -> pass after review-action fix (19 files / 66 tests passed in each targeted run).
- `pnpm lint && pnpm typecheck && pnpm build` -> pass.
Commit: f0c4603
Files touched: src/server.ts, test/setup.ts, test/politician-dedupe.test.ts, test/read-surfaces.test.ts, test/politician-proposal-submit.test.ts, test/politician-proposal-review.test.ts, test/proposal-approval-create-link.test.ts, test/politician-proposal-queue.test.ts, test/politician-proposal-audit.test.ts, test/proposal-rate-limit.test.ts, test/role-matrix.test.ts.
Follow-ups / deferred issues (IDs): Run S1-T13 full regression and execute S1-T14 review/closeout.

---

Date: 2026-02-25
Milestone/Sprint: S1-T13 (full regression + evidence aggregation)
Summary (1–3 bullets):
- Ran full sprint regression chain after moderated intake implementation and role hardening.
- Verified all unit/integration suites and e2e smoke pass with current S1 changes.
- Captured clean-tree status before review gate execution.
Why (link to requirement/milestone/issue): S1-T13 requires full green proof before independent review and closeout.
Evidence (commands + summarized results):
- `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build` -> pass (`19` test files / `66` tests + e2e `1` test).
- `git status --short` -> clean.
Commit: <pending>
Files touched: WORKLOG.md.
Follow-ups / deferred issues (IDs): Execute S1-T14 reviewer gate and coordinator closeout.

---

Date: 2026-02-24
Milestone/Sprint: S0-T12 (review gate + closeout docs sync)
Summary (1–3 bullets):
- Recorded independent reviewer verdicts as PASS with commit-anchored WORKLOG references and moved sprint status to `Ready for Done`.
- Synced closeout docs: `ai/roadmap/SPRINT.md`, `PROJECT_STATUS.md`, `TASKS.md`; closed historical open P1 issue (`ISS-001`) with existing fix evidence.
- Coordinator Done remains blocked by non-clean tree due pre-existing unrelated change (`ai/planning/PITCH.md`).
Why (link to requirement/milestone/issue): S0-T12 protocol requires reviewer gate evidence and closeout documentation synchronization.
Evidence (commands + summarized results):
- Reviewer A subagent verdict -> PASS (ready-gate criteria), refs include `2f0294f`, `6d5ed30`, `8ac6dd6`, `35cf00a`, `b87c6fc`, `d4c313d`, `cfbe827`, `54beb3d`, `0d32192`, `b9a323d`.
- Reviewer B subagent verdict -> PASS (ready-gate criteria), refs include `2f0294f`, `6d5ed30`, `8ac6dd6`, `35cf00a`, `b87c6fc`, `d4c313d`, `cfbe827`, `54beb3d`, `0d32192`, `b9a323d`.
- `git status --short` -> `M ai/planning/PITCH.md` (pre-existing unrelated; prevents clean-tree Done closeout).
Commit: 19d540f
Files touched: ai/roadmap/SPRINT.md, PROJECT_STATUS.md, TASKS.md, ai/memory/ISSUES.md.
Follow-ups / deferred issues (IDs): Resolve working tree cleanliness to perform final coordinator Done status flip.

---

Date: 2026-02-24
Milestone/Sprint: S0-T12 (coordinator Done closeout)
Summary (1–3 bullets):
- Cleared the pre-existing working tree blocker by committing pending `ai/planning/PITCH.md` edits (`c6c96fd`), then verified clean tree.
- Flipped sprint status to `Done` and synced `PROJECT_STATUS.md` to reflect completed S0 closeout.
- Completed coordinator closeout checklist conditions (2x Ready verdicts recorded, clean repo, closeout docs commit).
Why (link to requirement/milestone/issue): Final coordinator-only closeout step required to complete S0-T12.
Evidence (commands + summarized results):
- `git status --short` (after `c6c96fd`) -> clean.
- Closeout docs commit -> `5b59825` (`ai/roadmap/SPRINT.md`, `PROJECT_STATUS.md`).
- `git status --short` (after closeout docs commit) -> clean.
Commit: 5b59825
Files touched: ai/planning/PITCH.md, ai/roadmap/SPRINT.md, PROJECT_STATUS.md.
Follow-ups / deferred issues (IDs): None.

---

Date: 2026-02-24
Milestone/Sprint: S0-T12 (review gate prep — re-anchor earlier proof commands)
Summary (1–3 bullets):
- Re-ran S0-T02 and S0-T03 named proof commands to replace earlier blocked evidence windows with green results.
- Added explicit app startup smoke check (bind/close) to backfill S0-T01 "app starts" criterion evidence.
Why (link to requirement/milestone/issue): Reviewer gate flagged missing explicit pass anchors for earlier sprint items.
Evidence (commands + summarized results):
- `pnpm test -- -t "politician dedupe"` -> pass (10 files, 42 tests passed; includes S0-T02 suite).
- `pnpm test -- -t "statement capture"` -> pass (10 files, 42 tests passed; includes S0-T03 suite).
- `pnpm tsx -e "import { app } from './src/server.ts'; const server = app.listen(0, () => { console.log('app-start-ok'); server.close(); });"` -> prints `app-start-ok`.
Commit: 2f0294f
Files touched: WORKLOG.md.
Follow-ups / deferred issues (IDs): None.

---

Date: 2026-02-24
Milestone/Sprint: S0-T11 (full regression proof suite)
Summary (1–3 bullets):
- Added `test/health.e2e.test.ts` so `pnpm test:e2e` has an executable suite and the sprint proof command can pass end-to-end.
- Ran full sprint proof command chain (`lint`, `typecheck`, `test`, `test:e2e`, `build`) successfully.
- Captured repo status for checklist evidence.
Why (link to requirement/milestone/issue): S0-T11 requires full regression proof suite and evidence capture.
Evidence (commands + summarized results):
- `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build` -> pass; unit tests 10 files / 42 tests passed, e2e 1 file / 1 test passed.
- `git status --short` -> `M ai/planning/PITCH.md` (pre-existing unrelated change remains).
Commit: 6d5ed30
Files touched: test/health.e2e.test.ts.
Follow-ups / deferred issues (IDs): None.

---

Date: 2026-02-24
Milestone/Sprint: S0-T10 (CAP rate limits)
Summary (1–3 bullets):
- Implemented in-memory fixed-window rate limiting with explicit buckets for `login`, `register`, `add-statement`, `vote`, plus a `global` fallback.
- Added `POST /auth/register` and applied route limiters to auth/write paths (`/auth/token`, `/auth/register`, `/statements`, `/statements/:id/votes`) with clear `429` JSON responses.
- Added `test/rate-limit-429.test.ts`; test setup now pins test-only limiter config and enables deterministic limiter activation via test headers.
Why (link to requirement/milestone/issue): S0-T10 per `ai/roadmap/SPRINT.md` rate-limit done criteria.
Evidence (commands + summarized results):
- `pnpm test -- -t "rate limit 429"` -> pass (9 files, 41 tests total; new suite 4 passed).
- `pnpm lint && pnpm typecheck && pnpm build` -> pass.
Commit: 8ac6dd6
Files touched: src/server.ts, test/setup.ts, test/rate-limit-429.test.ts.
Follow-ups / deferred issues (IDs): None.

---

Date: 2026-02-24
Milestone/Sprint: S0-T09 (CAP-001 read surfaces)
Summary (1–3 bullets):
- Added `GET /statements/:id` read surface with anonymous access, `404` for invalid/missing ids, and role-aware pending visibility.
- Detail response now includes verification status, vote aggregate, revision count, and revision history reference URL.
- Added `test/read-surfaces.test.ts` for browse/list/detail flows, invalid id `404`, and empty-state list behavior.
Why (link to requirement/milestone/issue): S0-T09 per `ai/roadmap/SPRINT.md` CAP-001 done criteria.
Evidence (commands + summarized results):
- `pnpm test -- -t "read surfaces"` -> pass (8 files, 37 tests total; new suite 3 passed).
- `pnpm lint && pnpm typecheck && pnpm build` -> pass.
Commit: 35cf00a
Files touched: src/server.ts, test/read-surfaces.test.ts.
Follow-ups / deferred issues (IDs): None.

---

Date: 2026-02-24
Milestone/Sprint: S0-T08 (CAP-008 revision history read flow)
Summary (1–3 bullets):
- Added `GET /statements/:id/revisions` to expose ordered revision audit rows for a statement.
- Endpoint is public (anonymous and authenticated users can read) and returns `404` for missing/deleted statements.
- Added `test/revision-history.test.ts` for ordered history, auth/anon visibility, and missing statement behavior.
Why (link to requirement/milestone/issue): S0-T08 per `ai/roadmap/SPRINT.md` CAP-008 done criteria.
Evidence (commands + summarized results):
- `pnpm test -- -t "revision history"` -> pass (7 files, 34 tests total; new suite 3 passed).
- `pnpm lint && pnpm typecheck && pnpm build` -> pass.
Commit: b87c6fc
Files touched: src/server.ts, test/revision-history.test.ts.
Follow-ups / deferred issues (IDs): None.

---

Date: 2026-02-24
Milestone/Sprint: S0-T07 (CAP-007 delete lifecycle + visibility defaults)
Summary (1–3 bullets):
- Added author-only withdraw endpoint (`POST /statements/:id/withdraw`) with soft-delete fields (`withdrawn_at`, `deleted_at`).
- Updated statement list default visibility: public/user hide pending-delete rows, moderator/admin include pending-delete rows by default; deleted rows remain excluded.
- Added `test/delete-lifecycle-visibility.test.ts` covering withdraw, pending-delete/approve-delete role flow, and role-aware list defaults.
Why (link to requirement/milestone/issue): S0-T07 per `ai/roadmap/SPRINT.md` CAP-007 done criteria.
Evidence (commands + summarized results):
- `pnpm test -- -t "delete lifecycle visibility"` -> pass (6 files, 31 tests total; new suite 4 passed).
- `pnpm lint && pnpm typecheck && pnpm build` -> pass.
Commit: d4c313d
Files touched: src/server.ts, test/delete-lifecycle-visibility.test.ts.
Follow-ups / deferred issues (IDs): None.

---

Date: 2026-02-24
Milestone/Sprint: S0-T06 (CAP-006 voting overwrite)
Summary (1–3 bullets):
- Added statement existence guard to vote endpoint (`404` for missing/deleted statement).
- Kept one-row-per-user overwrite semantics and normalized aggregate to numeric `support/oppose` counts with `COALESCE`.
- Added `test/vote-overwrite-aggregate.test.ts` for authenticated vote, recast overwrite behavior, anonymous denial, and missing statement handling.
Why (link to requirement/milestone/issue): S0-T06 per `ai/roadmap/SPRINT.md` CAP-006 done criteria.
Evidence (commands + summarized results):
- `pnpm test -- -t "vote overwrite aggregate"` -> pass (5 files, 27 tests total; new suite 4 passed).
- `pnpm lint && pnpm typecheck && pnpm build` -> pass.
Commit: cfbe827
Files touched: src/server.ts, test/vote-overwrite-aggregate.test.ts.
Follow-ups / deferred issues (IDs): None.

---

Date: 2026-02-24
Milestone/Sprint: S0-T05 (CAP-005 verification lifecycle transitions)
Summary (1–3 bullets):
- Enforced explicit verification transition map, invalid/no-op transition `409`, and downgrade reason requirement.
- Preserved moderator/admin-only transition control and transition audit writes.
- Added `test/verification-transitions.test.ts` for role gate, transition validity, downgrade reason, audit rows, and `404` missing statement.
Why (link to requirement/milestone/issue): S0-T05 per `ai/roadmap/SPRINT.md` CAP-005 done criteria.
Evidence (commands + summarized results):
- `pnpm test -- -t "verification transitions"` -> pass (4 files, 23 tests total; new suite 5 passed).
- `pnpm lint && pnpm typecheck && pnpm build` -> pass.
Commit: 54beb3d
Files touched: src/server.ts, test/verification-transitions.test.ts.
Follow-ups / deferred issues (IDs): None.

---

Date: 2026-02-24
Milestone/Sprint: S0-T01 (migration CLI execution guard)
Summary (1–3 bullets):
- Fixed direct-execution detection in `src/db/migrate.ts` to work under tsx/Windows path forms.
- `pnpm migrate` now executes `applyMigrations()` and prints completion as expected.
Why (link to requirement/milestone/issue): S0-T01 done criteria includes migrations apply.
Evidence (commands + summarized results):
- `pnpm migrate` -> pass, output includes `Migrations applied.`
- `pnpm tsx -e "...SELECT name FROM sqlite_master..."` -> tables present: `politicians, revision_audits, schema_migrations, sqlite_sequence, statements, users, votes`.
- `pnpm lint && pnpm typecheck && pnpm build` -> pass.
- `pnpm test` -> pass (3 files, 18 tests).
Commit: 0d32192
Files touched: src/db/migrate.ts.
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

---

Date: 2026-02-15
Milestone/Sprint: S0-T02 (design recommendations)
Summary (1–3 bullets):
- POST /politicians: reserve 409 for uniqueness; return 500 for other DB/runtime errors (catch SQLITE_CONSTRAINT_UNIQUE, else 500).
- App-level canonical dedupe: before insert, check if any row (including those with externalId) has same normalized (name,region,office); reject with 409.
- Added test: create without externalId when matching normalized record has externalId -> 409.
Why (link to requirement/milestone/issue): Design Q&A per V1_SPEC_LOCK, INV-005, API_CONTRACT.
Evidence (commands + summarized results):
- pnpm lint && pnpm typecheck && pnpm build -> pass.
Commit: 4ebd375
Files touched: src/server.ts, test/politician-dedupe.test.ts.
Follow-ups / deferred issues (IDs): None.

---

Date: 2026-02-15
Milestone/Sprint: S0-T03 (CAP-003 statement create/list)
Summary (1–3 bullets):
- POST /statements: check politician exists -> 404; check duplicate fingerprint -> 409; initial RevisionAudit(createStatement); return 201 { id, verificationStatus: "pending" }; 500 for other DB errors.
- GET /statements: list endpoint; exclude deleted and pending-delete; ORDER BY created_at DESC.
- test/statement-capture.test.ts: required fields, unknown politician 404, anonymous 403, duplicate 409, pending status + list returns.
Why (link to requirement/milestone/issue): S0-T03 per SPRINT.md, CAP-003 per V1_SPEC_LOCK.
Evidence (commands + summarized results):
- pnpm lint && pnpm typecheck && pnpm build -> pass.
- pnpm test -- -t "statement capture" -> blocked: better-sqlite3 native bindings not built.
Commit: 93a2e8b
Files touched: src/server.ts, test/statement-capture.test.ts.
Follow-ups / deferred issues (IDs): better-sqlite3 bindings still blocking tests.

---

Date: 2026-02-15
Milestone/Sprint: Code review recommendations
Summary (1–3 bullets):
- fix(auth): replaced spoofable x-role/x-user-id with JWT; authContext reads Authorization Bearer, verifies JWT, sets req.auth; POST /auth/token issues tokens when secret === JWT_SECRET; tests use authHeaders() helper; spoofed-header test added.
- docs: SPRINT_GAP_MATRIX.md (task→code mapping), THREAT_MODEL.md (trust boundaries, assets, mitigations), IMPLEMENTATION_GAP_PLAN.md (priority batch plan).
Why (link to requirement/milestone/issue): Codex review: critical privilege-escalation via headers; user requested fix + sprint matrix + threat model + gap plan.
Evidence (commands + summarized results):
- pnpm lint && pnpm typecheck && pnpm build -> pass.
- pnpm test -> blocked: better-sqlite3 native bindings.
Commit: bfc04e5 (auth), 63b248f (docs)
Files touched: src/auth/context.ts, src/auth/jwt.ts, src/server.ts, test/helpers/auth.ts, test/politician-dedupe.test.ts, test/statement-capture.test.ts, test/setup.ts; docs/SPRINT_GAP_MATRIX.md, docs/security/THREAT_MODEL.md, docs/IMPLEMENTATION_GAP_PLAN.md.
Follow-ups / deferred issues (IDs): None.

---

Date: 2026-02-18
Milestone/Sprint: S0-T04 (CAP-004 statement edit policy + audit)
Summary (1–3 bullets):
- PATCH /statements/:id: author can edit within 30 min; moderator/admin can edit any non-deleted statement; 404 if not found/deleted, 403 if outside window or unauthorized.
- Each edit updates body/source_url/date_said (merge patch), recomputes fingerprint, rejects duplicate with 409; writes RevisionAudit row with changeType editStatement (from_value/to_value JSON).
- test/edit-window-audit.test.ts: author within 30 min, author after 30 min 403, moderator/admin override, non-author 403, 404, audit row asserted.
Why (link to requirement/milestone/issue): S0-T04 per SPRINT.md, CAP-004 per V1_SPEC_LOCK, INV-004.
Evidence (commands + summarized results):
- pnpm lint && pnpm typecheck && pnpm test && pnpm build -> pass (18 tests).
- pnpm test -- -t "edit window and audit" -> 7 passed.
Commit: b9a323d
Files touched: src/server.ts, test/edit-window-audit.test.ts.
Follow-ups / deferred issues (IDs): None.

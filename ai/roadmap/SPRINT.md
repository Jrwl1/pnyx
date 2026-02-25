SPRINT.md — Current Sprint

WHAT IT DO? Current sprint scope (maps to milestone + CAPs), DoD, proof commands. Reviewer Ready / Coordinator Done checklists.

Sprint ID: S3 - V1 release readiness and planning sync
Status: Ready for Done
Milestone mapping: M3 (post-M2 release-readiness hardening)

Scope (maps to V1 CAPs in `ai/planning/V1_SPEC_LOCK.md`):

| Task ID | Objective | Done Criteria | Test/Evidence Command | Owner Role |
| --- | --- | --- | --- | --- |
| S3-T01 | Reconcile `DATA_MODEL.md` with live schema and invariants. | `ai/planning/DATA_MODEL.md` reflects migrations `0001..0003` (tables, constraints, indexes) and maps behavior to `INV-001..INV-008`. | `pnpm migrate && pnpm test -- -t "migration"` | Fixer |
| S3-T02 | Reconcile `API_CONTRACT.md` with implemented endpoints and policy guards. | Contract doc matches current routes/auth matrix/status semantics (`403/404/409/429`) and rate-limit buckets, including proposal moderation surfaces. | `pnpm test -- -t "role matrix" && pnpm test -- -t "register role hardening"` | Fixer |
| S3-T03 | Reconcile `ARCHITECTURE.md` with implemented boundaries and request lifecycle. | Architecture doc reflects real module boundaries (`auth`, `db`, request handlers, audit/rate-limit flows) and execution path from request to persistence/audit. | `pnpm typecheck && pnpm build` | Fixer |
| S3-T04 | Add CAP-to-endpoint-to-test traceability for V1 scope. | A traceability section links CAP-001..CAP-008 and moderated-intake controls to concrete routes and test suites. | `pnpm test -- -t "read surfaces" && pnpm test -- -t "politician proposal"` | Fixer |
| S3-T05 | Add success-criteria measurement plan and deterministic reporting commands. | Docs and scripts/queries define repeatable measurement for tracked politicians/statements, non-pending verification coverage, and engagement signals. | `pnpm test -- -t "proposal sla metrics" && pnpm test -- -t "vote overwrite aggregate"` | Fixer |
| S3-T06 | Add CI proof automation for core regression chain. | PR/push workflow runs `lint`, `typecheck`, `test`, `test:e2e`, and `build` without bypass flags. | `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build` | Fixer |
| S3-T07 | Add release-readiness runbook and environment checklist. | Runbook documents migration apply/rollback policy, required env vars, and security-audit workflow expectations for protected path changes. | `git grep -nE "migration|rollback|env|security audit" docs` | Fixer |
| S3-T08 | Preserve moderated intake invariants while planning/tooling changes land. | Canonical create gates, proposal moderation, and role-hardening behavior remain unchanged and green. | `pnpm test -- -t "politician dedupe" && pnpm test -- -t "politician proposal review" && pnpm test -- -t "register role hardening"` | Fixer |
| S3-T09 | Preserve statement lifecycle/read stability across CAP-001/CAP-003/CAP-007. | Read, create, and delete-lifecycle behavior remains stable for anonymous/user/moderator/admin surfaces. | `pnpm test -- -t "read surfaces" && pnpm test -- -t "statement capture" && pnpm test -- -t "delete lifecycle visibility"` | Fixer |
| S3-T10 | Full regression + sprint evidence aggregation. | Full suite is green and `WORKLOG.md` contains command summaries and commit hashes for each meaningful batch. | `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build` | Fixer |
| S3-T11 | Independent review gate per protocol. | Reviewer A/B PASS/FAIL include `WORKLOG` references; status can move to `Ready for Done` only with commit-anchored evidence. | `git status --short && git grep -nE "S3|PASS|FAIL|Commit" WORKLOG.md ai/roadmap/SPRINT.md PROJECT_STATUS.md` | Guardian + Reviewers |
| S3-T12 | Coordinator closeout docs synchronization. | Coordinator verifies ready state + clean tree, flips sprint to `Done`, and updates `PROJECT_STATUS.md`, `TASKS.md`, and `WORKLOG.md`. | `git status --short && git grep -nE "S3|PASS|FAIL|Commit" WORKLOG.md ai/roadmap/SPRINT.md PROJECT_STATUS.md` | Coordinator |

Execution phases:

- Phase A — Planning source-of-truth sync (`S3-T01..S3-T04`): data model, API contract, architecture, traceability.
- Phase B — Release-readiness instrumentation (`S3-T05..S3-T07`): measurement, CI automation, runbook.
- Phase C — Regression safety (`S3-T08..S3-T09`): invariants and lifecycle/read stability checks.
- Phase D — Proof + closeout (`S3-T10..S3-T12`): full green evidence, independent reviews, docs/status sync.

Top risks and mitigations:

- Documentation drift from implementation -> mitigate by grounding doc updates in migrations/routes/tests and proving with targeted suites.
- CI workflow instability/flakiness -> mitigate with deterministic command ordering and reuse of locally green proof chain.
- Scope creep while adding release docs/tooling -> mitigate by enforcing lock-safe tasks only and opening CR for any spec touch.

Definition of Done:

- All S3 tasks meet done criteria and remain within locked V1 scope (`ai/planning/V1_SPEC_LOCK.md`).
- Planning docs (`DATA_MODEL`, `API_CONTRACT`, `ARCHITECTURE`) are synchronized with implemented behavior.
- WORKLOG contains per-step proof commands, summarized results, and commit hashes.
- Required proof commands pass for implementation and closeout.
- No open P0/P1 issues in `ai/memory/ISSUES.md`.
- Review gate complete: two independent reviewer verdicts with WORKLOG references.

Proof commands (sprint-level):

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm build`
- `git status --short`

Reviewer Ready checklist:

- Reviewer A: PASS (subagent final) with commit-anchored refs `5d9abd2`, `09dcaf6`, `3ab0d85`, `037254c`, `8c4c7a5`; WORKLOG refs `WORKLOG.md:666`, `WORKLOG.md:681`, `WORKLOG.md:696`, `WORKLOG.md:711`, `WORKLOG.md:726`.
- Reviewer B: PASS (subagent final) with commit-anchored refs `5d9abd2`, `5b50bbc`, `09dcaf6`, `edd55de`, `3ab0d85`, `037254c`, `62f0df5`, `8c4c7a5`; WORKLOG refs `WORKLOG.md:666`, `WORKLOG.md:681`, `WORKLOG.md:696`, `WORKLOG.md:711`, `WORKLOG.md:726`.
- Evidence is commit-anchored per `ai/workflows/COMMIT_PROTOCOL.md`.

Coordinator Done checklist:

- 2x Ready verdicts exist
- Repo clean (`git status`)
- Closeout docs commit exists
- `PROJECT_STATUS.md` updated
- `WORKLOG.md` sprint closeout appended

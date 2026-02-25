SPRINT.md — Current Sprint

WHAT IT DO? Current sprint scope (maps to milestone + CAPs), DoD, proof commands. Reviewer Ready / Coordinator Done checklists.

Sprint ID: S5 - V1.1 trust and abuse hardening
Status: Active
Milestone mapping: M4 (post-M3 trust + abuse hardening)

Scope (maps to V1 CAPs in `ai/planning/V1_SPEC_LOCK.md`):

| Task ID | Objective | Done Criteria | Test/Evidence Command | Owner Role |
| --- | --- | --- | --- | --- |
| S5-T01 | Formalize scope expansion via CR-003 before implementation. | `ai/memory/CHANGE_REQUESTS.md` contains accepted CR-003 for CAPTCHA + fuzzy duplicate assistive matching; dependent lock docs are synced. | `git grep -nE "CR-003|Accepted|CAPTCHA|fuzzy" ai/memory/CHANGE_REQUESTS.md ai/planning/V1_SPEC_LOCK.md ai/roadmap/MILESTONES.md` | Coordinator |
| S5-T02 | Add CAPTCHA enforcement on public register path. | `POST /auth/register` validates CAPTCHA in non-test environments, preserves existing role-hardening semantics, and returns deterministic errors on missing/invalid verification. | `pnpm test -- -t "register captcha"` | Fixer |
| S5-T03 | Add CAPTCHA enforcement on politician proposal submit path. | `POST /politician-proposals` enforces CAPTCHA for eligible callers per policy while preserving existing dedupe/rate-limit/role behavior. | `pnpm test -- -t "proposal captcha"` | Fixer |
| S5-T04 | Add fuzzy duplicate assistive hints for moderation. | `GET /politician-proposals/:id/duplicate-assist` includes bounded fuzzy candidate hints with deterministic scoring; no auto-reject/auto-merge side effects. | `pnpm test -- -t "duplicate assist fuzzy"` | Fixer |
| S5-T05 | Add abuse telemetry surfaces for operations. | Telemetry/metrics include CAPTCHA failures/success and rate-limit outcomes for abuse triage. | `pnpm test -- -t "abuse telemetry"` | Fixer |
| S5-T06 | Harden anti-bypass and determinism regression coverage. | Tests cover CAPTCHA bypass attempts, moderation-only fuzzy access, and deterministic result ordering. | `pnpm test -- -t "captcha" && pnpm test -- -t "duplicate assist"` | Fixer |
| S5-T07 | Preserve lock-critical invariants under new controls. | Canonical create role gate, proposal review policy, statement lifecycle audit visibility, and revision history behavior remain unchanged. | `pnpm test -- -t "role matrix" && pnpm test -- -t "delete lifecycle visibility" && pnpm test -- -t "revision history"` | Fixer |
| S5-T08 | Full regression + sprint evidence aggregation. | Lint/typecheck/tests/e2e/build are green and `WORKLOG.md` records command summaries + commit hashes for each meaningful batch. | `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build` | Fixer |
| S5-T09 | Independent review gate per protocol. | Reviewer A/B PASS/FAIL include `WORKLOG` references; status can move to `Ready for Done` only with commit-anchored evidence. | `git status --short && git grep -nE "S5|PASS|FAIL|Commit" WORKLOG.md ai/roadmap/SPRINT.md PROJECT_STATUS.md` | Guardian + Reviewers |
| S5-T10 | Coordinator closeout docs synchronization. | Coordinator verifies ready state + clean tree, flips sprint to `Done`, and updates `PROJECT_STATUS.md`, `TASKS.md`, and `WORKLOG.md`. | `git status --short && git grep -nE "S5|PASS|FAIL|Commit" WORKLOG.md ai/roadmap/SPRINT.md PROJECT_STATUS.md` | Coordinator |

Execution phases:

- Phase A — Scope control and anti-abuse foundations (`S5-T01..S5-T03`): CR acceptance + CAPTCHA integration.
- Phase B — Moderation assist quality and observability (`S5-T04..S5-T06`): fuzzy assistive hints + abuse telemetry + anti-bypass tests.
- Phase C — Compatibility safety (`S5-T07`): preserve role/lifecycle/revision invariants.
- Phase D — Proof + closeout (`S5-T08..S5-T10`): full green evidence, independent reviews, docs/status sync.

Top risks and mitigations:

- Scope drift from V1 lock -> mitigate by requiring accepted CR-003 before implementation tasks.
- False positives from fuzzy matching -> mitigate with assistive-only output and deterministic score thresholds.
- CAPTCHA integration brittleness in tests -> mitigate with explicit test-mode hooks and focused regression suites.

Definition of Done:

- All S5 tasks meet done criteria and map to M4 scope.
- Anti-abuse controls and fuzzy assistive behavior are implemented without breaking existing invariants.
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

- Reviewer A: PASS/FAIL + WORKLOG reference
- Reviewer B: PASS/FAIL + WORKLOG reference
- Evidence is commit-anchored per `ai/workflows/COMMIT_PROTOCOL.md`

Coordinator Done checklist:

- 2x Ready verdicts exist
- Repo clean (`git status`)
- Closeout docs commit exists
- `PROJECT_STATUS.md` updated
- `WORKLOG.md` sprint closeout appended

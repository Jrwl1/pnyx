SPRINT.md — Current Sprint

WHAT IT DO? Current sprint scope (maps to milestone + CAPs), DoD, proof commands. Reviewer Ready / Coordinator Done checklists.

Sprint ID: S2 - Moderation Operations Hardening
Status: Active
Milestone mapping: M2 (post-M1 operations hardening)

Scope (maps to V1 CAPs in `ai/planning/V1_SPEC_LOCK.md`):

| Task ID | Objective | Done Criteria | Test/Evidence Command | Owner Role |
| --- | --- | --- | --- | --- |
| S2-T01 | Add proposal-ops schema migration for moderation assignment and decision metadata. | Migration adds queue-ops fields/indexes (assignee, assignment timestamps, decision code, review version) without data loss. | `pnpm migrate && pnpm test -- -t "migration"` | Fixer |
| S2-T02 | Implement moderator claim/release workflow for pending proposals. | `claim`/`release` endpoints enforce moderator/admin auth, deterministic ownership rules, and `409` on invalid state transitions. | `pnpm test -- -t "proposal queue ops"` | Fixer |
| S2-T03 | Expand queue read surfaces with pagination and operational filters. | Queue supports `status`, `assignee`, `ageBucket`, and deterministic sort/pagination for moderators; users still see only own proposals. | `pnpm test -- -t "proposal queue ops"` | Fixer |
| S2-T04 | Add backlog/SLA metrics endpoint for proposal operations. | Metrics endpoint returns pending counts by age bucket and assignment state for moderation triage dashboards. | `pnpm test -- -t "proposal sla metrics"` | Fixer |
| S2-T05 | Enforce decision reason taxonomy for reject/duplicate moderation outcomes. | Reject/duplicate actions require normalized reason code + optional note; invalid reason policy returns `400`. | `pnpm test -- -t "proposal reason policy"` | Fixer |
| S2-T06 | Add deterministic duplicate-assist surface for moderators. | Assist endpoint returns exact canonical/proposal matches by `externalId` or normalized tuple and never auto-merges. | `pnpm test -- -t "proposal duplicate assist"` | Fixer |
| S2-T07 | Harden proposal review transitions against concurrent/moderation race writes. | Review path uses optimistic locking/version checks; concurrent second decision returns deterministic `409` without partial writes. | `pnpm test -- -t "proposal review race"` | Fixer |
| S2-T08 | Expand moderation audit read model with activity filters. | Audit endpoint supports actor/action/status/date window filters + pagination for operational forensics. | `pnpm test -- -t "proposal audit filters"` | Fixer |
| S2-T09 | Add moderation-path rate limits for queue operations. | Claim/review/assist paths have dedicated configurable limits and clear `429` responses. | `pnpm test -- -t "proposal rate limit"` | Fixer |
| S2-T10 | Preserve canonical create/register hardening invariants while adding ops controls. | Existing guards remain intact (`user` cannot create canonical politician; register cannot self-assign privileged roles). | `pnpm test -- -t "politician dedupe" && pnpm test -- -t "register role hardening"` | Fixer |
| S2-T11 | Preserve CAP-001 read stability for non-moderation consumers. | Public statement/politician read surfaces remain unchanged for anonymous/user consumers. | `pnpm test -- -t "read surfaces"` | Fixer |
| S2-T12 | Run role-matrix and abuse-path regression for full moderation workflow. | Role matrix covers anonymous/user/moderator/admin access across submit/queue/review/create/audit/metrics/assist paths. | `pnpm test -- -t "role matrix"` | Fixer |
| S2-T13 | Full regression + sprint evidence aggregation. | Lint/typecheck/tests/e2e/build are green and WORKLOG has command summaries + commit hashes for each meaningful batch. | `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build` | Fixer |
| S2-T14 | Independent review gate and sprint closeout docs sync per protocol. | Reviewer A/B PASS/FAIL with WORKLOG references; status moves to `Ready for Done` only with commit-anchored evidence; coordinator performs clean-tree closeout. | `git status --short && rg -n "S2|PASS|FAIL|commit" WORKLOG.md ai/roadmap/SPRINT.md PROJECT_STATUS.md` | Guardian + Reviewers + Coordinator |

Execution phases:

- Phase A — Queue operations foundation (`S2-T01..S2-T04`): schema/ownership/filtering/metrics baseline.
- Phase B — Decision quality + safety (`S2-T05..S2-T08`): reason policy, duplicate assist, race safety, audit filters.
- Phase C — Abuse control + compatibility (`S2-T09..S2-T12`): moderation rate limits, invariant preservation, role matrix.
- Phase D — Proof + closeout (`S2-T13..S2-T14`): full green evidence, independent reviews, docs/status sync.

Top risks and mitigations:

- Moderator throughput bottlenecks -> mitigate with claim/release ownership, age-bucket triage metrics, and explicit backlog filters.
- Inconsistent moderation reasons -> mitigate with strict reason code taxonomy and validation tests.
- Concurrent review collisions -> mitigate with optimistic locking and race-condition regression suites.
- Regression of S1 guardrails -> mitigate with invariant tests for canonical create auth and register role hardening.

Definition of Done:

- All S2 tasks meet done criteria and map to moderation-ops hardening scope in `ai/planning/V1_SPEC_LOCK.md`.
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

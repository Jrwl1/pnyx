SPRINT.md — Current Sprint

WHAT IT DO? Current sprint scope (maps to milestone + CAPs), DoD, proof commands. Reviewer Ready / Coordinator Done checklists.

Sprint ID: S1 - Moderated Politician Intake + Governance Hardening
Status: Done
Milestone mapping: M1 (post-M0 governance hardening)

Scope (maps to V1 CAPs in `ai/planning/V1_SPEC_LOCK.md`):

| Task ID | Objective | Done Criteria | Test/Evidence Command | Owner Role |
| --- | --- | --- | --- | --- |
| S1-T01 | Activate CR-002 and synchronize locked spec + roadmap docs for moderated intake policy. | `ai/memory/CHANGE_REQUESTS.md` has accepted CR-002 and dependent docs are updated without CAP drift. | `rg -n "CR-002|moderated|proposal" ai/memory/CHANGE_REQUESTS.md ai/planning/V1_SPEC_LOCK.md ai/roadmap/MILESTONES.md ai/roadmap/SPRINT.md PROJECT_STATUS.md` | Coordinator |
| S1-T02 | Add proposal data model + migration(s) (`politician_proposals` and lifecycle metadata/indexes). | Migration applies cleanly; rollback story documented; uniqueness/index rules support queue lookups and dedupe checks. | `pnpm migrate && pnpm test -- -t "migration"` | Fixer |
| S1-T03 | Implement proposal submit endpoint for authenticated users. | `POST /politician-proposals` validates required inputs and creates `pending` proposals; anonymous is denied. | `pnpm test -- -t "politician proposal submit"` | Fixer |
| S1-T04 | Implement moderator/admin proposal review workflow (`approve|reject|duplicate`). | Review endpoint enforces role checks, records actor/reason/timestamp, and blocks invalid/no-op transitions with `409`. | `pnpm test -- -t "politician proposal review"` | Fixer |
| S1-T05 | Enforce moderator/admin-only canonical politician creation path. | `POST /politicians` denies `anonymous|user` with `403`; `moderator|admin` keep dedupe semantics and successful create flow. | `pnpm test -- -t "politician dedupe"` | Fixer |
| S1-T06 | Implement atomic approval-to-canonical-create linking. | Proposal `approve` transaction either links existing canonical politician or creates one; dedupe conflicts return deterministic `409`; proposal links canonical id. | `pnpm test -- -t "proposal approval create link"` | Fixer |
| S1-T07 | Harden registration so public self-service cannot assign privileged roles. | `/auth/register` only produces `user` role for public caller path; privileged role attempts are rejected with explicit response contract. | `pnpm test -- -t "register role hardening"` | Fixer |
| S1-T08 | Add proposal queue read surfaces for submitters and moderators. | Users can view own proposals; moderators/admins can view queue with filters (`pending`, decision status, duplicates). | `pnpm test -- -t "politician proposal queue"` | Fixer |
| S1-T09 | Add abuse controls: dedicated rate limits for proposal submit + moderated canonical create. | Proposal/create limits enforce `429` with clear messages; limits are independently configurable. | `pnpm test -- -t "proposal rate limit" && pnpm test -- -t "rate limit 429"` | Fixer |
| S1-T10 | Add intake/moderation audit events and read model. | Proposal lifecycle actions are audit-visible (actor, decision, reason, timestamp, linked politician id). | `pnpm test -- -t "politician proposal audit"` | Fixer |
| S1-T11 | Preserve CAP-001 read stability while integrating moderated intake. | Public read surfaces remain stable and canonical politician listing behavior is unchanged for non-proposal consumers. | `pnpm test -- -t "read surfaces"` | Fixer |
| S1-T12 | End-to-end abuse-path and privilege-regression matrix. | Tests cover anonymous/user/moderator/admin matrix for proposal submit, proposal review, canonical create, and register hardening. | `pnpm test -- -t "role matrix"` | Fixer |
| S1-T13 | Full regression + sprint evidence aggregation. | Lint/typecheck/tests/e2e/build are green and WORKLOG has command summaries + commit hashes for each meaningful batch. | `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build` | Fixer |
| S1-T14 | Independent review gate and sprint closeout docs sync per protocol. | Reviewer A/B PASS/FAIL with WORKLOG references; status can move to `Ready for Done` only with commit-anchored evidence; coordinator performs clean-tree closeout. | `git status --short && rg -n "S1|PASS|FAIL|commit|CR-002" WORKLOG.md ai/roadmap/SPRINT.md PROJECT_STATUS.md` | Guardian + Reviewers + Coordinator |

Execution phases:

- Phase A — Policy + contract activation (`S1-T01..S1-T02`): lock scope alignment first so implementation cannot drift.
- Phase B — Core intake workflow (`S1-T03..S1-T08`): submit, review, moderated create, proposal queue read surfaces.
- Phase C — Abuse resistance + regression matrix (`S1-T09..S1-T12`): rate limits, audits, privilege hardening, role-matrix validation.
- Phase D — Proof + closeout (`S1-T13..S1-T14`): full green evidence, independent reviews, docs/status sync.

Top risks and mitigations:

- Moderator queue overload -> mitigate with explicit queue views/filters, capped SLA targets, and decision reason telemetry.
- Privilege escalation through auth/register or token flows -> mitigate with register hardening tests and role-matrix regression suite.
- Canonical dedupe regressions during approve/create transaction -> mitigate with transaction-based approve path and duplicate conflict tests.
- Client breakage from new `403` behavior on direct politician create -> mitigate with release notes and explicit API contract updates before rollout.

Definition of Done:

- All S1 tasks meet done criteria and map to moderated intake + governance hardening scope in `ai/planning/V1_SPEC_LOCK.md`.
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

- Reviewer A: PASS + WORKLOG refs (`2088788`, `dba6147`, `5be3676`, `f0c4603`, `f0513f8`)
- Reviewer B: PASS + WORKLOG refs (`2088788`, `dba6147`, `5be3676`, `f0c4603`, `f0513f8`)
- Evidence is commit-anchored per `ai/workflows/COMMIT_PROTOCOL.md`

Coordinator Done checklist:

- 2x Ready verdicts exist
- Repo clean (`git status`)
- Closeout docs commit exists
- `PROJECT_STATUS.md` updated
- `WORKLOG.md` sprint closeout appended

SPRINT.md — Current Sprint

WHAT IT DO? Current sprint scope (maps to milestone + CAPs), DoD, proof commands. Reviewer Ready / Coordinator Done checklists.

Sprint ID: S0 - Locked V1 Core Implementation
Status: Ready for Done
Milestone mapping: M0 (first implementation milestone)

Scope (maps to V1 CAPs in `ai/planning/V1_SPEC_LOCK.md`):

| Task ID | Objective | Done Criteria | Test/Evidence Command | Owner Role |
| --- | --- | --- | --- | --- |
| S0-T01 | Establish V1 app skeleton for TypeScript service, auth roles, and baseline data schema. | App starts, migrations apply, role guards for `anonymous/user/moderator/admin` are wired for protected operations. | `pnpm lint && pnpm typecheck && pnpm build` | Fixer |
| S0-T02 | Implement CAP-002 politician create/list with canonical dedupe precedence (`externalId` first, else normalized `(name,region,office)`). | Authenticated create works; anonymous create denied; duplicate keys return `409`; list endpoint returns created politician records. | `pnpm test -- -t "politician dedupe"` | Fixer |
| S0-T03 | Implement CAP-003 statement create/list with required fields, initial `pending` status, exact duplicate key `(politicianId, normalizedBodyHash, sourceUrl)`. | Create requires `politicianId/sourceUrl/body/dateSaid`; unknown politician returns `404`; duplicate returns `409`; statement created as `pending`. | `pnpm test -- -t "statement capture"` | Fixer |
| S0-T04 | Implement CAP-004 statement edit policy (author within 30 minutes; moderator/admin any non-deleted statement) with immutable audit rows. | Author edits inside window pass; outside window denied; moderator/admin override works; each edit writes `RevisionAudit` row. | `pnpm test -- -t "edit window and audit"` | Fixer |
| S0-T05 | Implement CAP-005 verification lifecycle transitions and mandatory downgrade reasons. | Only moderator/admin can change status; allowed transitions enforced; downgrade transitions require reason; invalid/no-op transitions return `409`; audit recorded. | `pnpm test -- -t "verification transitions"` | Fixer |
| S0-T06 | Implement CAP-006 voting with one-row-per-user-per-statement overwrite behavior and visible aggregate. | Authenticated vote works; recast overwrites existing row; anonymous vote denied; aggregate reflects overwrite. | `pnpm test -- -t "vote overwrite aggregate"` | Fixer |
| S0-T07 | Implement CAP-007 withdraw/pending-delete/approve-delete lifecycle and role-aware list visibility defaults. | Author withdraw soft-deletes; moderator/admin can propose delete; admin-only approve delete; public/user lists exclude deleted+pending by default; mod/admin include pending by default. | `pnpm test -- -t "delete lifecycle visibility"` | Fixer |
| S0-T08 | Implement CAP-008 public revision history read flow tied to statement detail. | Revision history endpoint/read model returns ordered audit rows; non-existent statement returns `404`; history visible to anonymous and authenticated users. | `pnpm test -- -t "revision history"` | Fixer |
| S0-T09 | Implement CAP-001 read surfaces for politicians/statements/detail with verification + vote aggregate + revision access. | Browse/list/detail flows work for anonymous users; invalid ids return `404`; empty state returns empty list; detail includes status + aggregate + history reference. | `pnpm test -- -t "read surfaces"` | Fixer |
| S0-T10 | Enforce V1 rate limits (login/register/add-statement/vote/global fallback) with clear `429` responses. | Configured limits are active; exceeded limits return `429` with clear message; protected write/auth paths covered in tests. | `pnpm test -- -t "rate limit 429"` | Fixer |
| S0-T11 | Run full regression proof suite and record evidence for sprint readiness. | Lint/typecheck/tests/e2e/build are green; WORKLOG contains command summaries and commit hashes for each meaningful step. | `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build` | Fixer |
| S0-T12 | Independent review gate and sprint closeout docs sync per protocol. | Reviewer A and B record PASS/FAIL with WORKLOG references; status moves to `Ready for Done` only with evidence; coordinator performs clean-tree closeout and status updates. | `git status --short && rg -n "S0|PASS|FAIL|commit" WORKLOG.md ai/roadmap/SPRINT.md PROJECT_STATUS.md` | Guardian + Reviewers + Coordinator |

Definition of Done:

- All S0 tasks meet done criteria and map to CAP-001..CAP-008 plus rate-limit/proof/closeout scope.
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

- Reviewer A: PASS + WORKLOG refs (`2f0294f`, `6d5ed30`, `8ac6dd6`, `35cf00a`, `b87c6fc`, `d4c313d`, `cfbe827`, `54beb3d`, `0d32192`, `b9a323d`)
- Reviewer B: PASS + WORKLOG refs (`2f0294f`, `6d5ed30`, `8ac6dd6`, `35cf00a`, `b87c6fc`, `d4c313d`, `cfbe827`, `54beb3d`, `0d32192`, `b9a323d`)
- Evidence is commit-anchored per `ai/workflows/COMMIT_PROTOCOL.md`

Coordinator Done checklist:

- 2x Ready verdicts exist
- Repo clean (`git status`) — pending; currently `M ai/planning/PITCH.md` (pre-existing unrelated edit)
- Closeout docs commit exists
- `PROJECT_STATUS.md` updated
- `WORKLOG.md` sprint closeout appended

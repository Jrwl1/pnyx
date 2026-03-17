# Sprint

Window: 2026-03-17 to 2026-05-26

Executable DO queue. Execute top-to-bottom.
Each `Do` checklist must stay flat and each substep must be small enough to complete in one DO run.
Evidence policy: commit-per-packet. Each checked substep must include packet hash, run summary, and changed files.
Execution policy: after `DO` or `RUNSPRINT`, run continuous `DO -> REVIEW` cycles until all active rows are `DONE` or a protocol blocker is hit.
Clean-tree policy: protocol cleanliness is defined by `git status --porcelain`; ignored local files are out of scope, while tracked changes and untracked non-ignored files still block DO and REVIEW completion.
DO baseline policy: DO may start from dirty tracked or unignored state only when every pre-existing dirty path is already inside the selected packet `Files` scope and can be safely absorbed into that packet.
MCP policy: use direct MCP tools when they help gather evidence or verify behavior. Do not use delegation or autopilot tooling.
Required substep shape:

- `- [ ] <imperative action>`
- `  - files: <paths/globs>`
- `  - run: <command(s)>` or `N/A` only when the substep text explicitly allows it
- `  - evidence: packet:<hash> | run:<cmd> -> <result> | files:<changed paths> | docs:<hash or N/A> | status: clean`

## Goal (this sprint)

Move Pnyx from a feature-complete-enough accountability product to a launchable Finland-first public service by replacing the current shared-secret auth flow, exposing protected editorial operations for launch-critical trust data, adding durable automated regression coverage, hardening release and deploy orchestration, and ending with a final launch UI audit and go-or-no-go proof pass.

---

| ID | Do | Files | Acceptance | Evidence | Stop | Status |
| --- | --- | --- | --- | --- | --- | --- |
| S-27 | Replace the current shared-secret public sign-in model with launch-safe email-based sessions and secure role provisioning. See `S-27` substeps below. | `migrations/**`, `src/server.ts`, `src/auth/**`, `frontend/src/App.tsx`, `frontend/src/context/**`, `frontend/src/components/**`, `frontend/src/routes/RegisterPage.tsx`, `frontend/src/routes/SignInPage.tsx`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `test/**` | Public auth no longer requires entering the server token secret or choosing a role in the browser; registered email identities can sign in through a launch-safe session flow; moderator/admin provisioning is kept behind secured paths; regression and browser checks pass for register, sign-in, sign-out, redirect, and protected-route behavior. | Accepted in REVIEW. Packets `1f010a8` and `a7d1b5c` landed email-code auth, admin role grants, redirect-preserving auth UX, and the gate-fix CORS path used for fresh-browser verification on the isolated `4185 -> 3008` pair; `pnpm test`, `pnpm frontend:typecheck`, and `pnpm frontend:build` passed; browser verification covered register, sign-in, sign-out, protected-route redirect, redirect preservation through register, and post-verify redirect to `/contribute/politicians/new`. | Stop if launch-safe auth cannot be delivered without introducing an external provider dependency that is not representable in repo-managed config, tests, or secure bootstrap paths. | DONE |
| S-28 | Expose protected editorial operations for launch-critical trust records and launch coverage completeness. See `S-28` substeps below. | `frontend/src/App.tsx`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `src/server.ts`, `src/db/**`, `test/**` | Protected product surfaces exist for party stances, vote events, vote records, fulfillment assessments, and party-line assessments; moderators or admins can maintain launch-critical truth data without direct database edits or manual-only seeding; launch completeness views identify gaps in party, politician, promise, and trust coverage; tests and browser checks pass. | Pending. Each checked substep must record packet, run, files, docs, and clean-tree evidence, and REVIEW must accept the row against the editorial-ops and launch-coverage criteria. | Stop if a launch-critical record type still depends on direct database mutation or non-repeatable manual seeding outside protected product surfaces. | TODO |
| S-29 | Add durable automated regression coverage for critical public, contributor, moderation, and editorial flows. See `S-29` substeps below. | `package.json`, `frontend/package.json`, `vitest*.ts`, `frontend/**`, `test/**`, `.github/workflows/**` | Critical public routes, auth flows, contributor submission flows, moderator queues, and editorial ops flows are covered by durable automated tests in repo; the launch proof chain includes those checks; workflow changes include the required security-audit note when sensitive files are touched. | Pending. Each checked substep must record packet, run, files, docs, and clean-tree evidence, and REVIEW must accept the row against the automated-coverage and proof-chain criteria. | Stop if adding the required automated coverage would force a second planning system or rely on external CI services that cannot be represented through repo-managed workflows and docs. | TODO |
| S-30 | Harden release sequencing, observability, backup/restore rehearsal, and launch runbooks. See `S-30` substeps below. | `src/server.ts`, `package.json`, `.github/workflows/**`, `docs/TRACEABILITY_V1.md`, `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`, `docs/security/**`, `frontend/README.md`, `test/**` | Release docs, smoke checks, observability, backup/restore rehearsal, and deploy sequencing are updated for the completed accountability graph; launch metrics and release evidence are reproducible; any sensitive workflow/config changes ship with the required security-audit note; staging-like release rehearsal passes from a clean tree. | Pending. Each checked substep must record packet, run, files, docs, and clean-tree evidence, and REVIEW must accept the row against the release-hardening and deploy-rehearsal criteria. | Stop if required deploy orchestration depends on unmanaged platform state that cannot be captured through repo docs, workflows, or repeatable smoke commands. | TODO |
| S-31 | Run the final launch dry run, route-wide audit, and go-or-no-go proof from the launch-ready baseline. See `S-31` substeps below. | `src/server.ts`, `frontend/src/**`, `package.json`, `frontend/package.json`, `test/**`, `.github/workflows/**`, `docs/TRACEABILITY_V1.md`, `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`, `docs/security/**`, `frontend/README.md` | Launch candidate data coverage is loaded or verified for the Finland-first slice; the full static, automated, browser, accessibility, and manual UI audit passes from a clean tree; remaining launch risks are documented; a go-or-no-go verdict is supported by evidence rather than assumptions. | Pending. Each checked substep must record packet, run, files, docs, and clean-tree evidence, and REVIEW must accept the row against the final launch-readiness and route-wide audit criteria. | Stop if the final rehearsal surfaces a blocking regression or content gap that cannot be resolved within the same launchability area. | TODO |

### S-27 substeps

- [x] Add launch-safe auth/session schema and backend support aligned to registered email identities
  - files: `migrations/**`, `src/server.ts`, `src/auth/**`, `test/**`
  - run: `pnpm test`
  - evidence: packet:1f010a81916b6096d3952c55432afe181a92e43d | run:pnpm test -> pass | files:frontend/src/context/AuthContext.tsx, frontend/src/lib/api.ts, frontend/src/routes/OpsPage.tsx, frontend/src/routes/RegisterPage.tsx, frontend/src/routes/SignInPage.tsx, frontend/src/types.ts, migrations/0009_email_auth.sql, src/auth/context.ts, src/auth/email-login.ts, src/auth/jwt.ts, src/server.ts, test/email-auth.test.ts, test/migration.test.ts | docs:N/A | status: clean

- [x] Add one-time email login code or equivalent launch-safe session issuance flow and preserve secure sign-out and session restore behavior
  - files: `migrations/**`, `src/server.ts`, `src/auth/**`, `test/**`
  - run: `pnpm test`
  - evidence: packet:1f010a81916b6096d3952c55432afe181a92e43d | run:pnpm test -> pass | files:frontend/src/context/AuthContext.tsx, frontend/src/lib/api.ts, frontend/src/routes/OpsPage.tsx, frontend/src/routes/RegisterPage.tsx, frontend/src/routes/SignInPage.tsx, frontend/src/types.ts, migrations/0009_email_auth.sql, src/auth/context.ts, src/auth/email-login.ts, src/auth/jwt.ts, src/server.ts, test/email-auth.test.ts, test/migration.test.ts | docs:N/A | status: clean

- [x] Remove public role selection and server-secret entry from the register/sign-in UX while keeping safe redirects and protected-route behavior intact
  - files: `frontend/src/App.tsx`, `frontend/src/context/**`, `frontend/src/components/**`, `frontend/src/routes/RegisterPage.tsx`, `frontend/src/routes/SignInPage.tsx`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:1f010a81916b6096d3952c55432afe181a92e43d | run:pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/context/AuthContext.tsx, frontend/src/lib/api.ts, frontend/src/routes/OpsPage.tsx, frontend/src/routes/RegisterPage.tsx, frontend/src/routes/SignInPage.tsx, frontend/src/types.ts, migrations/0009_email_auth.sql, src/auth/context.ts, src/auth/email-login.ts, src/auth/jwt.ts, src/server.ts, test/email-auth.test.ts, test/migration.test.ts | docs:N/A | status: clean

- [x] Add secure moderator/admin provisioning or bootstrap paths outside the public sign-in flow
  - files: `src/server.ts`, `src/auth/**`, `frontend/src/routes/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:1f010a81916b6096d3952c55432afe181a92e43d | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/context/AuthContext.tsx, frontend/src/lib/api.ts, frontend/src/routes/OpsPage.tsx, frontend/src/routes/RegisterPage.tsx, frontend/src/routes/SignInPage.tsx, frontend/src/types.ts, migrations/0009_email_auth.sql, src/auth/context.ts, src/auth/email-login.ts, src/auth/jwt.ts, src/server.ts, test/email-auth.test.ts, test/migration.test.ts | docs:N/A | status: clean

- [x] Run auth regression and browser verification for register, sign-in, sign-out, redirect, and protected-route flows
  - files: `frontend/src/**`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build && playwright or chrome-devtools verification of launch auth flows`
  - evidence: packet:a7d1b5c79f08d19a104dc4892e47c1b7fa93db4f | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build && chrome-devtools verification of /register, /sign-in, sign-out, protected-route redirect, register-to-sign-in redirect preservation, and post-verify redirect to /contribute/politicians/new on http://127.0.0.1:4185 with backend http://127.0.0.1:3008 -> pass | files:frontend/src/routes/RegisterPage.tsx, frontend/src/routes/SignInPage.tsx, src/server.ts | docs:N/A | gate-fix:src/server.ts,frontend/src/routes/RegisterPage.tsx,frontend/src/routes/SignInPage.tsx | status: clean

### S-28 substeps

- [ ] Add protected ops routes and forms for party stance creation, update, and review-safe maintenance
  - files: `frontend/src/App.tsx`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Add protected ops routes and forms for vote-event and politician-vote-record entry and maintenance
  - files: `frontend/src/App.tsx`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Add protected ops routes and forms for fulfillment assessments and party-line assessments
  - files: `frontend/src/App.tsx`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Add launch coverage completeness views for target parties, politicians, canonical promises, and trust records
  - files: `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `src/server.ts`, `src/db/**`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Run browser verification for editorial ops and launch coverage views from moderator/admin sessions
  - files: `frontend/src/**`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build && playwright or chrome-devtools verification of editorial ops flows`
  - evidence: Pending.

### S-29 substeps

- [ ] Add a durable frontend/browser test harness and repo scripts for launch-critical flows
  - files: `package.json`, `frontend/package.json`, `vitest*.ts`, `frontend/**`, `test/**`
  - run: `pnpm lint && pnpm typecheck && pnpm frontend:typecheck`
  - evidence: Pending.

- [ ] Add automated smoke coverage for critical public routes and trust-data rendering states
  - files: `frontend/**`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Add automated auth and contributor-flow coverage for register, sign-in, statement submission, proposal submission, and promise-claim submission
  - files: `frontend/**`, `test/**`, `src/server.ts`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Add automated moderator/editorial ops coverage for proposal review, claim canonization, party stance entry, vote-event entry, and trust assessment maintenance
  - files: `frontend/**`, `test/**`, `src/server.ts`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Wire the launch proof chain and workflow coverage into the repo with the required security-audit note if sensitive workflow files change
  - files: `package.json`, `.github/workflows/**`, `docs/security/**`, `test/**`
  - run: `pnpm lint && pnpm typecheck && pnpm test && pnpm frontend:typecheck`
  - evidence: Pending.

### S-30 substeps

- [ ] Refresh environment, secret, and launch smoke requirements for staging and production deploys
  - files: `docs/RELEASE_READINESS_RUNBOOK.md`, `frontend/README.md`
  - run: `N/A`
  - evidence: Pending.

- [ ] Add deploy or release orchestration plus the required security-audit note for any sensitive workflow or config changes
  - files: `.github/workflows/**`, `docs/security/**`, `package.json`
  - run: `pnpm lint && pnpm typecheck && pnpm test`
  - evidence: Pending.

- [ ] Add or harden launch observability and smoke checks for health, search, auth, contributor, moderation, and editorial ops paths
  - files: `src/server.ts`, `test/**`, `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`
  - run: `pnpm test`
  - evidence: Pending.

- [ ] Rehearse backup/restore and rollback procedure for the launch database and release path
  - files: `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`
  - run: `N/A`
  - evidence: Pending.

- [ ] Refresh traceability, release evidence, and metrics docs for the launchability baseline
  - files: `docs/TRACEABILITY_V1.md`, `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`, `frontend/README.md`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Run a staging-like release rehearsal from a clean tree using the hardened proof chain and smoke checklist
  - files: `src/server.ts`, `frontend/src/**`, `test/**`, `.github/workflows/**`, `docs/TRACEABILITY_V1.md`, `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`, `docs/security/**`, `frontend/README.md`
  - run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

### S-31 substeps

- [ ] Load or verify launch-candidate Finland-first data coverage for public parties, politicians, canonical promises, and trust records
  - files: `frontend/src/**`, `src/server.ts`, `test/**`, `docs/TRACEABILITY_V1.md`, `docs/SUCCESS_METRICS_PLAN.md`
  - run: `pnpm test`
  - evidence: Pending.

- [ ] Run the full static and automated launch proof chain including the new frontend and browser coverage
  - files: `package.json`, `frontend/package.json`, `src/server.ts`, `frontend/src/**`, `test/**`, `.github/workflows/**`
  - run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Run browser and accessibility verification across all public, auth, contributor, moderator, and editorial routes required for launch
  - files: `frontend/src/**`
  - run: `playwright or chrome-devtools verification of all launch-critical routes and flows`
  - evidence: Pending.

- [ ] Complete the final launch UI audit, manual regression sweep, and go-or-no-go proof across every critical route and flow
  - files: `src/server.ts`, `frontend/src/**`, `package.json`, `frontend/package.json`, `test/**`, `.github/workflows/**`, `docs/TRACEABILITY_V1.md`, `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`, `docs/security/**`, `frontend/README.md`
  - run: `ui-audit plus manual playwright or chrome-devtools verification of every launch-critical public, contributor, moderator, editorial, and trust flow`
  - evidence: Pending.

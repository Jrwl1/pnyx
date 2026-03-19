# Sprint

Window: 2026-03-18 to 2026-07-31

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

Move Pnyx from a launch-ready Finland-first public service into a sustainable post-launch product by retiring leftover auth debt, exposing missing admin and public surfaces, shipping route-level SEO, adding explicit event and notification infrastructure, improving moderation ergonomics, automating Finland-first ingest, and re-proving the widened stack from a clean tree.

Launch closeout rows `S-27` through `S-31` are retained below as accepted evidence. Active execution resumes at `S-32`.

---

| ID | Do | Files | Acceptance | Evidence | Stop | Status |
| --- | --- | --- | --- | --- | --- | --- |
| S-27 | Replace the current shared-secret public sign-in model with launch-safe email-based sessions and secure role provisioning. See `S-27` substeps below. | `migrations/**`, `src/server.ts`, `src/auth/**`, `frontend/src/App.tsx`, `frontend/src/context/**`, `frontend/src/components/**`, `frontend/src/routes/RegisterPage.tsx`, `frontend/src/routes/SignInPage.tsx`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `test/**` | Public auth no longer requires entering the server token secret or choosing a role in the browser; registered email identities can sign in through a launch-safe session flow; moderator/admin provisioning is kept behind secured paths; regression and browser checks pass for register, sign-in, sign-out, redirect, and protected-route behavior. | Accepted in REVIEW. Packets `1f010a8` and `a7d1b5c` landed email-code auth, admin role grants, redirect-preserving auth UX, and the gate-fix CORS path used for fresh-browser verification on the isolated `4185 -> 3008` pair; `pnpm test`, `pnpm frontend:typecheck`, and `pnpm frontend:build` passed; browser verification covered register, sign-in, sign-out, protected-route redirect, redirect preservation through register, and post-verify redirect to `/contribute/politicians/new`. | Stop if launch-safe auth cannot be delivered without introducing an external provider dependency that is not representable in repo-managed config, tests, or secure bootstrap paths. | DONE |
| S-28 | Expose protected editorial operations for launch-critical trust records and launch coverage completeness. See `S-28` substeps below. | `frontend/src/App.tsx`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `src/server.ts`, `src/db/**`, `test/**` | Protected product surfaces exist for party stances, vote events, vote records, fulfillment assessments, and party-line assessments; moderators or admins can maintain launch-critical truth data without direct database edits or manual-only seeding; launch completeness views identify gaps in party, politician, promise, and trust coverage; tests and browser checks pass. | Accepted in REVIEW. Packets `eeb0b64` and `e9af365` landed the protected `/ops/records` surface, launch-coverage endpoint, and the direct-backend verification stabilizers; `pnpm test`, `pnpm frontend:typecheck`, and `pnpm frontend:build` passed; browser verification covered `/ops/records` and `/ops/claims` under an admin session on the isolated `4189 -> 3009` pair. | Stop if a launch-critical record type still depends on direct database mutation or non-repeatable manual seeding outside protected product surfaces. | DONE |
| S-29 | Add durable automated regression coverage for critical public, contributor, moderation, and editorial flows. See `S-29` substeps below. | `package.json`, `frontend/package.json`, `pnpm-lock.yaml`, `vitest*.ts`, `playwright.config.*`, `frontend/**`, `test/**`, `.github/workflows/**`, `docs/security/**` | Critical public routes, auth flows, contributor submission flows, moderator queues, and editorial ops flows are covered by durable automated tests in repo; the launch proof chain includes those checks; workflow or dependency changes include the required security-audit note when sensitive files or CI wiring are touched. | Accepted in REVIEW. Packets `38c17ea` and `786cd17` landed dependency-backed Playwright coverage, repo scripts, CI proof wiring, and the required security audit note; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm frontend:typecheck`, `pnpm frontend:build`, and `pnpm test:ui` all passed. | Stop if the dependency-backed browser automation path cannot be made repeatable on the target Windows environment even after widening the sprint scope to include lockfile and browser-test wiring. | DONE |
| S-30 | Harden release sequencing, observability, backup/restore rehearsal, and launch runbooks. See `S-30` substeps below. | `src/server.ts`, `package.json`, `.github/workflows/**`, `docs/TRACEABILITY_V1.md`, `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`, `docs/security/**`, `frontend/README.md`, `test/**` | Release docs, smoke checks, observability, backup/restore rehearsal, and deploy sequencing are updated for the completed accountability graph; launch metrics and release evidence are reproducible; any sensitive workflow/config changes ship with the required security-audit note; staging-like release rehearsal passes from a clean tree. | Accepted in REVIEW. Packets `7e61e28` and `247894b` landed the release proof scripts, manual release-rehearsal workflow, security audit note, and the smoke-script fix; `pnpm proof:launch` and `SMOKE_BASE_URL=http://127.0.0.1:3013 pnpm smoke:release` both passed. | Stop if required deploy orchestration depends on unmanaged platform state that cannot be captured through repo docs, workflows, or repeatable smoke commands. | DONE |
| S-31 | Run the final launch dry run, route-wide audit, and go-or-no-go proof from the launch-ready baseline. See `S-31` substeps below. | `src/server.ts`, `frontend/src/**`, `package.json`, `frontend/package.json`, `test/**`, `.github/workflows/**`, `docs/TRACEABILITY_V1.md`, `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`, `docs/security/**`, `frontend/README.md` | Launch candidate data coverage is loaded or verified for the Finland-first slice; the full static, automated, browser, accessibility, and manual UI audit passes from a clean tree; remaining launch risks are documented; a go-or-no-go verdict is supported by evidence rather than assumptions. | Accepted in REVIEW. Packet `f194057` landed shared launch-rehearsal seed and coverage helpers, a deterministic seed test, the protected `/claims/:id` route fix, broader Playwright route coverage, and refreshed launch runbooks; `pnpm test`, `pnpm proof:launch`, `DB_PATH=%TEMP%\\pnyx-final-launch.db pnpm seed:launch-rehearsal`, `DB_PATH=%TEMP%\\pnyx-final-launch.db pnpm launch:coverage`, and `SMOKE_BASE_URL=http://127.0.0.1:3014 pnpm smoke:release` all passed; chrome-devtools route sweep across public, auth, contributor, moderation, editorial, and trust routes on `4314 -> 3014` passed with no failed network requests or app-console errors; Lighthouse snapshot accessibility stayed `100` on home, politician profile, promise detail, and ops records, while SEO remained a documented non-blocking follow-up at `60` on dev-server pages. | Stop if the final rehearsal surfaces a blocking regression or content gap that cannot be resolved within the same launchability area. | DONE |
| S-32 | Retire remaining auth debt and expose the missing admin and public surfaces already supported by backend reality. See `S-32` substeps below. | `src/server.ts`, `src/auth/**`, `frontend/src/App.tsx`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/context/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `test/**`, `docs/RELEASE_READINESS_RUNBOOK.md`, `frontend/README.md` | The legacy `/auth/token` shared-secret flow is removed from backend, client, tests, and docs; protected product surfaces exist for party creation, alias maintenance, membership create or update, and direct canonical-promise creation; public users can browse promises from a dedicated `/promises` route; regression and browser checks pass. | Accepted in REVIEW. Packets `ee7ea23`, `a36e199`, `806c378`, and `8d714af` removed the legacy `/auth/token` route, added a protected `/ops/admin` surface, shipped a public `/promises` browse route, and widened Playwright coverage; `pnpm test`, `pnpm frontend:typecheck`, `pnpm frontend:build`, and `pnpm test:ui` all passed. | Stop if removing the legacy auth path reveals an unmanaged deploy or bootstrap dependency that cannot be represented through repo-managed bootstrap helpers, tests, or explicit admin provisioning flows. | DONE |
| S-33 | Add route-level SEO, search-preview metadata, and crawler-facing verification for the public discovery surface. See `S-33` substeps below. | `frontend/index.html`, `frontend/src/App.tsx`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/context/**`, `frontend/src/lib/**`, `frontend/src/types.ts`, `package.json`, `test/**` | Home, directory, profile, promise, and methodology routes emit stable titles, descriptions, canonical URLs, and social preview tags; repo-managed sitemap or robots handling exists where required; automated verification covers metadata completeness on critical public routes. | Accepted in REVIEW. Packets `c6df348`, `efeb947`, and `dfae8e4` added the shared `PageMeta` primitive, route-specific search-preview tags, build-generated crawler artifacts, and Playwright assertions over titles, descriptions, canonical links, and preview metadata on the widened public route set; `pnpm frontend:typecheck`, `pnpm frontend:build`, and `pnpm test:ui` all passed. | Stop if reliable crawler-facing metadata requires an unmanaged hosting-specific SSR path that cannot be represented through repo-managed build, prerender, or proof steps. | DONE |
| S-34 | Build explicit event logging, notification primitives, and metrics foundations for the post-launch service. See `S-34` substeps below. | `migrations/**`, `src/server.ts`, `src/auth/**`, `src/db/**`, `frontend/src/App.tsx`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/context/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `test/**`, `docs/SUCCESS_METRICS_PLAN.md`, `docs/TRACEABILITY_V1.md` | Append-only product event logging exists for auth, contribution, moderation, and editorial actions; notification records, delivery tracking, and user preference surfaces exist; success-metric and traceability docs no longer depend only on proxy retention assumptions; tests and browser checks pass. | Accepted in REVIEW. Packets `2eb4923`, `3b64dee`, `8a35931`, `0dca03b`, and `c4c2b96` added the append-only event log, event emission across core flows, notification foundations plus `/me` APIs, an authenticated `/notifications` surface, refreshed metrics and traceability docs, and Playwright verification for the notifications route; `pnpm test`, `pnpm frontend:typecheck`, `pnpm frontend:build`, and `pnpm test:ui` all passed. | Stop if notification delivery depends on an unmanaged external provider path that cannot be represented through repo-managed config, inline delivery, or repeatable tests. | DONE |
| S-35 | Add contributor reputation, stronger moderation ergonomics, and broader abuse signals beyond the launch-safe baseline. See `S-35` substeps below. | `migrations/**`, `src/server.ts`, `src/db/**`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `test/**` | Contributor reputation is derived from moderation outcomes; moderator queues expose risk and priority signals plus richer abuse telemetry; regression and browser checks prove the upgraded queue behavior without introducing opaque public scoring. | Accepted in REVIEW. Packets `4b00897`, `dfec4f3`, `6ae94e9`, and `ef75359` added the contributor-reputation foundation, surfaced submitter risk signals in both moderation queues, added high-risk priority filters and queue affordances, and widened browser coverage for the new controls; `pnpm test`, `pnpm frontend:typecheck`, `pnpm frontend:build`, and `pnpm test:ui` all passed. | Stop if scope expands into public-facing reputation or ranking surfaces before the internal scoring model and abuse guardrails are validated. | DONE |
| S-36 | Add Finland-first automated ingest with provenance, normalization, dedupe, and moderation-safe staging. See `S-36` substeps below. | `migrations/**`, `package.json`, `src/server.ts`, `src/db/**`, `src/ingest/**`, `frontend/src/App.tsx`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `test/**`, `docs/TRACEABILITY_V1.md`, `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md` | The first supported official Finland-first source set can be imported repeatably into raw provenance tables, normalized into launch-critical records, deduplicated safely, and reviewed through protected product or operator flows before public exposure where required; tests and verification pass. | Packets `1f60793`, `3671e85`, and `1f793e7` added the ingest run, raw-record, and stage-item schema, the first supported official-source adapters plus apply or reject staging flow, a repeatable CLI trigger, a protected `/ops/imports` operator surface, ingest regression coverage, runbook and traceability updates, and browser verification for the ingest route. | Stop if required source access or import replay depends on unmanaged credentials, cache state, or manual-only steps that cannot be captured in repo fixtures, docs, or repeatable commands. | READY |
| S-37 | Re-baseline proof, release, security-audit, and metrics evidence for the widened post-launch stack. See `S-37` substeps below. | `package.json`, `.github/workflows/**`, `test/**`, `docs/TRACEABILITY_V1.md`, `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`, `docs/security/**`, `frontend/README.md` | Seeded verification, browser coverage, proof commands, release runbooks, and security-audit notes all cover the new public, admin, notification, reputation, and ingest surfaces; the final post-launch proof path passes from a clean tree. | Packet `110f114` refreshed the widened proof chain, seeded rehearsal coverage, release docs, and workflow audit evidence; final clean-tree proof rehearsal is still pending in the last substep. | Stop if the widened proof path depends on unmanaged platform state or manual-only verification that cannot be captured in repo evidence. | IN_PROGRESS |

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

- [x] Add protected ops routes and forms for party stance creation, update, and review-safe maintenance
  - files: `frontend/src/App.tsx`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:eeb0b64e1322341c9135aa0e9e7d1f867585010d | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/App.tsx, frontend/src/lib/api.ts, frontend/src/routes/OpsPage.tsx, frontend/src/routes/OpsRecordsPage.tsx, frontend/src/routes/PromiseClaimsOpsPage.tsx, frontend/src/types.ts, src/server.ts, test/launch-coverage.test.ts | docs:N/A | status: clean

- [x] Add protected ops routes and forms for vote-event and politician-vote-record entry and maintenance
  - files: `frontend/src/App.tsx`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:eeb0b64e1322341c9135aa0e9e7d1f867585010d | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/App.tsx, frontend/src/lib/api.ts, frontend/src/routes/OpsPage.tsx, frontend/src/routes/OpsRecordsPage.tsx, frontend/src/routes/PromiseClaimsOpsPage.tsx, frontend/src/types.ts, src/server.ts, test/launch-coverage.test.ts | docs:N/A | status: clean

- [x] Add protected ops routes and forms for fulfillment assessments and party-line assessments
  - files: `frontend/src/App.tsx`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:eeb0b64e1322341c9135aa0e9e7d1f867585010d | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/App.tsx, frontend/src/lib/api.ts, frontend/src/routes/OpsPage.tsx, frontend/src/routes/OpsRecordsPage.tsx, frontend/src/routes/PromiseClaimsOpsPage.tsx, frontend/src/types.ts, src/server.ts, test/launch-coverage.test.ts | docs:N/A | status: clean

- [x] Add launch coverage completeness views for target parties, politicians, canonical promises, and trust records
  - files: `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `src/server.ts`, `src/db/**`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:eeb0b64e1322341c9135aa0e9e7d1f867585010d | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/App.tsx, frontend/src/lib/api.ts, frontend/src/routes/OpsPage.tsx, frontend/src/routes/OpsRecordsPage.tsx, frontend/src/routes/PromiseClaimsOpsPage.tsx, frontend/src/types.ts, src/server.ts, test/launch-coverage.test.ts | docs:N/A | status: clean

- [x] Run browser verification for editorial ops and launch coverage views from moderator/admin sessions
  - files: `frontend/src/**`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build && playwright or chrome-devtools verification of editorial ops flows`
  - evidence: packet:e9af365df9808aa5c1bf95993b3b0423acf7141e | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build && chrome-devtools verification of /ops/records and /ops/claims under an admin session on http://127.0.0.1:4189 with backend http://127.0.0.1:3009 -> pass | files:frontend/src/lib/api.ts, src/server.ts | docs:N/A | gate-fix:frontend/src/lib/api.ts,src/server.ts | status: clean

### S-29 substeps

- [x] Add a durable frontend/browser test harness and repo scripts for launch-critical flows
  - files: `package.json`, `frontend/package.json`, `pnpm-lock.yaml`, `vitest*.ts`, `playwright.config.*`, `frontend/**`, `test/**`
  - run: `pnpm lint && pnpm typecheck && pnpm frontend:typecheck`
  - evidence: packet:38c17ea5ae881f44df5f0f3ff2108f751787c26f | run:pnpm lint && pnpm typecheck && pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui -> pass | files:frontend/src/routes/OpsRecordsPage.tsx, package.json, playwright.config.ts, pnpm-lock.yaml, test/playwright/launch-ui.spec.ts | docs:N/A | status: clean

- [x] Add automated smoke coverage for critical public routes and trust-data rendering states
  - files: `frontend/**`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:38c17ea5ae881f44df5f0f3ff2108f751787c26f | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui -> pass | files:frontend/src/routes/OpsRecordsPage.tsx, package.json, playwright.config.ts, pnpm-lock.yaml, test/playwright/launch-ui.spec.ts | docs:N/A | status: clean

- [x] Add automated auth and contributor-flow coverage for register, sign-in, statement submission, proposal submission, and promise-claim submission
  - files: `frontend/**`, `test/**`, `src/server.ts`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:38c17ea5ae881f44df5f0f3ff2108f751787c26f | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui -> pass | files:frontend/src/routes/OpsRecordsPage.tsx, package.json, playwright.config.ts, pnpm-lock.yaml, test/playwright/launch-ui.spec.ts | docs:N/A | status: clean

- [x] Add automated moderator/editorial ops coverage for proposal review, claim canonization, party stance entry, vote-event entry, and trust assessment maintenance
  - files: `frontend/**`, `test/**`, `src/server.ts`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:38c17ea5ae881f44df5f0f3ff2108f751787c26f | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui -> pass | files:frontend/src/routes/OpsRecordsPage.tsx, package.json, playwright.config.ts, pnpm-lock.yaml, test/playwright/launch-ui.spec.ts | docs:N/A | status: clean

- [x] Wire the launch proof chain and workflow coverage into the repo with the required security-audit note if sensitive workflow files change
  - files: `package.json`, `pnpm-lock.yaml`, `.github/workflows/**`, `docs/security/**`, `test/**`
  - run: `pnpm lint && pnpm typecheck && pnpm test && pnpm frontend:typecheck`
  - evidence: packet:786cd1745b56e39cd2c841db1ae8d6b8a2670299 | run:pnpm lint && pnpm typecheck && pnpm test && pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui -> pass | files:.github/workflows/ci-proof.yml, docs/security/audit-playwright-ci.md, playwright.config.ts | docs:N/A | status: clean

### S-30 substeps

- [x] Refresh environment, secret, and launch smoke requirements for staging and production deploys
  - files: `docs/RELEASE_READINESS_RUNBOOK.md`, `frontend/README.md`
  - run: `N/A`
  - evidence: packet:7e61e285dadda834ba9a2bc6278286e8b1773dfb | run:pnpm proof:launch -> pass | files:.github/workflows/release-rehearsal.yml, docs/RELEASE_READINESS_RUNBOOK.md, docs/SUCCESS_METRICS_PLAN.md, docs/TRACEABILITY_V1.md, docs/security/audit-release-rehearsal.md, frontend/README.md, package.json | docs:N/A | status: clean

- [x] Add deploy or release orchestration plus the required security-audit note for any sensitive workflow or config changes
  - files: `.github/workflows/**`, `docs/security/**`, `package.json`
  - run: `pnpm lint && pnpm typecheck && pnpm test`
  - evidence: packet:7e61e285dadda834ba9a2bc6278286e8b1773dfb | run:pnpm lint && pnpm typecheck && pnpm test && pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui -> pass | files:.github/workflows/release-rehearsal.yml, docs/RELEASE_READINESS_RUNBOOK.md, docs/SUCCESS_METRICS_PLAN.md, docs/TRACEABILITY_V1.md, docs/security/audit-release-rehearsal.md, frontend/README.md, package.json | docs:N/A | status: clean

- [x] Add or harden launch observability and smoke checks for health, search, auth, contributor, moderation, and editorial ops paths
  - files: `src/server.ts`, `test/**`, `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`
  - run: `pnpm test`
  - evidence: packet:7e61e285dadda834ba9a2bc6278286e8b1773dfb | run:pnpm test -> pass | files:.github/workflows/release-rehearsal.yml, docs/RELEASE_READINESS_RUNBOOK.md, docs/SUCCESS_METRICS_PLAN.md, docs/TRACEABILITY_V1.md, docs/security/audit-release-rehearsal.md, frontend/README.md, package.json | docs:N/A | status: clean

- [x] Rehearse backup/restore and rollback procedure for the launch database and release path
  - files: `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`
  - run: `N/A`
  - evidence: packet:7e61e285dadda834ba9a2bc6278286e8b1773dfb | run:pnpm proof:launch -> pass | files:.github/workflows/release-rehearsal.yml, docs/RELEASE_READINESS_RUNBOOK.md, docs/SUCCESS_METRICS_PLAN.md, docs/TRACEABILITY_V1.md, docs/security/audit-release-rehearsal.md, frontend/README.md, package.json | docs:N/A | status: clean

- [x] Refresh traceability, release evidence, and metrics docs for the launchability baseline
  - files: `docs/TRACEABILITY_V1.md`, `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`, `frontend/README.md`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:7e61e285dadda834ba9a2bc6278286e8b1773dfb | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build -> pass | files:.github/workflows/release-rehearsal.yml, docs/RELEASE_READINESS_RUNBOOK.md, docs/SUCCESS_METRICS_PLAN.md, docs/TRACEABILITY_V1.md, docs/security/audit-release-rehearsal.md, frontend/README.md, package.json | docs:N/A | status: clean

- [x] Run a staging-like release rehearsal from a clean tree using the hardened proof chain and smoke checklist
  - files: `src/server.ts`, `frontend/src/**`, `test/**`, `.github/workflows/**`, `docs/TRACEABILITY_V1.md`, `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`, `docs/security/**`, `frontend/README.md`
  - run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:247894b9cf67a457f3328c078dcd492b84efe494 | run:pnpm proof:launch && SMOKE_BASE_URL=http://127.0.0.1:3013 pnpm smoke:release -> pass | files:package.json | docs:N/A | status: clean

### S-31 substeps

- [x] Load or verify launch-candidate Finland-first data coverage for public parties, politicians, canonical promises, and trust records
  - files: `frontend/src/**`, `src/server.ts`, `test/**`, `docs/TRACEABILITY_V1.md`, `docs/SUCCESS_METRICS_PLAN.md`
  - run: `pnpm test`
  - evidence: packet:f194057b722f5ab7500dca249511ff44f44b7d22 | run:pnpm test && cmd /c "set DB_PATH=%TEMP%\pnyx-final-launch.db&& if exist %TEMP%\pnyx-final-launch.db del /f /q %TEMP%\pnyx-final-launch.db&& pnpm seed:launch-rehearsal&& pnpm launch:coverage" -> pass | files:docs/RELEASE_READINESS_RUNBOOK.md,docs/SUCCESS_METRICS_PLAN.md,docs/TRACEABILITY_V1.md,frontend/README.md,frontend/src/App.tsx,package.json,test/helpers/launch-rehearsal.ts,test/launch-rehearsal.test.ts,test/playwright/launch-ui.spec.ts | docs:N/A | baseline:absorbed | gate-fix:frontend/src/App.tsx,test/helpers/launch-rehearsal.ts,test/playwright/launch-ui.spec.ts | status: clean

- [x] Run the full static and automated launch proof chain including the new frontend and browser coverage
  - files: `package.json`, `frontend/package.json`, `src/server.ts`, `frontend/src/**`, `test/**`, `.github/workflows/**`
  - run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:f194057b722f5ab7500dca249511ff44f44b7d22 | run:pnpm proof:launch -> pass | files:docs/RELEASE_READINESS_RUNBOOK.md,docs/SUCCESS_METRICS_PLAN.md,docs/TRACEABILITY_V1.md,frontend/README.md,frontend/src/App.tsx,package.json,test/helpers/launch-rehearsal.ts,test/launch-rehearsal.test.ts,test/playwright/launch-ui.spec.ts | docs:N/A | baseline:absorbed | gate-fix:frontend/src/App.tsx,test/helpers/launch-rehearsal.ts,test/playwright/launch-ui.spec.ts | status: clean

- [x] Run browser and accessibility verification across all public, auth, contributor, moderator, and editorial routes required for launch
  - files: `frontend/src/**`
  - run: `playwright or chrome-devtools verification of all launch-critical routes and flows`
  - evidence: packet:f194057b722f5ab7500dca249511ff44f44b7d22 | run:chrome-devtools verification of /, /politicians, /politicians/1, /parties/launch-party, /promises/1, /claims/1 redirect, /register, /sign-in?email=admin@launch.test&redirect=/ops/records, /contribute/politicians/new, /contribute/statements/new?politicianId=1, /contribute/promises/new?politicianId=1, /ops, /ops/records, and /ops/claims on http://127.0.0.1:4314 with backend http://127.0.0.1:3014 plus Lighthouse snapshot accessibility audits on home, politician profile, promise detail, and ops records -> pass | files:docs/RELEASE_READINESS_RUNBOOK.md,docs/SUCCESS_METRICS_PLAN.md,docs/TRACEABILITY_V1.md,frontend/README.md,frontend/src/App.tsx,package.json,test/helpers/launch-rehearsal.ts,test/launch-rehearsal.test.ts,test/playwright/launch-ui.spec.ts | docs:N/A | baseline:absorbed | gate-fix:frontend/src/App.tsx,test/helpers/launch-rehearsal.ts,test/playwright/launch-ui.spec.ts | status: clean

- [x] Complete the final launch UI audit, manual regression sweep, and go-or-no-go proof across every critical route and flow
  - files: `src/server.ts`, `frontend/src/**`, `package.json`, `frontend/package.json`, `test/**`, `.github/workflows/**`, `docs/TRACEABILITY_V1.md`, `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`, `docs/security/**`, `frontend/README.md`
  - run: `ui-audit plus manual playwright or chrome-devtools verification of every launch-critical public, contributor, moderator, editorial, and trust flow`
  - evidence: packet:f194057b722f5ab7500dca249511ff44f44b7d22 | run:ui-audit plus manual chrome-devtools verification of launch-critical public, contributor, moderation, editorial, and trust flows on http://127.0.0.1:4314 with backend http://127.0.0.1:3014; no failed network requests or app-console errors; SMOKE_BASE_URL=http://127.0.0.1:3014 pnpm smoke:release -> pass | files:docs/RELEASE_READINESS_RUNBOOK.md,docs/SUCCESS_METRICS_PLAN.md,docs/TRACEABILITY_V1.md,frontend/README.md,frontend/src/App.tsx,package.json,test/helpers/launch-rehearsal.ts,test/launch-rehearsal.test.ts,test/playwright/launch-ui.spec.ts | docs:N/A | baseline:absorbed | gate-fix:frontend/src/App.tsx,test/helpers/launch-rehearsal.ts,test/playwright/launch-ui.spec.ts | status: clean

### S-32 substeps

- [x] Remove the legacy `/auth/token` backend route and client or test references while keeping email-code auth and local admin bootstrap intact
  - files: `src/server.ts`, `src/auth/**`, `frontend/src/lib/api.ts`, `test/**`, `docs/RELEASE_READINESS_RUNBOOK.md`, `frontend/README.md`
  - run: `pnpm test`
  - evidence: packet:ee7ea2375dede77a8b72d7be7382c9f1680c0c4c | run:pnpm test -> pass | files:docs/RELEASE_READINESS_RUNBOOK.md,frontend/src/lib/api.ts,frontend/src/types.ts,src/server.ts,test/abuse-telemetry.test.ts,test/helpers/auth.ts,test/rate-limit-429.test.ts | docs:N/A | status: clean

- [x] Add protected party creation and alias-maintenance surfaces reachable from existing ops navigation
  - files: `frontend/src/App.tsx`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:a36e199ab2083bbf73bb8bc30369059ddf2d395c | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/App.tsx,frontend/src/lib/api.ts,frontend/src/routes/OpsAdminPage.tsx,frontend/src/routes/OpsPage.tsx,frontend/src/routes/OpsRecordsPage.tsx | docs:N/A | status: clean

- [x] Add protected party membership create or update and direct canonical-promise creation surfaces
  - files: `frontend/src/App.tsx`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `src/server.ts`, `src/db/**`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:a36e199ab2083bbf73bb8bc30369059ddf2d395c | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/App.tsx,frontend/src/lib/api.ts,frontend/src/routes/OpsAdminPage.tsx,frontend/src/routes/OpsPage.tsx,frontend/src/routes/OpsRecordsPage.tsx | docs:N/A | status: clean

- [x] Add a public `/promises` browse route with filters for politician, party, issue, and record state
  - files: `frontend/src/App.tsx`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/context/**`, `frontend/src/lib/**`, `frontend/src/types.ts`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:806c37831b5ac53f397cb1faae0441f0211a218b | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/App.tsx,frontend/src/routes/HomePage.tsx,frontend/src/routes/PromiseIndexPage.tsx | docs:N/A | status: clean

- [ ] Run regression and browser verification for removed auth debt, new admin surfaces, and public promise browsing
  - files: `package.json`, `frontend/src/**`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui`
  - evidence: packet:8d714af949ddcd420bfa5dde7be5c9b255311ff6 | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui -> pass | files:test/playwright/launch-ui.spec.ts | docs:N/A | status: clean

### S-33 substeps

- [x] Add route-metadata primitives and environment-backed canonical-origin handling for public routes
  - files: `frontend/index.html`, `frontend/src/App.tsx`, `frontend/src/components/**`, `frontend/src/context/**`, `frontend/src/lib/**`, `frontend/src/routes/**`, `frontend/src/types.ts`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:c6df3485f4ee55776e6ddf98c0a1d285fc2e09a5 | run:pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/index.html,frontend/src/components/PageMeta.tsx,frontend/src/routes/HomePage.tsx,frontend/src/routes/MethodologyPage.tsx,frontend/src/routes/PartiesPage.tsx,frontend/src/routes/PartyProfilePage.tsx,frontend/src/routes/PoliticianProfilePage.tsx,frontend/src/routes/PoliticiansPage.tsx,frontend/src/routes/PromiseDetailPage.tsx,frontend/src/routes/PromiseIndexPage.tsx | docs:N/A | status: clean

- [x] Define titles, descriptions, canonical URLs, and social preview tags for home, directories, profiles, promise detail, and methodology routes
  - files: `frontend/index.html`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/**`, `frontend/src/types.ts`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:c6df3485f4ee55776e6ddf98c0a1d285fc2e09a5 | run:pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/index.html,frontend/src/components/PageMeta.tsx,frontend/src/routes/HomePage.tsx,frontend/src/routes/MethodologyPage.tsx,frontend/src/routes/PartiesPage.tsx,frontend/src/routes/PartyProfilePage.tsx,frontend/src/routes/PoliticianProfilePage.tsx,frontend/src/routes/PoliticiansPage.tsx,frontend/src/routes/PromiseDetailPage.tsx,frontend/src/routes/PromiseIndexPage.tsx | docs:N/A | status: clean

- [x] Add repo-managed sitemap, robots, and metadata-generation support for public crawling and search previews
  - files: `frontend/index.html`, `frontend/**`, `package.json`, `test/**`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:efeb9472ddec69c4b4b5b20b2f76ec2bc9b7fa48 | run:pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/public/robots.txt,frontend/public/sitemap.xml,frontend/scripts/generate-seo-artifacts.mjs,package.json | docs:N/A | status: clean

- [x] Add automated metadata verification to the browser or proof chain for critical public routes
  - files: `package.json`, `frontend/**`, `test/**`
  - run: `pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui`
  - evidence: packet:dfae8e448de4a0d92f875760424fca9082422939 | run:pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui -> pass | files:test/playwright/launch-ui.spec.ts | docs:N/A | status: clean

- [x] Run browser verification for public metadata and search-preview coverage on the widened public route set
  - files: `frontend/**`, `test/**`
  - run: `pnpm test:ui`
  - evidence: packet:dfae8e448de4a0d92f875760424fca9082422939 | run:pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui -> pass | files:test/playwright/launch-ui.spec.ts | docs:N/A | status: clean

### S-34 substeps

- [x] Add append-only product-event schema for auth, contribution, moderation, and editorial actions
  - files: `migrations/**`, `src/db/**`, `src/server.ts`, `test/**`
  - run: `pnpm test`
  - evidence: packet:2eb4923b4a19bc50d081bfe11e425b805d6f525a | run:pnpm test -> pass | files:migrations/0010_product_events.sql,test/migration.test.ts | docs:N/A | status: clean

- [x] Emit product events from the core auth, contribution, moderation, and editorial flows
  - files: `src/server.ts`, `src/auth/**`, `src/db/**`, `test/**`
  - run: `pnpm test`
  - evidence: packet:3b64deef5848a1c96007611fcce616052eba3b7e | run:pnpm test -> pass | files:src/auth/email-login.ts,src/db/product-events.ts,src/server.ts,test/product-events.test.ts | docs:N/A | status: clean

- [x] Add notification records, delivery tracking, and preference schema plus backend APIs
  - files: `migrations/**`, `src/server.ts`, `src/db/**`, `test/**`
  - run: `pnpm test`
  - evidence: packet:8a35931d559c77c42629ff4566928446de04f8e9 | run:pnpm test -> pass | files:migrations/0011_notifications.sql,src/db/notifications.ts,src/server.ts,test/migration.test.ts,test/notifications.test.ts | docs:N/A | status: clean

- [x] Add authenticated notification and preference surfaces in the frontend
  - files: `frontend/src/App.tsx`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/context/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:0dca03b891b80d1ff880ceff22bffe1f8ce8190b | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/App.tsx,frontend/src/layout/PublicLayout.tsx,frontend/src/lib/api.ts,frontend/src/routes/NotificationsPage.tsx,frontend/src/types.ts | docs:N/A | status: clean

- [x] Refresh metrics and traceability docs around event-backed retention and notification evidence, then verify end-to-end flows
  - files: `docs/SUCCESS_METRICS_PLAN.md`, `docs/TRACEABILITY_V1.md`, `package.json`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui`
  - evidence: packet:c4c2b96cac0ea517844f90f11955520c588ce7db | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui -> pass | files:docs/SUCCESS_METRICS_PLAN.md,docs/TRACEABILITY_V1.md,test/playwright/launch-ui.spec.ts | docs:N/A | status: clean

### S-35 substeps

- [x] Add contributor-reputation schema, aggregation rules, and moderation-outcome backfill logic
  - files: `migrations/**`, `src/db/**`, `src/server.ts`, `test/**`
  - run: `pnpm test`
  - evidence: packet:4b00897b1be5d3813df26e487fe8a48c5044f89a | run:pnpm test -> pass | files:migrations/0012_contributor_reputation.sql,src/db/reputation.ts,test/migration.test.ts,test/reputation.test.ts | docs:N/A | status: clean

- [x] Expose reputation and risk signals in the politician-proposal queue
  - files: `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:dfec4f3aba09d4fdde044b5c3ab41aa46f1e32e8 | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/routes/OpsPage.tsx,frontend/src/types.ts,src/db/reputation.ts,src/server.ts | docs:N/A | status: clean

- [x] Expose reputation and risk signals in the promise-claim queue and broaden abuse telemetry beyond the launch baseline
  - files: `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `src/server.ts`, `src/db/**`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:6ae94e996f99a598131b406ef76941193d1103b9 | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/routes/PromiseClaimsOpsPage.tsx,frontend/src/types.ts,src/server.ts,test/promise-claims.test.ts | docs:N/A | status: clean

- [x] Add queue prioritization, filter ergonomics, and moderation-state affordances for high-value or high-risk work
  - files: `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:ef753590aa89e3bd20cf555b2a84f53cc75f6639 | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui -> pass | files:frontend/src/lib/api.ts,frontend/src/routes/OpsPage.tsx,frontend/src/routes/PromiseClaimsOpsPage.tsx,frontend/src/types.ts,src/db/promise-claims.ts,src/server.ts,test/playwright/launch-ui.spec.ts,test/politician-proposal-queue.test.ts,test/promise-claims.test.ts | docs:N/A | status: clean

- [x] Run regression and browser verification for the upgraded moderation surfaces and reputation-backed queue ordering
  - files: `package.json`, `frontend/src/**`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui`
  - evidence: packet:ef753590aa89e3bd20cf555b2a84f53cc75f6639 | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui -> pass | files:frontend/src/lib/api.ts,frontend/src/routes/OpsPage.tsx,frontend/src/routes/PromiseClaimsOpsPage.tsx,frontend/src/types.ts,src/db/promise-claims.ts,src/server.ts,test/playwright/launch-ui.spec.ts,test/politician-proposal-queue.test.ts,test/promise-claims.test.ts | docs:N/A | status: clean

### S-36 substeps

- [x] Add raw-ingest schema, provenance storage, and idempotent import bookkeeping for Finland-first official sources
  - files: `migrations/**`, `src/db/**`, `src/ingest/**`, `test/**`
  - run: `pnpm test`
  - evidence: packet:1f60793317bccb312863cda498b431d40d893968 | run:pnpm test -> pass | files:migrations/0013_ingest_pipeline.sql,test/migration.test.ts | docs:N/A | status: clean

- [x] Implement the first official source adapters and normalization pipeline for party stances and parliamentary vote data
  - files: `package.json`, `src/ingest/**`, `src/db/**`, `src/server.ts`, `test/**`
  - run: `pnpm test`
  - evidence: packet:3671e851f55945ef4603dc0962706e094818be52 | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/App.tsx,frontend/src/lib/api.ts,frontend/src/routes/OpsImportsPage.tsx,frontend/src/routes/OpsPage.tsx,frontend/src/routes/OpsRecordsPage.tsx,frontend/src/types.ts,package.json,src/db/ingest.ts,src/ingest/adapters.ts,src/ingest/apply.ts,src/ingest/cli.ts,src/ingest/sources.ts,src/server.ts,test/ingest.test.ts | docs:N/A | status: clean

- [x] Add dedupe, reconciliation, and moderation-safe staging for automated imports before public exposure
  - files: `src/ingest/**`, `src/db/**`, `src/server.ts`, `test/**`
  - run: `pnpm test`
  - evidence: packet:3671e851f55945ef4603dc0962706e094818be52 | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/App.tsx,frontend/src/lib/api.ts,frontend/src/routes/OpsImportsPage.tsx,frontend/src/routes/OpsPage.tsx,frontend/src/routes/OpsRecordsPage.tsx,frontend/src/types.ts,package.json,src/db/ingest.ts,src/ingest/adapters.ts,src/ingest/apply.ts,src/ingest/cli.ts,src/ingest/sources.ts,src/server.ts,test/ingest.test.ts | docs:N/A | status: clean

- [x] Add protected ingest-review or operator surfaces and launch-coverage visibility for imported records
  - files: `frontend/src/App.tsx`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:3671e851f55945ef4603dc0962706e094818be52 | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/App.tsx,frontend/src/lib/api.ts,frontend/src/routes/OpsImportsPage.tsx,frontend/src/routes/OpsPage.tsx,frontend/src/routes/OpsRecordsPage.tsx,frontend/src/types.ts,package.json,src/db/ingest.ts,src/ingest/adapters.ts,src/ingest/apply.ts,src/ingest/cli.ts,src/ingest/sources.ts,src/server.ts,test/ingest.test.ts | docs:N/A | status: clean

- [x] Refresh runbooks and verification coverage for repeatable import replay, then verify the seeded Finland-first ingest path end to end
  - files: `package.json`, `docs/TRACEABILITY_V1.md`, `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui`
  - evidence: packet:1f793e712d88885690ef01a3f8d730e002338fae | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui -> pass | files:docs/RELEASE_READINESS_RUNBOOK.md,docs/TRACEABILITY_V1.md,test/playwright/launch-ui.spec.ts | docs:N/A | status: clean

### S-37 substeps

- [x] Extend seeded data and proof helpers for post-launch public, admin, notification, reputation, and ingest surfaces
  - files: `package.json`, `test/**`, `docs/TRACEABILITY_V1.md`
  - run: `pnpm test && pnpm test:e2e`
  - evidence: packet:110f114fa2eb27b33c2e9ea8309cc347ec8af18a | run:pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui -> pass | files:.github/workflows/ci-proof.yml,.github/workflows/release-rehearsal.yml,docs/RELEASE_READINESS_RUNBOOK.md,docs/security/audit-postlaunch-proof.md,frontend/README.md,frontend/scripts/generate-seo-artifacts.mjs,frontend/src/routes/PromiseIndexPage.tsx,package.json,src/ingest/adapters.ts,src/ingest/apply.ts,src/server.ts,test/helpers/launch-rehearsal.ts,test/launch-rehearsal.test.ts | docs:N/A | baseline:absorbed | gate-fix:frontend/scripts/generate-seo-artifacts.mjs,src/ingest/adapters.ts,src/ingest/apply.ts | status: clean

- [x] Widen browser coverage to the new public promises, admin CRUD, notification, and ingest-review routes
  - files: `test/**`, `frontend/src/**`, `src/server.ts`
  - run: `pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui`
  - evidence: packet:110f114fa2eb27b33c2e9ea8309cc347ec8af18a | run:pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui -> pass | files:.github/workflows/ci-proof.yml,.github/workflows/release-rehearsal.yml,docs/RELEASE_READINESS_RUNBOOK.md,docs/security/audit-postlaunch-proof.md,frontend/README.md,frontend/scripts/generate-seo-artifacts.mjs,frontend/src/routes/PromiseIndexPage.tsx,package.json,src/ingest/adapters.ts,src/ingest/apply.ts,src/server.ts,test/helpers/launch-rehearsal.ts,test/launch-rehearsal.test.ts | docs:N/A | baseline:absorbed | gate-fix:frontend/scripts/generate-seo-artifacts.mjs,src/ingest/adapters.ts,src/ingest/apply.ts | status: clean

- [x] Refresh release, security-audit, and metrics docs for the post-launch stack and delivery path
  - files: `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`, `docs/security/**`, `frontend/README.md`
  - run: `N/A`
  - evidence: packet:110f114fa2eb27b33c2e9ea8309cc347ec8af18a | run:N/A -> release runbook, security audit note, and frontend ops documentation refreshed in packet | files:.github/workflows/ci-proof.yml,.github/workflows/release-rehearsal.yml,docs/RELEASE_READINESS_RUNBOOK.md,docs/security/audit-postlaunch-proof.md,frontend/README.md,frontend/scripts/generate-seo-artifacts.mjs,frontend/src/routes/PromiseIndexPage.tsx,package.json,src/ingest/adapters.ts,src/ingest/apply.ts,src/server.ts,test/helpers/launch-rehearsal.ts,test/launch-rehearsal.test.ts | docs:N/A | baseline:absorbed | gate-fix:frontend/scripts/generate-seo-artifacts.mjs,src/ingest/adapters.ts,src/ingest/apply.ts | status: clean

- [x] Add or update workflow and proof wiring for the widened post-launch command chain
  - files: `package.json`, `.github/workflows/**`, `docs/security/**`, `test/**`
  - run: `pnpm lint && pnpm typecheck && pnpm test && pnpm frontend:typecheck`
  - evidence: packet:110f114fa2eb27b33c2e9ea8309cc347ec8af18a | run:pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm frontend:typecheck && pnpm frontend:build && pnpm test:ui -> pass | files:.github/workflows/ci-proof.yml,.github/workflows/release-rehearsal.yml,docs/RELEASE_READINESS_RUNBOOK.md,docs/security/audit-postlaunch-proof.md,frontend/README.md,frontend/scripts/generate-seo-artifacts.mjs,frontend/src/routes/PromiseIndexPage.tsx,package.json,src/ingest/adapters.ts,src/ingest/apply.ts,src/server.ts,test/helpers/launch-rehearsal.ts,test/launch-rehearsal.test.ts | docs:N/A | baseline:absorbed | gate-fix:frontend/scripts/generate-seo-artifacts.mjs,src/ingest/adapters.ts,src/ingest/apply.ts | status: clean

- [ ] Run the full post-launch proof chain and clean-tree release rehearsal from the widened baseline
  - files: `package.json`, `.github/workflows/**`, `test/**`, `docs/TRACEABILITY_V1.md`, `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`, `docs/security/**`, `frontend/README.md`
  - run: `pnpm proof:launch && post-launch smoke rehearsal on an isolated server`
  - evidence: Pending.

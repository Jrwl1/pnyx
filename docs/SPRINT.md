# Sprint

Window: 2026-03-17 to 2026-06-30

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

Convert Pnyx from a read-first public alpha into a contribution-capable Finland-first accountability product by exposing existing backend workflows in the frontend, replacing placeholder party data with a real party graph, introducing canonical promises and claim canonization, adding source-backed trust dimensions, and closing with a full UI audit and manual verification pass across everything added in this sprint.

---

| ID | Do | Files | Acceptance | Evidence | Stop | Status |
| --- | --- | --- | --- | --- | --- | --- |
| S-21 | Expose auth, contribution, voting, and politician-proposal moderation flows in the frontend. See `S-21` substeps below. | `frontend/src/App.tsx`, `frontend/src/layout/PublicLayout.tsx`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `frontend/src/context/**`, `frontend/src/components/**`, `frontend/src/routes/**`, `src/server.ts`, `test/**` | Normal users can register, sign in, sign out, submit politician proposals, submit statements, and cast support or oppose votes from the frontend; moderators can review the existing politician proposal queue from the frontend; auth and rate-limit or duplicate errors are surfaced honestly; static, test, and browser checks pass for the new flows. | In progress. Packets `bf4b1fe`, `1690950`, and `d009cd0` now cover auth state, contributor submissions, and promise voting controls; see checked substeps for command and file evidence. | Stop if a required frontend flow depends on unsupported backend semantics beyond bounded route or response additions inside the same auth or proposal area. | IN_PROGRESS |
| S-22 | Replace frontend-only party placeholders with backend-backed party, alias, and membership data. See `S-22` substeps below. | `migrations/**`, `src/server.ts`, `src/db/**`, `frontend/src/lib/api.ts`, `frontend/src/lib/domain.ts`, `frontend/src/types.ts`, `frontend/src/routes/HomePage.tsx`, `frontend/src/routes/PartiesPage.tsx`, `frontend/src/routes/PartyProfilePage.tsx`, `frontend/src/routes/PoliticianProfilePage.tsx`, `test/**` | Backend `parties`, `party_aliases`, and `party_memberships` exist with public read APIs and admin or moderator write paths; home, directory, party, and politician surfaces use backend-backed party data instead of static placeholder shells; migration and browser checks pass. | Pending. Each checked substep must record packet, run, files, docs, and clean-tree evidence, and REVIEW must accept the row against the real-party-data acceptance criteria. | Stop if a truthful party page would require inventing membership or affiliation data that cannot be represented through the new backend schema. | TODO |
| S-23 | Introduce canonical promises beside legacy statements and keep current public reads compatible during the transition. See `S-23` substeps below. | `migrations/**`, `src/server.ts`, `src/db/**`, `frontend/src/lib/api.ts`, `frontend/src/lib/domain.ts`, `frontend/src/types.ts`, `frontend/src/routes/HomePage.tsx`, `frontend/src/routes/PoliticianProfilePage.tsx`, `frontend/src/routes/PromiseDetailPage.tsx`, `test/**` | Canonical promise and accepted-source entities exist beside legacy statements; public/frontend reads can distinguish raw submission history from canonical public promise records; current promise detail and politician profile routes stay functional while the data model changes underneath them; regression and browser checks pass. | Pending. Each checked substep must record packet, run, files, docs, and clean-tree evidence, and REVIEW must accept the row against the canonical-promise compatibility criteria. | Stop if canonical-promise delivery cannot be isolated from the legacy statement surface without a migration or compatibility strategy that would need extra out-of-scope repo changes. | TODO |
| S-24 | Build claim-source submission, equivalence, and moderator canonization flows for promise records. See `S-24` substeps below. | `migrations/**`, `src/server.ts`, `src/db/**`, `frontend/src/App.tsx`, `frontend/src/lib/api.ts`, `frontend/src/lib/domain.ts`, `frontend/src/types.ts`, `frontend/src/components/**`, `frontend/src/routes/**`, `test/**` | Contributors can submit promise-source claims, signal same-as or non-match equivalence, and see duplicate assist; moderators can claim, release, review, merge, or canonize claims into canonical promises with audit trails and reason codes; public promise pages expose accepted sources and change history; tests and browser checks pass for the end-to-end canonization loop. | Pending. Each checked substep must record packet, run, files, docs, and clean-tree evidence, and REVIEW must accept the row against the canonization and auditability criteria. | Stop if the claim or equivalence workflow would require reusing community sentiment votes as truth-validation instead of introducing dedicated claim-review entities. | TODO |
| S-25 | Add source-backed party stances, vote-event mappings, fulfillment assessments, and trust dimensions to public pages. See `S-25` substeps below. | `migrations/**`, `src/server.ts`, `src/db/**`, `frontend/src/lib/api.ts`, `frontend/src/lib/domain.ts`, `frontend/src/types.ts`, `frontend/src/routes/PoliticianProfilePage.tsx`, `frontend/src/routes/PartyProfilePage.tsx`, `frontend/src/routes/PromiseDetailPage.tsx`, `frontend/src/routes/MethodologyPage.tsx`, `test/**` | Party stances, vote events, fulfillment assessments, and party-alignment assessments exist with a first Finland-first source path; politician and party pages show backend-derived promise-trust and party-line-trust dimensions with explicit unknown handling; promise detail and methodology explain the real verdict logic; regression, accessibility, and browser checks pass. | Pending. Each checked substep must record packet, run, files, docs, and clean-tree evidence, and REVIEW must accept the row against the trust-dimension and methodology criteria. | Stop if truthful trust computation requires data outside the selected first Finland-first stance and vote source path and cannot be represented as explicit unknowns for this row. | TODO |
| S-26 | Harden search, auditability, release proof, and complete a full UI audit and manual verification pass across everything added in S-21..S-26. See `S-26` substeps below. | `src/server.ts`, `migrations/**`, `frontend/src/**`, `test/**`, `docs/TRACEABILITY_V1.md`, `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`, `frontend/README.md` | Search and auditability are expanded for the new contribution and canonization graph; release docs and metrics align with implemented behavior; regression coverage is broadened across auth, contribution, party, canonical promise, moderation, and trust flows; full proof commands, browser checks, accessibility checks, and a complete manual UI audit pass across all newly added surfaces. | Pending. Each checked substep must record packet, run, files, docs, and clean-tree evidence, and REVIEW must accept the row against the release-hardening and full-site audit criteria. | Stop if the final audit exposes a blocking regression outside the scoped contribution, party, canonization, or trust flows that cannot be resolved within the same hardening area. | TODO |

### S-21 substeps

- [x] Add frontend auth context, token persistence, and protected-route helpers for authenticated and moderator-only surfaces
  - files: `frontend/src/App.tsx`, `frontend/src/context/**`, `frontend/src/components/**`, `frontend/src/types.ts`
  - run: `pnpm frontend:typecheck`
  - evidence: packet:bf4b1fe23b14c395769536da6f5848d5906e94a8 | run:pnpm frontend:typecheck -> pass | files:frontend/src/App.tsx, frontend/src/components/ProtectedRoute.tsx, frontend/src/context/AuthContext.tsx, frontend/src/layout/PublicLayout.tsx, frontend/src/lib/api.ts, frontend/src/routes/RegisterPage.tsx, frontend/src/routes/SignInPage.tsx, frontend/src/types.ts | docs:N/A | status: clean

- [x] Add public register, sign-in, and sign-out UI against the existing backend auth endpoints with honest error states
  - files: `frontend/src/App.tsx`, `frontend/src/lib/api.ts`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/layout/PublicLayout.tsx`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:bf4b1fe23b14c395769536da6f5848d5906e94a8 | run:pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/App.tsx, frontend/src/components/ProtectedRoute.tsx, frontend/src/context/AuthContext.tsx, frontend/src/layout/PublicLayout.tsx, frontend/src/lib/api.ts, frontend/src/routes/RegisterPage.tsx, frontend/src/routes/SignInPage.tsx, frontend/src/types.ts | docs:N/A | status: clean

- [x] Add a frontend politician-proposal submission flow with duplicate, captcha, and rate-limit feedback handling
  - files: `frontend/src/lib/api.ts`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/types.ts`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:1690950afd4822fecba187a2a8c3d81f3985ad0a | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/App.tsx, frontend/src/lib/api.ts, frontend/src/routes/HomePage.tsx, frontend/src/routes/PoliticianProfilePage.tsx, frontend/src/routes/SubmitPoliticianProposalPage.tsx, frontend/src/routes/SubmitStatementPage.tsx, frontend/src/types.ts | docs:N/A | status: clean

- [x] Add a frontend statement-submission flow for existing politicians with required-field validation and success states
  - files: `frontend/src/lib/api.ts`, `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/types.ts`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:1690950afd4822fecba187a2a8c3d81f3985ad0a | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/App.tsx, frontend/src/lib/api.ts, frontend/src/routes/HomePage.tsx, frontend/src/routes/PoliticianProfilePage.tsx, frontend/src/routes/SubmitPoliticianProposalPage.tsx, frontend/src/routes/SubmitStatementPage.tsx, frontend/src/types.ts | docs:N/A | status: clean

- [x] Add authenticated support and oppose voting controls on promise detail without changing the current sentiment semantics
  - files: `frontend/src/lib/api.ts`, `frontend/src/routes/PromiseDetailPage.tsx`, `frontend/src/components/**`, `frontend/src/types.ts`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:d009cd098fff123482223302dd53ad28791bf808 | run:pnpm test && pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/lib/api.ts, frontend/src/routes/PromiseDetailPage.tsx, frontend/src/types.ts, src/server.ts, test/statement-detail-viewer-vote.test.ts | docs:N/A | status: clean

- [ ] Add a protected moderator route shell and queue listing for the existing politician proposal workflow
  - files: `frontend/src/App.tsx`, `frontend/src/routes/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `frontend/src/components/**`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Add claim, release, review, and duplicate-assist UI for the politician proposal moderation queue
  - files: `frontend/src/routes/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `frontend/src/components/**`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Run browser verification across register, sign-in, statement submission, proposal submission, voting, and politician-proposal moderation flows
  - files: `frontend/src/**`
  - run: `playwright or chrome-devtools verification of the S-21 public and moderator flows`
  - evidence: Pending.

### S-22 substeps

- [ ] Add `parties` and `party_aliases` schema, migrations, and migration tests
  - files: `migrations/**`, `src/db/**`, `test/**`
  - run: `pnpm test -- -t "migration"`
  - evidence: Pending.

- [ ] Add `party_memberships` schema plus backend helpers for current and historical politician-party links
  - files: `migrations/**`, `src/server.ts`, `src/db/**`, `test/**`
  - run: `pnpm test`
  - evidence: Pending.

- [ ] Add public backend endpoints for party list, party detail, and party member reads
  - files: `src/server.ts`, `test/**`
  - run: `pnpm test`
  - evidence: Pending.

- [ ] Add admin or moderator write paths for parties, aliases, and memberships so the party graph can be populated without direct database edits
  - files: `src/server.ts`, `test/**`
  - run: `pnpm test`
  - evidence: Pending.

- [ ] Update frontend party API clients, shared types, and domain helpers to consume backend-backed party data
  - files: `frontend/src/lib/api.ts`, `frontend/src/lib/domain.ts`, `frontend/src/types.ts`
  - run: `pnpm frontend:typecheck`
  - evidence: Pending.

- [ ] Replace home, party directory, party profile, and politician affiliation surfaces with backend-backed party and membership reads
  - files: `frontend/src/routes/HomePage.tsx`, `frontend/src/routes/PartiesPage.tsx`, `frontend/src/routes/PartyProfilePage.tsx`, `frontend/src/routes/PoliticianProfilePage.tsx`, `frontend/src/types.ts`, `frontend/src/lib/domain.ts`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Run static, test, and browser verification for backend-backed party and membership flows
  - files: `frontend/src/**`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build && playwright or chrome-devtools verification of party flows`
  - evidence: Pending.

### S-23 substeps

- [ ] Add canonical promise and accepted-source schema beside the legacy statement model
  - files: `migrations/**`, `src/db/**`, `test/**`
  - run: `pnpm test -- -t "migration"`
  - evidence: Pending.

- [ ] Add compatibility helpers or backfill logic so legacy `statements` continue to support public reads while canonical promises are introduced
  - files: `src/server.ts`, `src/db/**`, `test/**`
  - run: `pnpm test`
  - evidence: Pending.

- [ ] Add backend create and read endpoints for canonical promises and accepted source bundles
  - files: `src/server.ts`, `test/**`
  - run: `pnpm test`
  - evidence: Pending.

- [ ] Expose canonical or public-state metadata alongside existing promise reads without breaking current routes
  - files: `src/server.ts`, `test/**`
  - run: `pnpm test`
  - evidence: Pending.

- [ ] Update frontend API clients, shared types, and domain mapping so canonical promises and legacy statement history are distinct concepts
  - files: `frontend/src/lib/api.ts`, `frontend/src/lib/domain.ts`, `frontend/src/types.ts`
  - run: `pnpm frontend:typecheck`
  - evidence: Pending.

- [ ] Update politician profile to distinguish canonical promises from raw or legacy submission history
  - files: `frontend/src/routes/PoliticianProfilePage.tsx`, `frontend/src/routes/HomePage.tsx`, `frontend/src/lib/domain.ts`, `frontend/src/types.ts`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Update promise detail to show accepted-source bundles and canonical-public markers instead of a single raw statement framing
  - files: `frontend/src/routes/PromiseDetailPage.tsx`, `frontend/src/lib/api.ts`, `frontend/src/lib/domain.ts`, `frontend/src/types.ts`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Run regression and browser verification for canonical-promise compatibility and public reads
  - files: `frontend/src/**`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build && playwright or chrome-devtools verification of canonical promise flows`
  - evidence: Pending.

### S-24 substeps

- [ ] Add claim-submission, claim-source, and claim-review schema for user-submitted promise records
  - files: `migrations/**`, `src/db/**`, `test/**`
  - run: `pnpm test -- -t "migration"`
  - evidence: Pending.

- [ ] Add claim-equivalence proposal and vote schema with reason-code support separate from community sentiment votes
  - files: `migrations/**`, `src/server.ts`, `test/**`
  - run: `pnpm test`
  - evidence: Pending.

- [ ] Add backend queue, claim, release, review, merge, and canonization APIs for claim submissions using the hardened proposal-ops pattern
  - files: `src/server.ts`, `test/**`
  - run: `pnpm test`
  - evidence: Pending.

- [ ] Add duplicate or equivalence assist helpers for new claim submissions and moderator review
  - files: `src/server.ts`, `test/**`
  - run: `pnpm test`
  - evidence: Pending.

- [ ] Add contributor UI for submitting promise-source claims with duplicate and equivalence suggestions before queueing
  - files: `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Add contributor UI for same-as or non-match equivalence signaling on pending claim records
  - files: `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Add moderator queue, review, merge, and canonization UI for claim submissions and equivalence decisions
  - files: `frontend/src/routes/**`, `frontend/src/components/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Expose accepted sources and canonical change history on public promise detail once claims are merged or approved
  - files: `frontend/src/routes/PromiseDetailPage.tsx`, `frontend/src/lib/api.ts`, `frontend/src/lib/domain.ts`, `frontend/src/types.ts`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Run end-to-end browser verification for claim submission, equivalence signaling, moderator review, and canonization
  - files: `frontend/src/**`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build && playwright or chrome-devtools verification of claim canonization flows`
  - evidence: Pending.

### S-25 substeps

- [ ] Add party-stance schema and admin or moderator APIs for entering and reading official party stances
  - files: `migrations/**`, `src/server.ts`, `src/db/**`, `test/**`
  - run: `pnpm test`
  - evidence: Pending.

- [ ] Add vote-event and politician-vote-record schema and APIs for Finland-first voting data
  - files: `migrations/**`, `src/server.ts`, `src/db/**`, `test/**`
  - run: `pnpm test`
  - evidence: Pending.

- [ ] Add promise-to-vote link, fulfillment-assessment, and party-alignment-assessment schema and backend logic
  - files: `migrations/**`, `src/server.ts`, `src/db/**`, `test/**`
  - run: `pnpm test`
  - evidence: Pending.

- [ ] Add a first Finland-first manual or admin-backed source path for party stances and vote events so trust assessments are not blocked on full ingest automation
  - files: `src/server.ts`, `test/**`
  - run: `pnpm test`
  - evidence: Pending.

- [ ] Expose backend-derived politician and party trust summary reads with counts first, percentages second, and explicit unknown handling
  - files: `src/server.ts`, `test/**`
  - run: `pnpm test`
  - evidence: Pending.

- [ ] Update politician profile trust cards and tables to use backend-derived promise-trust and party-line-trust data
  - files: `frontend/src/routes/PoliticianProfilePage.tsx`, `frontend/src/lib/api.ts`, `frontend/src/lib/domain.ts`, `frontend/src/types.ts`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Update party directory and party profile to show member trust cards and party-average trust summaries from backend assessments
  - files: `frontend/src/routes/PartiesPage.tsx`, `frontend/src/routes/PartyProfilePage.tsx`, `frontend/src/routes/HomePage.tsx`, `frontend/src/lib/api.ts`, `frontend/src/lib/domain.ts`, `frontend/src/types.ts`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Update promise detail and methodology to explain real fulfillment, vote-alignment, and party-stance comparison logic
  - files: `frontend/src/routes/PromiseDetailPage.tsx`, `frontend/src/routes/MethodologyPage.tsx`, `frontend/src/lib/api.ts`, `frontend/src/lib/domain.ts`, `frontend/src/types.ts`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Run regression, accessibility, and browser verification for trust-dimension surfaces on politician, party, and promise routes
  - files: `frontend/src/**`, `src/server.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build && playwright or chrome-devtools accessibility and browser verification of trust flows`
  - evidence: Pending.

### S-26 substeps

- [ ] Add backend-backed search improvements for parties, canonical promises, and issue or topic surfaces introduced in S-21..S-25
  - files: `src/server.ts`, `frontend/src/lib/api.ts`, `frontend/src/lib/domain.ts`, `frontend/src/routes/**`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Add public canonical change-history and contributor-activity surfaces for the new claim, promise, and party records
  - files: `src/server.ts`, `frontend/src/routes/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Add stronger moderation filters, abuse visibility, and auditability for the expanded contribution and canonization queues
  - files: `src/server.ts`, `frontend/src/routes/**`, `frontend/src/lib/api.ts`, `frontend/src/types.ts`, `test/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Expand regression coverage across auth, contribution, party, canonical-promise, canonization, and trust flows
  - files: `test/**`, `src/server.ts`, `frontend/src/**`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Refresh traceability, release-readiness, success-metrics, and frontend route docs for the implemented behavior delivered in S-21..S-26
  - files: `docs/TRACEABILITY_V1.md`, `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`, `frontend/README.md`
  - run: `pnpm test && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Run the full static and backend proof chain for the expanded product surface
  - files: `src/server.ts`, `frontend/src/**`, `test/**`, `docs/TRACEABILITY_V1.md`, `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`, `frontend/README.md`
  - run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build && pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending.

- [ ] Run browser and accessibility verification across all public, authenticated, contributor, and moderation routes added in S-21..S-26
  - files: `frontend/src/**`
  - run: `playwright or chrome-devtools verification of all routes and flows added in S-21..S-26`
  - evidence: Pending.

- [ ] Complete an end-to-end UI audit of the site and manually check every flow added in S-21..S-26
  - files: `frontend/src/**`, `src/server.ts`, `test/**`, `docs/TRACEABILITY_V1.md`, `docs/RELEASE_READINESS_RUNBOOK.md`, `docs/SUCCESS_METRICS_PLAN.md`, `frontend/README.md`
  - run: `ui-audit plus manual playwright or chrome-devtools verification of every public, authenticated, contributor, moderation, and trust flow added in S-21..S-26`
  - evidence: Pending.

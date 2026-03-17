# Sprint

Window: 2026-03-17 to 2026-04-14

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

Harden the shipped public discovery frontend into a citizen-facing, Finland-first product by removing developer jargon, foregrounding live promise content, fixing correctness gaps, and closing key design and interaction drift.

---

| ID | Do | Files | Acceptance | Evidence | Stop | Status |
| --- | --- | --- | --- | --- | --- | --- |
| S-15 | Rewrite public trust copy and shared placeholder language for citizen-facing discovery. See `S-15` substeps below. | `frontend/src/routes/HomePage.tsx`, `frontend/src/routes/PartiesPage.tsx`, `frontend/src/routes/PartyProfilePage.tsx`, `frontend/src/routes/PoliticiansPage.tsx`, `frontend/src/routes/PoliticianProfilePage.tsx`, `frontend/src/routes/PromiseDetailPage.tsx`, `frontend/src/routes/MethodologyPage.tsx`, `frontend/src/types.ts` | No public route shows `route shell`, `frontend-local`, `canonical API`, or `Placeholder shell` copy; the home trust section remains but is rewritten in citizen-facing language; unknown states are concise and point to methodology instead of implementation notes. | Accepted in REVIEW. packets:44b0ce3,445c754,f63dea3 satisfy the copy acceptance and required verification runs. | Stop if the rewrite would require changing backend semantics or contradict `docs/FRONTEND_V3_SPEC.md`. | DONE |
| S-16 | Rebuild home hierarchy around live promise content and denser discovery modules. See `S-16` substeps below. | `frontend/src/routes/HomePage.tsx`, `frontend/src/lib/domain.ts`, `frontend/src/styles.css`, `frontend/src/types.ts` | Home keeps search primary, surfaces latest promise content above generic filler, uses denser politician and party discovery modules, and presents "How this works" as a short visual explainer. | Accepted in REVIEW. packet:589c1d4 satisfies the home hierarchy acceptance and required static verification. | Stop if current APIs cannot support a truthful live promise feed without inventing metadata. | DONE |
| S-17 | Fix Finland-first correctness and misleading public-state behavior. See `S-17` substeps below. | `frontend/src/lib/format.ts`, `frontend/src/lib/domain.ts`, `frontend/src/routes/PoliticiansPage.tsx`, `frontend/src/routes/PoliticianProfilePage.tsx`, `frontend/src/routes/PromiseDetailPage.tsx`, `frontend/src/styles.css` | Public dates and taxonomy are Finland-first, party and sort controls do not imply unavailable behavior, promise detail waits for shared context before rendering linked politician or party data, and raw internal evidence jargon is removed from public views. | Accepted in REVIEW. packets:b9d1349,b0ad038 satisfy the Finland-first correctness and public-state acceptance. | Stop if honest behavior requires new backend fields rather than frontend gating or copy fixes. | DONE |
| S-18 | Close design-system and navigation drift on public routes. See `S-18` substeps below. | `frontend/src/layout/PublicLayout.tsx`, `frontend/src/routes/HomePage.tsx`, `frontend/src/routes/PartiesPage.tsx`, `frontend/src/routes/PartyProfilePage.tsx`, `frontend/src/routes/PoliticianProfilePage.tsx`, `frontend/src/routes/PromiseDetailPage.tsx`, `frontend/src/styles.css` | Critical public routes use amber party identity, claim styling, footer, breadcrumbs, and a visual sentiment treatment that distinguishes community sentiment from voting records. | Accepted in REVIEW. packets:4882359,b9d86e8 satisfy the design-system and navigation acceptance for the public routes. | Stop if the design work causes responsive or accessibility regressions that cannot be resolved within the same frontend area. | DONE |
| S-19 | Enrich methodology structure and interaction polish for public discovery. See `S-19` substeps below. | `frontend/src/routes/MethodologyPage.tsx`, `frontend/src/routes/HomePage.tsx`, `frontend/src/routes/PoliticiansPage.tsx`, `frontend/src/routes/PoliticianProfilePage.tsx`, `frontend/src/routes/PartyProfilePage.tsx`, `frontend/src/routes/PromiseDetailPage.tsx`, `frontend/src/lib/domain.ts`, `frontend/src/styles.css` | Methodology has a richer editorial structure with a sticky TOC, directory rows and key navigation surfaces are easier to traverse, and search suggestions, back links, and tab motion work without breaking keyboard flow. | packets:eb8d347,0e0699b,6a71cb0 complete; S-19 ready for review. | Stop if interaction work requires new backend endpoints instead of client-side navigation or search behavior. | READY |
| S-20 | Verify the hardened public slice with static, browser, and accessibility proof. See `S-20` substeps below. | `frontend/**` | `pnpm frontend:typecheck`, `pnpm frontend:build`, and browser/accessibility verification pass across `/`, `/politicians`, `/politicians/:id`, `/parties`, `/parties/:id`, `/promises/:id`, and `/methodology` with no blocking regressions. | Pending DO packet evidence. | Stop if required verification exposes regressions that cannot be fixed within the same frontend area. | TODO |

### S-15 substeps

- [ ] Rewrite home hero, trust section, and party discovery labels in citizen-facing language
  - files: `frontend/src/routes/HomePage.tsx`
  - run: `pnpm frontend:typecheck`
  - evidence: packet:44b0ce3 | run:pnpm frontend:typecheck -> pass | files:frontend/src/routes/HomePage.tsx | docs:N/A | status: clean

- [ ] Remove placeholder-shell terminology from shared party seed data and party-route copy
  - files: `frontend/src/routes/PartiesPage.tsx`, `frontend/src/routes/PartyProfilePage.tsx`, `frontend/src/types.ts`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:445c754 | run:pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/routes/PartiesPage.tsx, frontend/src/routes/PartyProfilePage.tsx, frontend/src/types.ts | docs:N/A | status: clean

- [ ] Collapse verbose unknown-state explanations across politician, promise, and methodology surfaces into concise public wording
  - files: `frontend/src/routes/PoliticiansPage.tsx`, `frontend/src/routes/PoliticianProfilePage.tsx`, `frontend/src/routes/PromiseDetailPage.tsx`, `frontend/src/routes/MethodologyPage.tsx`
  - run: `pnpm frontend:build`
  - evidence: packet:f63dea3 | run:pnpm frontend:build -> pass | files:frontend/src/routes/MethodologyPage.tsx, frontend/src/routes/PoliticianProfilePage.tsx, frontend/src/routes/PoliticiansPage.tsx, frontend/src/routes/PromiseDetailPage.tsx | docs:N/A | status: clean

### S-16 substeps

- [ ] Add a latest-promises feed on home using current statement data and linked politician context
  - files: `frontend/src/routes/HomePage.tsx`, `frontend/src/lib/domain.ts`
  - run: `pnpm frontend:typecheck`
  - evidence: packet:589c1d4 | run:pnpm frontend:typecheck -> pass | files:frontend/src/lib/domain.ts, frontend/src/routes/HomePage.tsx, frontend/src/styles.css, frontend/src/types.ts | docs:N/A | status: clean

- [ ] Replace sparse politician summary cards with denser discovery modules and richer browse-by-party cards
  - files: `frontend/src/routes/HomePage.tsx`, `frontend/src/styles.css`, `frontend/src/types.ts`
  - run: `pnpm frontend:build`
  - evidence: packet:589c1d4 | run:pnpm frontend:build -> pass | files:frontend/src/lib/domain.ts, frontend/src/routes/HomePage.tsx, frontend/src/styles.css, frontend/src/types.ts | docs:N/A | status: clean

- [ ] Rework the home "How this works" block into a compact visual explainer that supports the search CTA instead of competing with it
  - files: `frontend/src/routes/HomePage.tsx`, `frontend/src/styles.css`
  - run: `pnpm frontend:build`
  - evidence: packet:589c1d4 | run:pnpm frontend:build -> pass | files:frontend/src/lib/domain.ts, frontend/src/routes/HomePage.tsx, frontend/src/styles.css, frontend/src/types.ts | docs:N/A | status: clean

### S-17 substeps

- [ ] Switch public date and time formatting plus identity separators to Finland-first conventions
  - files: `frontend/src/lib/format.ts`
  - run: `pnpm frontend:typecheck`
  - evidence: packet:b9d1349 | run:pnpm frontend:typecheck -> pass | files:frontend/src/lib/domain.ts, frontend/src/lib/format.ts, frontend/src/routes/PoliticiansPage.tsx, frontend/src/styles.css | docs:N/A | status: clean

- [ ] Replace US-centric issue keywords and labels with Finland-relevant taxonomy used consistently across home and directory filters
  - files: `frontend/src/lib/domain.ts`, `frontend/src/routes/HomePage.tsx`, `frontend/src/routes/PoliticiansPage.tsx`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:b9d1349 | run:pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/lib/domain.ts, frontend/src/lib/format.ts, frontend/src/routes/PoliticiansPage.tsx, frontend/src/styles.css | docs:N/A | status: clean

- [ ] Gate or disable party filtering and fulfillment sorting when the current dataset cannot support truthful results
  - files: `frontend/src/routes/PoliticiansPage.tsx`, `frontend/src/styles.css`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:b9d1349 | run:pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/lib/domain.ts, frontend/src/lib/format.ts, frontend/src/routes/PoliticiansPage.tsx, frontend/src/styles.css | docs:N/A | status: clean

- [ ] Keep promise detail and evidence timeline waiting on shared context instead of rendering missing politician-party links or raw verification jargon
  - files: `frontend/src/routes/PoliticianProfilePage.tsx`, `frontend/src/routes/PromiseDetailPage.tsx`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:b0ad038 | run:pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/routes/PoliticianProfilePage.tsx, frontend/src/routes/PromiseDetailPage.tsx | docs:N/A | status: clean

### S-18 substeps

- [ ] Add missing amber tokens and reusable party-badge and claim-block styling aligned with the spec
  - files: `frontend/src/styles.css`, `frontend/src/routes/HomePage.tsx`, `frontend/src/routes/PartiesPage.tsx`, `frontend/src/routes/PartyProfilePage.tsx`, `frontend/src/routes/PoliticianProfilePage.tsx`, `frontend/src/routes/PromiseDetailPage.tsx`
  - run: `pnpm frontend:build`
  - evidence: packet:4882359 | run:pnpm frontend:build -> pass | files:frontend/src/routes/HomePage.tsx, frontend/src/routes/PartiesPage.tsx, frontend/src/routes/PartyProfilePage.tsx, frontend/src/routes/PoliticianProfilePage.tsx, frontend/src/routes/PromiseDetailPage.tsx, frontend/src/styles.css | docs:N/A | status: clean

- [ ] Add a public footer and breadcrumbs across politician, party, and promise detail routes
  - files: `frontend/src/layout/PublicLayout.tsx`, `frontend/src/routes/PoliticianProfilePage.tsx`, `frontend/src/routes/PartyProfilePage.tsx`, `frontend/src/routes/PromiseDetailPage.tsx`, `frontend/src/styles.css`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:b9d86e8 | run:pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/layout/PublicLayout.tsx, frontend/src/routes/PartyProfilePage.tsx, frontend/src/routes/PoliticianProfilePage.tsx, frontend/src/routes/PromiseDetailPage.tsx, frontend/src/styles.css | docs:N/A | status: clean

- [ ] Turn the community sentiment block into a simple visual treatment that stays clearly separate from vote alignment
  - files: `frontend/src/routes/PromiseDetailPage.tsx`, `frontend/src/styles.css`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:b9d86e8 | run:pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/layout/PublicLayout.tsx, frontend/src/routes/PartyProfilePage.tsx, frontend/src/routes/PoliticianProfilePage.tsx, frontend/src/routes/PromiseDetailPage.tsx, frontend/src/styles.css | docs:N/A | status: clean

### S-19 substeps

- [ ] Rebuild methodology into a richer editorial page with a sticky TOC and clearer section hierarchy
  - files: `frontend/src/routes/MethodologyPage.tsx`, `frontend/src/styles.css`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:eb8d347 | run:pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/routes/MethodologyPage.tsx, frontend/src/styles.css | docs:N/A | status: clean

- [ ] Make directory rows and key navigation surfaces easier to traverse with full-row links and contextual back links
  - files: `frontend/src/routes/PoliticiansPage.tsx`, `frontend/src/routes/PoliticianProfilePage.tsx`, `frontend/src/routes/PartyProfilePage.tsx`, `frontend/src/routes/PromiseDetailPage.tsx`, `frontend/src/styles.css`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:0e0699b | run:pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/routes/PartyProfilePage.tsx, frontend/src/routes/PoliticianProfilePage.tsx, frontend/src/routes/PoliticiansPage.tsx, frontend/src/routes/PromiseDetailPage.tsx, frontend/src/styles.css | docs:N/A | status: clean

- [ ] Add search suggestions and tab-motion polish without breaking keyboard accessibility or URL-state behavior
  - files: `frontend/src/routes/HomePage.tsx`, `frontend/src/routes/PoliticiansPage.tsx`, `frontend/src/routes/PoliticianProfilePage.tsx`, `frontend/src/lib/domain.ts`, `frontend/src/styles.css`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: packet:6a71cb0 | run:pnpm frontend:typecheck && pnpm frontend:build -> pass | files:frontend/src/lib/domain.ts, frontend/src/routes/HomePage.tsx, frontend/src/routes/PoliticianProfilePage.tsx, frontend/src/routes/PoliticiansPage.tsx, frontend/src/styles.css | docs:N/A | status: clean

### S-20 substeps

- [ ] Run static proof for the hardened public slice
  - files: `frontend/**`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: Pending DO packet evidence.

- [ ] Browser-verify the hardened public routes across discovery, profile, and methodology flows
  - files: `frontend/**`
  - run: `playwright MCP verification of /, /politicians, /politicians/:id, /parties, /parties/:id, /promises/:id, /methodology`
  - evidence: Pending DO packet evidence.

- [ ] Run focused accessibility checks for keyboard flow, sticky controls, breadcrumbs, TOC, and responsive card-table fallbacks
  - files: `frontend/**`
  - run: `playwright or chrome-devtools accessibility verification of the critical public routes`
  - evidence: Pending DO packet evidence.

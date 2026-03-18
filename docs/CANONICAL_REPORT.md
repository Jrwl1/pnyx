# Canonical report

Last updated: 2026-03-17

## Migration summary

- Replaced the legacy always-on `ai/` repository OS with an opt-in root `AGENTS.md` contract modeled on the `saas-monorepo` approach.
- Moved the old `ai/` tree, root `PROJECT_STATUS.md`, root `TASKS.md`, root `WORKLOG.md`, old `AGENTS.md`, and delegation smoke-test artifacts out of the repo and into `C:\Users\john\aios\_archive\Pnyx-aios-legacy-2026-03-16`.
- Added a new canonical planning set under `docs/`: `CANONICAL.md`, `PROJECT_STATUS.md`, `ROADMAP.md`, `BACKLOG.md`, `SPRINT.md`, `DECISIONS.md`, `CANONICAL_REPORT.md`, and `WORKLOG.md`.
- Removed active repo-local references to delegation and autopilot flows from `.cursor/skills/security-auditor/SKILL.md` and `.cursor/rules/security-auditor.mdc`.

## Conflict resolution notes

1. The previous Pnyx contract required every session to read repo AI OS docs first.
   - Winner: the new opt-in `AGENTS.md` contract. Normal chat is now the default.
2. Historical planning state lived in root files plus `ai/` subtrees.
   - Winner: the new `docs/` canonical set. Historical material was archived outside the repo.
3. Delegation guidance existed in repo docs and helper rules.
   - Winner: the no-delegation rule in the new active contract. Direct MCP tools remain allowed and encouraged where useful.

## Reconciliation update

- The previous `PLAN` run absorbed `docs/FRONTEND_V3_SPEC.md` into the active canonical direction and opened the first frontend public-discovery queue.
- That queue is now complete in code: `frontend/` ships public nav plus routes for `/`, `/politicians`, `/politicians/:id`, `/parties`, `/parties/:id`, `/promises/:id`, `/methodology`, and optional `/ops`.
- A 2026-03-17 source audit (`design/FRONTEND_AUDIT.md`) plus direct review of `frontend/src/**` found that the shipped M2 slice is structurally present but still under the intended trust and editorial bar:
  - Public copy still exposes implementation-state language (`route shell`, `frontend-local`, `canonical party API`) instead of citizen-facing product language.
  - Home still hides live promise content below explanatory filler.
  - `frontend/src/lib/format.ts` formats public dates with `en-US`, and `frontend/src/lib/domain.ts` still uses US-centric issue keywords.
  - `frontend/src/routes/PoliticiansPage.tsx` exposes party and fulfillment controls that can imply unavailable behavior.
  - `frontend/src/routes/PromiseDetailPage.tsx` depends on shared politician context without waiting for the shared provider to finish.
- Resolution by canonical hierarchy:
  - Code and prior worklog entries win for what is already shipped: the M2 public-discovery foundation is real.
  - `docs/ROADMAP.md`, `docs/SPRINT.md`, and `docs/FRONTEND_V3_SPEC.md` win for what must be delivered next: M3 now targets public trust, editorial refinement, and Finland-first hardening.
- Audit-vs-spec conflict resolved:
  1. The audit recommends deleting the home `What PNYX is / is not` section.
     - Winner: `docs/FRONTEND_V3_SPEC.md`, which explicitly requires a trust section on home.
     - Resolution: keep the trust block, but rewrite it in citizen-facing language instead of dev-facing negative definitions.
  2. Several audit suggestions depend on backend data that does not exist yet.
     - Winner: current code and backend reality.
     - Resolution: keep backend-dependent upgrades in backlog while the active sprint fixes the frontend-only trust, IA, locale, and design gaps now.

## 2026-03-17 implementation-sprint expansion

- The M3 frontend-hardening queue is now closed in planning: `docs/SPRINT.md` marked `S-15` through `S-20` done, and `docs/ROADMAP.md` now records M3 as complete.
- Direct code and test review show a real split between what the backend already supports and what the frontend currently exposes:
  - Backend reality: registration, statement capture, statement voting, and politician-proposal moderation already exist and are regression-tested in `src/server.ts` and `test/**`.
  - Frontend reality: `frontend/src/lib/api.ts` is still read-only, so the shipped public app remains a browse-first alpha even though the backend supports contribution and moderation paths.
- Conflict resolved by canonical hierarchy:
  1. Previous planning framed M4 as generic moderation and backend expansion.
     - Winner: current code reality plus the new grounded implementation roadmap.
     - Resolution: M4 is now narrowed to contribution reachability, real party graph delivery, and canonical-promise foundation work that the repo can execute next without fabricating trust logic.
  2. The broader future-direction analysis proposed six implementation chunks that span beyond one narrow milestone.
     - Winner: `docs/PROJECT_STATUS.md` keeps one active milestone (`M4`), while `docs/SPRINT.md` now queues `S-21` through `S-26` top-to-bottom so execution can continue deterministically into later planned milestones without a second planning system.
- Planning resolution:
  - `docs/SPRINT.md` now carries one comprehensive implementation queue from frontend auth and contribution reachability through final UI audit and manual verification.
  - `docs/BACKLOG.md` marks the completed M3 frontend-hardening items done and promotes the party, canonical-promise, canonization, trust-graph, and release-hardening follow-ups into the active queue.

## 2026-03-17 launchability re-baseline

- Current code and sprint evidence now show that M4 through M6 are complete in code, tests, and browser verification:
  - contribution routes exist in the frontend,
  - canonical party and promise models exist in schema,
  - claim canonization and trust summaries exist in the backend and public UI,
  - release-proof and route-wide audit evidence exists in `docs/SPRINT.md`.
- Conflict resolved by canonical hierarchy:
  1. Previous roadmap state still showed M4 in progress and M5-M6 planned.
     - Winner: current code, current tests, current completed sprint evidence, and clean-tree proof runs.
     - Resolution: `docs/ROADMAP.md` now marks M4-M6 done and opens a new M7 launchability milestone.
  2. The original future-direction gap was largely product-shape and data-model focused.
     - Winner: current code reality.
     - Resolution: the next planning gap is no longer "can the repo model the product?" but "can this repo launch safely?".
- Planning resolution:
  - `docs/PROJECT_STATUS.md` now pivots from completed implementation rows to launch blockers: shared-secret auth, editorial ops reachability, regression depth, and release orchestration.
  - `docs/BACKLOG.md` marks all completed M4-M6 items done and opens a new launchability epic.
  - `docs/SPRINT.md` now carries `S-27` through `S-31`, focused on secure auth, protected editorial ops, durable automated coverage, release rehearsal, and final launch audit.
- Auth decision resolution:
  - The repo needed a concrete launch-auth assumption rather than an open question.
  - Resolution: `docs/DECISIONS.md` adds ADR-003, which selects email-based launch auth and removes the current shared-secret public sign-in model from the launch path.

## 2026-03-18 S-29 unblock resolution

- Repeated `S-29` attempts proved that the blocker was no longer product behavior but the selected automation path:
  - repo-native Windows browser harness attempts worked manually outside the runner,
  - but did not stay reliable enough inside `pnpm test:ui` to count as durable launch automation.
- Conflict resolved by canonical hierarchy:
  1. The previous `S-29` row implicitly assumed durable browser coverage should be delivered without widening scope to lockfiles or browser-test wiring.
     - Winner: implementation reality from the blocked `S-29` attempts.
     - Resolution: `docs/SPRINT.md` now widens `S-29` scope to include `pnpm-lock.yaml`, `playwright.config.*`, and `docs/security/**` so the dependency-backed browser automation path is valid.
  2. Backlog note `B-708` previously left the browser-automation decision open.
     - Winner: the new explicit decision.
     - Resolution: `docs/DECISIONS.md` adds ADR-004 and `docs/BACKLOG.md` marks `B-708` done.
- Planning consequence:
  - `S-29` is now unblocked at the planning level.
  - The next execution pass should stop trying to brute-force the no-new-dependency Windows harness and instead implement the dependency-backed browser automation path inside the widened sprint scope.

## 2026-03-18 S-31 launch closeout

- Final launchability acceptance is now grounded in repeatable repo evidence instead of manual-only reasoning:
  - `pnpm test` passed with the new `test/launch-rehearsal.test.ts` seed proof,
  - `pnpm proof:launch` passed from the final `S-31` product commit,
  - `seed:launch-rehearsal`, `launch:coverage`, and `smoke:release` passed against a fresh temp database and a live isolated server,
  - chrome-devtools route verification covered public, auth, contributor, moderator, editorial, and trust routes on the seeded live pair,
  - Lighthouse snapshot accessibility stayed at `100` on the sampled launch-critical routes.
- Conflict resolved by implementation reality:
  1. `/claims/:id` had been routed publicly while the page and API contract required a signed-in session.
     - Winner: code-path reality discovered during the final route audit.
     - Resolution: `frontend/src/App.tsx` now protects `/claims/:id` behind `RequireAuthRoute`, and the launch audit explicitly verifies the redirect behavior before sign-in and the route behavior after sign-in.
  2. The launch rehearsal seed path was previously implicit and not repeatable from a fresh temp DB.
     - Winner: final launch acceptance criteria.
     - Resolution: the repo now has `seed:launch-rehearsal`, `launch:coverage`, shared seed helpers, and refreshed runbooks/traceability docs.
- Residual risk:
  - Lighthouse snapshot SEO remained at `60` on the Vite dev-server audit pages. This is documented as a non-blocking post-launch follow-up in `docs/BACKLOG.md` and does not change the launchability verdict because functional, accessibility, and release-proof criteria all passed.

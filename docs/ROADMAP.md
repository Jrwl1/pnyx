# Roadmap

Last updated: 2026-03-17

Planning baseline:

- Finland-first launch scope
- Build from current shipped `frontend/`, `src/`, `test/`, and migration reality
- Expose already-tested backend capability in the frontend before inventing new product layers
- Separate raw submissions, canonical facts, and derived trust metrics instead of overloading one entity
- Direct MCP tools are preferred for evidence and verification when they materially help

## M0: Repository OS reset and delegation removal

**Status:** Done.

**Done criteria:**

1. `Pnyx` uses an opt-in repo OS contract at `AGENTS.md`.
2. Canonical planning docs live under `docs/`.
3. Delegation and autopilot tooling are removed from active repo docs and repo-local helper rules.
4. Legacy always-on AI OS materials are archived outside the repo so fresh windows do not get captured by stale instructions.

## M1: Finland-first public discovery and party context lock

**Status:** Done.

**Done criteria:**

1. Canonical docs define the next public delivery slice against the shipped Frontend V3 and backend state.
2. Party pages, party stance records, and politician-vs-party alignment surfaces are explicitly scoped.
3. The data-model implications for party context are identified before implementation begins.
4. `docs/SPRINT.md` contains an executable queue for the first delivery slice.

## M2: Public discovery foundation

**Status:** Done.

**Done criteria:**

1. Public navigation and routing include `Home | Politicians | Parties | Methodology` plus `/parties` and `/parties/:id`.
2. Home, directory, party, promise, and methodology routes exist against the current backend and render honest unknown states instead of fabricated accountability data.
3. Party-context surfaces are present across politician, promise, and methodology routes without inventing fulfillment, vote, or party-line outcomes.
4. `pnpm frontend:typecheck`, `pnpm frontend:build`, and baseline browser verification pass against the shipped public discovery slice.

## M3: Public trust, editorial refinement, and Finland-first hardening

**Status:** Done.

**Done criteria:**

1. Public routes remove developer-facing implementation language while preserving concise honest unknown-state handling and a citizen-facing trust section.
2. Home foregrounds live promise content, denser politician/party discovery, and a stronger "find a politician" hierarchy without becoming a leaderboard page.
3. Finland-first correctness gaps are fixed across locale formatting, issue taxonomy, and public interaction states that currently imply unavailable behavior.
4. Critical public routes align with `docs/FRONTEND_V3_SPEC.md` for visual identity and navigation: amber party accents, party badges, claim styling, footer, breadcrumbs, richer methodology structure, and clear community-sentiment treatment.
5. `pnpm frontend:typecheck`, `pnpm frontend:build`, and browser/accessibility verification pass for `/`, `/politicians`, `/politicians/:id`, `/parties`, `/parties/:id`, `/promises/:id`, and `/methodology`.

## M4: Contribution, party graph, and canonical promise foundation

**Status:** In progress.

**Done criteria:**

1. Frontend auth and contribution surfaces expose the current backend registration, statement capture, statement voting, and politician-proposal workflows.
2. Backend-backed parties, aliases, and memberships replace the current frontend-only party placeholders.
3. Canonical promises exist beside legacy statements, and public/frontend reads can distinguish raw submissions from canonical public promise records.
4. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm frontend:typecheck`, and `pnpm frontend:build` pass, plus browser verification of new auth, contribution, and party-backed flows.

## M5: Claim canonization and accountability graph

**Status:** Planned.

**Done criteria:**

1. Claim/source submission, duplicate-assist, equivalence signaling, and moderator canonization queues exist for promise records.
2. Canonical promise pages show accepted source bundles, merge history, and public change context instead of a single raw statement record.
3. Moderation reason codes, audits, and optimistic-lock protections extend from politician proposals into claim canonization flows.
4. Public methodology and moderation surfaces explain how user submissions become canonical public facts.

## M6: Trust scoring, release hardening, and launch audit

**Status:** Planned.

**Done criteria:**

1. Party stances, vote-event mappings, fulfillment assessments, and party-alignment assessments exist and are sourceable.
2. Politician and party pages show backend-derived trust dimensions with explicit unknown handling and no fabricated composites.
3. Search, regression coverage, release-readiness docs, and auditability are updated for the expanded accountability graph.
4. A complete UI audit and manual verification pass succeeds across all public, authenticated, contributor, and moderation flows added in M4-M6.

## Explicitly out of current scope

1. Delegation or autopilot-based repo execution flows
2. Cross-country rollout before the Finland-first model is proven in code
3. Reusing community sentiment votes as truth-validation or vote-alignment data
4. A single opaque trust score before promise, fulfillment, and party-alignment assessments are backed by sourceable records
5. Fully automated multi-provider ingest before the first Finland-first manual or admin-backed source path is stable
6. Launching contribution-heavy public flows without auditability, moderation reasons, and abuse controls

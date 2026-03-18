# Roadmap

Last updated: 2026-03-18

Planning baseline:

- Finland-first public product scope remains the operating boundary
- Build from current shipped `frontend/`, `src/`, `test/`, and migration reality
- Treat the accepted launch baseline as complete and preserve its proof chain while widening post-launch scope
- Keep raw submissions, canonical facts, derived trust metrics, and automated ingest provenance separate
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

**Status:** Done.

**Done criteria:**

1. Frontend auth and contribution surfaces expose the current backend registration, statement capture, statement voting, and politician-proposal workflows.
2. Backend-backed parties, aliases, and memberships replace the previous frontend-only party placeholders.
3. Canonical promises exist beside legacy statements, and public/frontend reads can distinguish raw submissions from canonical public promise records.
4. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm frontend:typecheck`, and `pnpm frontend:build` pass, plus browser verification of new auth, contribution, and party-backed flows.

## M5: Claim canonization and accountability graph

**Status:** Done.

**Done criteria:**

1. Claim/source submission, duplicate-assist, equivalence signaling, and moderator canonization queues exist for promise records.
2. Canonical promise pages show accepted source bundles, merge history, and public change context instead of a single raw statement record.
3. Moderation reason codes, audits, and optimistic-lock protections extend from politician proposals into claim canonization flows.
4. Public methodology and moderation surfaces explain how user submissions become canonical public facts.

## M6: Trust scoring, release hardening, and launch audit foundation

**Status:** Done.

**Done criteria:**

1. Party stances, vote-event mappings, fulfillment assessments, and party-alignment assessments exist and are sourceable.
2. Politician and party pages show backend-derived trust dimensions with explicit unknown handling and no fabricated composites.
3. Search, regression coverage, release-readiness docs, and auditability are updated for the expanded accountability graph.
4. A complete UI audit and manual verification pass succeeds across all public, authenticated, contributor, and moderation flows added in M4-M6.

## M7: Launchability hardening and release orchestration

**Status:** Done.

**Done criteria:**

1. Shared-secret public sign-in is replaced by a launch-safe auth and session flow aligned to registered email identities, and moderator or admin role provisioning no longer depends on public role or secret entry.
2. Editorial operations for party stances, vote events, fulfillment assessments, and party-line assessments are reachable through protected product surfaces instead of backend-only APIs or manual seeding.
3. Durable automated coverage exists for critical public, auth, contributor, moderation, and editorial flows, and the launch proof chain includes those checks.
4. Release and deploy sequencing, backup and restore rehearsal, observability, smoke checks, and a final go or no-go UI audit are documented and verified from a clean tree.
5. Launch browser automation may use repo-managed dependencies and lockfile changes when the no-new-dependency path is not reliable enough on the target environment, provided those changes stay inside the sprint scope and include any required security audit notes.

## M8: Post-launch product hardening, automation, and growth

**Status:** In progress.

**Done criteria:**

1. The legacy shared-secret auth path is removed, protected product surfaces expose party creation, alias maintenance, membership create or update, and direct canonical-promise maintenance, and public promise discovery includes a dedicated browse route.
2. Public routes emit route-specific SEO metadata, canonical URLs, and share-preview tags, and repo-managed proof verifies those outputs on the critical public surface.
3. Explicit event logging plus notification and preference infrastructure exist for auth, contribution, moderation, and editorial flows, replacing the current proxy-only retention assumption.
4. Contributor reputation, queue prioritization, moderation ergonomics, and broader abuse signals evolve beyond the first launch-safe baseline without collapsing public truth into opaque scores.
5. Finland-first automated ingest from official party and parliamentary sources lands with raw provenance, normalization, deduplication, and moderation-safe staging for the first supported source set.
6. Proof, release, traceability, and metrics docs are refreshed for the widened post-launch stack and pass from a clean tree.

## Explicitly out of current scope

1. Delegation or autopilot-based repo execution flows
2. Cross-country rollout before the Finland-first launch and ingest paths are proven in production
3. Retaining the legacy shared-secret public sign-in path alongside the email-code public auth flow
4. Reusing community sentiment votes as truth-validation or vote-alignment data
5. A single opaque trust score before promise, fulfillment, party-alignment, and reputation systems are backed by sourceable records and clear semantics
6. Full automated multi-provider ingest and outbound notification campaigning before the first Finland-first ingest and preference model are stable

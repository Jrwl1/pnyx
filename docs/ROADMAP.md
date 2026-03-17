# Roadmap

Last updated: 2026-03-17

Planning baseline:

- Finland-first launch scope
- Public discovery first, then deeper trust and moderation surfaces
- Product truth must stay aligned with shipped `frontend/`, `src/`, and `test/`
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

**Status:** In progress.

**Done criteria:**

1. Public routes remove developer-facing implementation language while preserving concise honest unknown-state handling and a citizen-facing trust section.
2. Home foregrounds live promise content, denser politician/party discovery, and a stronger "find a politician" hierarchy without becoming a leaderboard page.
3. Finland-first correctness gaps are fixed across locale formatting, issue taxonomy, and public interaction states that currently imply unavailable behavior.
4. Critical public routes align with `docs/FRONTEND_V3_SPEC.md` for visual identity and navigation: amber party accents, party badges, claim styling, footer, breadcrumbs, richer methodology structure, and clear community-sentiment treatment.
5. `pnpm frontend:typecheck`, `pnpm frontend:build`, and browser/accessibility verification pass for `/`, `/politicians`, `/politicians/:id`, `/parties`, `/parties/:id`, `/promises/:id`, and `/methodology`.

## M4: Moderation, release-readiness, and backend data expansion

**Status:** Planned.

**Done criteria:**

1. Moderation and proposal-review surfaces stay aligned with the hardened public model.
2. Key trust and abuse boundaries have current regression coverage.
3. Release-readiness, traceability, and success-metrics docs are updated to match implemented behavior.
4. Backend-ready follow-ups for canonical parties, memberships, party stances, and richer evidence modeling are planned or delivered without faking public data.

## Explicitly out of current scope

1. Delegation or autopilot-based repo execution flows
2. Repo-specific rules that deny useful non-delegating MCP tools by default
3. Product planning that is not grounded in current shipped `frontend/`, `src/`, and `test/` reality
4. Cross-country rollout before the Finland-first model is proven in code
5. Full backend delivery of canonical parties, memberships, party stances, or real evidence-count modeling inside the current frontend-hardening milestone
6. Public leaderboards as a primary discovery mechanic

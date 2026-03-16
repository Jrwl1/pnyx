# Roadmap

Last updated: 2026-03-16

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

**Status:** In progress.

**Done criteria:**

1. Canonical docs define the next public delivery slice against the shipped Frontend V3 and backend state.
2. Party pages, party stance records, and politician-vs-party alignment surfaces are explicitly scoped.
3. The data-model implications for party context are identified before implementation begins.
4. `docs/SPRINT.md` contains an executable queue for the first delivery slice.

## M2: Public discovery implementation

**Status:** Planned.

**Done criteria:**

1. Public politician and party discovery surfaces are implemented against the locked milestone.
2. The first party-context surfaces are visible and test-covered.
3. Search, routing, and detail pages stay consistent with `docs/FRONTEND_V3_SPEC.md` and the updated canonical docs.

## M3: Trust, moderation, and evidence hardening

**Status:** Planned.

**Done criteria:**

1. Moderation and proposal-review surfaces stay aligned with the public discovery model.
2. Key trust and abuse boundaries have current regression coverage.
3. Release-readiness and traceability docs are updated to match implemented behavior.

## Explicitly out of current scope

1. Delegation or autopilot-based repo execution flows
2. Repo-specific rules that deny useful non-delegating MCP tools by default
3. Product planning that is not grounded in current shipped `frontend/`, `src/`, and `test/` reality

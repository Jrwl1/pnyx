# Backlog

Structured work pool. `docs/SPRINT.md` is the active execution queue.

## Epic E1: Repository OS and planning hygiene

- B-001: Replace the legacy always-on `ai/` router with an opt-in `AGENTS.md` contract. -- DONE
- B-002: Move canonical planning docs into `docs/` and reset the active planning set. -- DONE
- B-003: Remove delegation and autopilot guidance from active repo docs and repo-local helper rules. -- DONE
- B-004: Keep direct MCP usage explicit for repo-safe tasks (`filesystem`, `git`, `github`, `context7`, `chrome-devtools`, `playwright`). -- DONE

## Epic E2: Finland-first public discovery and party context

- B-101: Lock the next public discovery milestone against the shipped Frontend V3 and backend reality.
- B-102: Define party-page requirements and acceptance criteria.
- B-103: Define party stance records separately from politician stance records.
- B-104: Define politician-vs-party alignment and party-line-break surfaces.
- B-105: Identify data-model and API implications before implementation.

## Epic E3: Public-surface implementation

- B-201: Implement party discovery surfaces and routing.
- B-202: Extend politician detail views with party-context surfaces where appropriate.
- B-203: Add test coverage for public discovery routing and key trust boundaries.
- B-204: Reconcile `docs/FRONTEND_V3_SPEC.md` with the next shipped public slice.

## Epic E4: Trust and moderation hardening

- B-301: Audit proposal, moderation, and admin flows against the public discovery model.
- B-302: Tighten abuse and audit evidence where current tests or docs are thin.
- B-303: Refresh release-readiness docs once the next public slice lands.

# Backlog

Structured work pool. `docs/SPRINT.md` is the active execution queue.

## Epic E1: Repository OS and planning hygiene

- B-001: Replace the legacy always-on `ai/` router with an opt-in `AGENTS.md` contract. -- DONE
- B-002: Move canonical planning docs into `docs/` and reset the active planning set. -- DONE
- B-003: Remove delegation and autopilot guidance from active repo docs and repo-local helper rules. -- DONE
- B-004: Keep direct MCP usage explicit for repo-safe tasks (`filesystem`, `git`, `github`, `context7`, `chrome-devtools`, `playwright`). -- DONE

## Epic E2: Finland-first public discovery and party context

- B-101: Lock the next public discovery milestone against the shipped Frontend V3 and backend reality. -- DONE
- B-102: Define party-page requirements and acceptance criteria. -- DONE
- B-103: Define party stance records separately from politician stance records. -- DONE
- B-104: Define politician-vs-party alignment and party-line-break surfaces. -- DONE
- B-105: Identify data-model and API implications before implementation. -- DONE

## Epic E3: Public-surface implementation

- B-201: Implement route shell changes for `Parties` nav, `/parties`, and `/parties/:id`.
- B-202: Refresh home and politician directory for Finland-first public discovery.
- B-203: Extend politician profile, promise detail, and methodology with party-context surfaces.
- B-204: Add verification coverage for updated public discovery routing, build, and browser-verified trust states. -- IN SPRINT
- B-205: Introduce frontend-local party placeholder data or equivalent honest unknown-state structures until backend party APIs exist.
- B-206: Add backend-ready follow-ups for canonical parties, memberships, and party stances once frontend route shells land.

## Epic E4: Trust and moderation hardening

- B-301: Audit proposal, moderation, and admin flows against the public discovery model.
- B-302: Tighten abuse and audit evidence where current tests or docs are thin.
- B-303: Refresh release-readiness docs once the next public slice lands.

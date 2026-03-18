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

- B-201: Implement route shell changes for `Parties` nav, `/parties`, and `/parties/:id`. -- DONE
- B-202: Refresh home and politician directory for Finland-first public discovery. -- DONE
- B-203: Extend politician profile, promise detail, and methodology with party-context surfaces. -- DONE
- B-204: Add verification coverage for updated public discovery routing, build, and browser-verified trust states. -- DONE
- B-205: Introduce frontend-local party placeholder data or equivalent honest unknown-state structures until backend party APIs exist. -- DONE
- B-206: Add backend-ready follow-ups for canonical parties, memberships, and party stances once the hardened public slice is stable. -- DONE

## Epic E4: Trust and moderation hardening

- B-301: Audit proposal, moderation, and admin flows against the public discovery model. -- DONE
- B-302: Tighten abuse and audit evidence where current tests or docs are thin. -- DONE
- B-303: Refresh release-readiness docs once the next public slice lands. -- DONE

## Epic E5: Frontend trust, editorial, and Finland-first hardening

- B-401: Remove developer-facing implementation language from public copy and shared placeholder seed data. -- DONE
- B-402: Rebuild home IA around live promise content, denser politician cards, and clearer browse-by-party discovery. -- DONE
- B-403: Fix Finland-first correctness gaps in locale formatting, issue taxonomy, and public-state honesty. -- DONE
- B-404: Close visual-spec drift with amber party identity, claim styling, footer, breadcrumbs, and sentiment visualization. -- DONE
- B-405: Enrich methodology structure and unify missing-data messaging across public routes. -- DONE
- B-406: Add interaction polish: clickable directory rows, search suggestions, contextual back links, and tab transitions. -- DONE
- B-407: Verify the hardened public slice with browser and accessibility checks. -- DONE
- B-408: Replace heuristic evidence counts and frontend-only party/member placeholders with backend-backed data when APIs exist. -- DONE
- B-409: Add richer fulfillment and promise-breakdown visualizations once non-unknown status data exists. -- DONE

## Epic E6: Contribution, party graph, and canonical promise foundation

- B-501: Add frontend auth state, session persistence, and protected-route helpers against the current backend token flow. -- DONE
- B-502: Expose politician-proposal submission, statement submission, and statement voting from the frontend. -- DONE
- B-503: Add frontend moderation reachability for the existing politician proposal queue, claim/release actions, and review decisions. -- DONE
- B-504: Add canonical `parties`, `party_aliases`, and `party_memberships` schema plus public/admin APIs. -- DONE
- B-505: Replace frontend-only party placeholder reads with backend-backed party and membership data. -- DONE
- B-506: Introduce canonical promises beside legacy `statements` with compatible public/frontend reads. -- DONE

## Epic E7: Claim canonization, trust graph, and release hardening foundation

- B-601: Add claim/source submission entities and moderation queue flows for promise records. -- DONE
- B-602: Add equivalence proposals, user same-as voting, duplicate assist, and moderator merge or canonization decisions. -- DONE
- B-603: Expose accepted-source bundles, canonical change history, and public audit context for canonical promises. -- DONE
- B-604: Add party stance, vote-event, fulfillment, and party-alignment assessment models with a first Finland-first source path. -- DONE
- B-605: Compute politician and party trust dimensions from backend assessments and expose them in public pages. -- DONE
- B-606: Add broader regression coverage, release-readiness updates, search and auditability improvements, and a full UI audit/manual verification pass. -- DONE

## Epic E8: Launchability hardening and release orchestration

- B-701: Replace the shared-secret public sign-in flow with a launch-safe email-based session flow. -- DONE
- B-702: Add secure moderator/admin provisioning and remove public role or secret selection from sign-in UX. -- DONE
- B-703: Add protected editorial ops UI for party stances, vote events, vote records, fulfillment assessments, and party-line assessments. -- DONE
- B-704: Add launch dataset completeness checks and Finland-first launch coverage reporting for public party, politician, and promise surfaces. -- DONE
- B-705: Add durable automated frontend and browser regression coverage to the launch proof chain, including dependency-backed browser automation if the repo-native Windows harness remains unreliable. -- DONE
- B-706: Add deploy sequencing, smoke verification, observability, backup/restore rehearsal, and release runbook hardening. -- DONE
- B-707: Run launch dry run, final UI audit, and go or no-go review from a clean tree. -- DONE
- B-708: Decide whether launch browser automation should use a new repo dependency or a different Windows-safe process model after the repo-native harness attempt failed under Vitest. -- DONE

## Epic E9: Post-launch automation and growth

- B-804: Improve public SEO metadata and search-preview tags now that the launchable baseline is locked.
- B-801: Automate ingest from official Finland-first party and parliamentary sources once the manual launch path is stable.
- B-802: Add contributor reputation and moderation assist layers beyond the first launch-safe baseline.
- B-803: Add post-launch retention, notification, and operating metrics beyond the current database-only proxy model.

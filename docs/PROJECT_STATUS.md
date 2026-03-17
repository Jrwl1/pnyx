# Project status

Last updated: 2026-03-17

## Goal

Deliver Pnyx as a Finland-first public political accountability product with trustworthy politician, promise, and party-context surfaces.

## Active milestone

**M7: Launchability hardening and release orchestration** (see `docs/ROADMAP.md`).

## Current state

- M4 through M6 are complete in code and evidence: contribution flows, canonical parties, canonical promises, claim canonization, trust dimensions, search, activity feeds, and route-wide UI audit all landed and passed from a clean tree.
- The product is now beyond browse-only alpha and materially covers the first product vision, but launch blockers remain concentrated in security, editorial operations, regression depth, and release orchestration.
- The current public sign-in flow still depends on a shared token secret and explicit role selection, which is acceptable for development and auditability but not for public launch.
- Trust data can now be read publicly, but key editorial record types such as party stances, vote events, fulfillment assessments, and party-alignment assessments are still maintained primarily through backend APIs rather than full protected product surfaces.
- Browser and manual verification are strong, but launch confidence still needs durable automated coverage for critical public, contributor, moderator, and editorial flows.
- Release-readiness docs now exist, but the repo still needs an explicit launch sequencing queue from secure auth migration through final go or no-go rehearsal.

## Top blockers

1. Shared-secret public sign-in and manual role selection block a safe public launch.
2. Editorial maintenance for launch-critical trust records is not yet fully reachable from protected product UI.
3. Launch sequencing still needs stronger automated coverage, deploy and smoke orchestration, and a final release rehearsal from the completed feature baseline.

## Next actions

1. Execute `S-27` to replace the current public auth model with a launch-safe email session flow and secure role provisioning.
2. Execute `S-28` and `S-29` to expose protected editorial ops and add durable automated regression coverage across critical flows.
3. Execute `S-30` and `S-31` to harden release sequencing, observability, and final launch audit or go-no-go proof.

## Key links

- `AGENTS.md`
- `docs/CANONICAL.md`
- `docs/CANONICAL_REPORT.md`
- `docs/ROADMAP.md`
- `docs/SPRINT.md`
- `docs/BACKLOG.md`
- `docs/DECISIONS.md`

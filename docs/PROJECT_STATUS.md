# Project status

Last updated: 2026-03-17

## Goal

Deliver Pnyx as a Finland-first public political accountability product with trustworthy politician, promise, and party-context surfaces.

## Active milestone

**M7: Launchability hardening and release orchestration** (see `docs/ROADMAP.md`).

## Current state

- M4 through M6 are complete in code and evidence: contribution flows, canonical parties, canonical promises, claim canonization, trust dimensions, search, activity feeds, and route-wide UI audit all landed and passed from a clean tree.
- The product is now beyond browse-only alpha and materially covers the first product vision, but launch blockers remain concentrated in security, editorial operations, regression depth, and release orchestration.
- `S-27` is complete: launch-safe email-code sign-in now replaces the previous shared-secret public sign-in UX, redirect-preserving auth flows are verified in-browser, and admin-only role grants now keep moderator/admin provisioning outside the public sign-in form.
- `S-28` is complete: protected editorial ops now cover party stances, vote events, vote records, fulfillment assessments, party-line assessments, and launch coverage views from inside the product.
- Browser and manual verification are strong, but launch confidence still needs durable automated coverage for critical public, contributor, moderator, and editorial flows.
- Release-readiness docs now exist, but the repo still needs an explicit launch sequencing queue from secure auth migration through final go or no-go rehearsal.

## Top blockers

1. Launch sequencing still needs stronger automated coverage, deploy and smoke orchestration, and a final release rehearsal from the completed feature baseline.
2. The launch-safe auth and editorial ops paths now exist, but the remaining launchability queue still needs to be closed and re-verified end-to-end before release.
3. Browser and manual checks are ahead of automated frontend coverage, so launch confidence still depends too heavily on manual proof.

## Next actions

1. Execute `S-29` to add durable automated regression coverage across critical public, contributor, moderation, and editorial flows.
2. Execute `S-30` to harden release sequencing, observability, backup or restore rehearsal, and release orchestration.
3. Execute `S-31` to finish the final launch dry run, route-wide audit, and go-or-no-go proof.

## Key links

- `AGENTS.md`
- `docs/CANONICAL.md`
- `docs/CANONICAL_REPORT.md`
- `docs/ROADMAP.md`
- `docs/SPRINT.md`
- `docs/BACKLOG.md`
- `docs/DECISIONS.md`

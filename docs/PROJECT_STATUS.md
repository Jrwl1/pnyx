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
- `S-29` is complete: dependency-backed Playwright coverage now exercises public discovery, auth/contributor flows, and protected moderator/editorial routes, and the CI proof workflow plus security-audit note are aligned to that browser coverage.
- Release-readiness docs now exist, but the repo still needs an explicit launch sequencing queue from secure auth migration through final go or no-go rehearsal.

## Top blockers

1. Launch sequencing still needs deploy and smoke orchestration plus a final release rehearsal from the completed feature baseline.
2. Backup/restore rehearsal, observability, and go/no-go evidence still need to move from docs intent into proof-backed release execution.
3. The launch-safe auth, editorial ops, and browser automation paths now exist, but the remaining launchability queue still needs to be closed and re-verified end-to-end before release.

## Next actions

1. Execute `S-30` to harden release sequencing, observability, backup or restore rehearsal, and release orchestration.
2. Execute `S-31` to finish the final launch dry run, route-wide audit, and go-or-no-go proof.
3. Re-baseline post-launch work only after the launch-readiness queue is fully closed.

## Key links

- `AGENTS.md`
- `docs/CANONICAL.md`
- `docs/CANONICAL_REPORT.md`
- `docs/ROADMAP.md`
- `docs/SPRINT.md`
- `docs/BACKLOG.md`
- `docs/DECISIONS.md`

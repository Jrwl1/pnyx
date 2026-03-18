# Project status

Last updated: 2026-03-18

## Goal

Deliver Pnyx as a Finland-first public political accountability product with trustworthy politician, promise, and party-context surfaces.

## Active milestone

**M7: Launchability hardening and release orchestration** is complete in sprint evidence; the next planning move is a post-launch re-baseline in `docs/ROADMAP.md`.

## Current state

- M4 through M7 are complete in code and evidence: contribution flows, canonical parties, canonical promises, claim canonization, trust dimensions, search, activity feeds, launch-safe auth, protected editorial ops, durable browser coverage, release rehearsal, and the final launch audit all landed and passed from a clean tree.
- The launch baseline now includes seeded Finland-first rehearsal coverage, `pnpm proof:launch`, `pnpm smoke:release`, and a route-wide browser/accessibility sweep over public, contributor, moderator, editorial, and trust surfaces.
- `S-27` is complete: launch-safe email-code sign-in now replaces the previous shared-secret public sign-in UX, redirect-preserving auth flows are verified in-browser, and admin-only role grants now keep moderator/admin provisioning outside the public sign-in form.
- `S-28` is complete: protected editorial ops now cover party stances, vote events, vote records, fulfillment assessments, party-line assessments, and launch coverage views from inside the product.
- `S-29` is complete: dependency-backed Playwright coverage now exercises public discovery, auth/contributor flows, and protected moderator/editorial routes, and the CI proof workflow plus security-audit note are aligned to that browser coverage.
- `S-30` is complete: the repo now has `proof:launch`, `smoke:release`, a manual release-rehearsal workflow, updated release docs, and a local staging-like smoke rehearsal proved from a clean tree.
- `S-31` is complete: launch-candidate seed and coverage helpers now verify the Finland-first slice, `/claims/:id` now follows protected-route semantics, the final route audit passed on the seeded live pair, and the go-or-no-go evidence is anchored to repeatable commands rather than assumptions.

## Top blockers

1. No repo-tracked launch blockers remain after `S-31`.
2. Residual non-blocking follow-up: improve public SEO metadata and search-preview tags beyond the verified launch baseline.
3. The next blocker is planning, not implementation: re-baseline post-launch work without disturbing the accepted launch queue.

## Next actions

1. Open a new `PLAN` to re-baseline post-launch work now that the launchability sprint is fully closed.
2. Use the seeded rehearsal chain (`seed:launch-rehearsal`, `launch:coverage`, `proof:launch`, `smoke:release`) as the default launch-candidate proof path.
3. Treat the SEO metadata follow-up as post-launch unless release requirements change.

## Key links

- `AGENTS.md`
- `docs/CANONICAL.md`
- `docs/CANONICAL_REPORT.md`
- `docs/ROADMAP.md`
- `docs/SPRINT.md`
- `docs/BACKLOG.md`
- `docs/DECISIONS.md`

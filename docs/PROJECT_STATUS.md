# Project status

Last updated: 2026-03-17

## Goal

Deliver Pnyx as a Finland-first public political accountability product with trustworthy politician, promise, and party-context surfaces.

## Active milestone

**M3: Public trust, editorial refinement, and Finland-first hardening** (see `docs/ROADMAP.md`).

## Current state

- The M2 public discovery foundation is shipped in `frontend/` and the route set now matches the Finland-first public IA.
- A 2026-03-17 source audit of `frontend/src/` found that the current public slice still reads like implementation notes instead of a citizen-facing product.
- Highest-impact issues are developer-facing copy, a home page that hides live promise content below explanatory filler, and party routes that describe placeholders instead of presenting honest unknowns cleanly.
- Finland-first correctness is incomplete: public dates still format with `en-US`, issue tagging still contains US-centric keywords, and some directory controls imply filtering or sorting behavior the current data cannot support honestly.
- Visual and navigation drift remains on key public routes: no amber party identity, no footer, no breadcrumbs, generic claim styling, flat methodology structure, and weak contextual/back-link behavior.
- Promise detail also depends on shared politician context without waiting for the shared provider to finish, which can drop linked politician or party context on direct loads.

## Top blockers

1. Public-facing implementation jargon and redundant unknown-state explanations reduce trust on every major route.
2. The home page does not yet surface the strongest available content signal: real promise records.
3. Finland-first formatting, taxonomy, and several public interaction states still misrepresent product readiness.

## Next actions

1. Execute `S-15` through `S-19` to rewrite copy, foreground live promise content, fix Finland-first correctness, and close design/interaction drift.
2. Execute `S-20` to prove the hardened public slice with static, browser, and accessibility checks.
3. Keep backend-ready follow-ups for real party, membership, stance, and evidence data in backlog while shipping honest frontend states now.

## Key links

- `AGENTS.md`
- `docs/CANONICAL.md`
- `docs/CANONICAL_REPORT.md`
- `docs/ROADMAP.md`
- `docs/SPRINT.md`
- `docs/BACKLOG.md`
- `docs/DECISIONS.md`

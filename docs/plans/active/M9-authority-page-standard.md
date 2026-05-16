# M9 Authority Page Standard

Last checked: 2026-05-16

## Goal

Make politician, party, and promise pages measurable as `Ready`, `Thin But Honest`, or `Not Ready`, then prove the standard on representative vertical slices.

## Scope

1. Markdown harness map and truth docs.
2. Page readiness model in data/API/UI.
3. Readiness presentation on politician, party, and promise pages.
4. Missing-data and evidence-submission paths tied to readiness.
5. Bounded politician/promise discussion separated from canonical truth.
6. Moderation/reporting paths for evidence and discussion.
7. Browser and command proof for the full path.

## Non-scope

- Full national/EU population coverage.
- Global forum.
- Public opaque trust score.
- Auto-publishing promises, stances, interpretations, fulfillment, or comments as canonical truth.

## Implementation sequence

1. Keep harness docs current and run `pnpm docs:check`.
2. Add readiness data structures and tests. Done for `page_readiness`.
3. Add readiness API output for representative pages. Done for politician, party, and canonical promises.
4. Design page states with `impeccable`. Done for the first public readiness panel.
5. Edit frontend with `uncodixfy`. Done for politician, party, and canonical promise-backed promise pages.
6. Add evidence submission and missing-data affordances. Done via existing protected contribution routes.
7. Add discussion/reporting schema and moderation paths. Done for politician and canonical-promise discussions.
8. Add browser coverage and proof docs. In progress.

## Done

- `docs/product/page-readiness.md` maps directly to implemented behavior.
- Representative politician, party, and promise pages expose readiness, freshness, provenance, and missing-data state.
- User evidence and discussion cannot mutate canonical facts without review.
- Moderators can act on submissions, reports, and discussion.
- Proof commands pass for changed areas.

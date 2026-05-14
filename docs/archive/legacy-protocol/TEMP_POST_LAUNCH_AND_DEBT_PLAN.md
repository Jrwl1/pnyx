# Temporary Post-Launch And Debt Plan

Status: temporary, non-canonical planning note
Created: 2026-03-18

## Purpose

Capture the missing work discovered during the current repo review:

1. Canonical post-launch scope that is still planned but not implemented.
2. Missing product surfaces that already have partial backend support.
3. Implementation debt that should be removed before the product drifts further.

This file is intentionally outside the canonical `docs/` plan set.

## Gap Inventory

### G1. SEO and search-preview hardening

Current state:

- The frontend has a static document title in `frontend/index.html`.
- No route-level metadata system is present.
- No clear Open Graph, Twitter/X, canonical URL, sitemap, or robots setup is visible.
- Canonical docs already mark SEO as an open post-launch follow-up.

Target:

- Every public route has route-specific title, description, canonical URL, and social preview metadata.
- Search engines and link unfurlers get stable previews for home, politician, party, promise, and methodology routes.
- The release proof chain includes metadata verification.

### G2. Finland-first automated ingest

Current state:

- The editorial record model exists.
- Protected editorial forms exist for manual maintenance.
- No ingest pipeline is present for official party or parliamentary sources.

Target:

- Official Finland-first sources can be fetched, normalized, deduplicated, and staged into the existing accountability graph.
- Manual editorial entry becomes the exception for launch-critical record types.

### G3. Contributor reputation and moderation ergonomics beyond baseline

Current state:

- Users can submit politician proposals, statements, and promise claims.
- Moderators can claim, review, release, and inspect duplicate assist and audits.
- Abuse telemetry exists, but reputation and richer queue ergonomics do not.

Target:

- Contributors have durable reputation signals tied to accuracy and moderation outcomes.
- Moderation queues can prioritize higher-value work and surface abuse/risk more clearly.
- Abuse visibility extends across all relevant contribution types.

### G4. Retention, notification, and operating metrics

Current state:

- `docs/SUCCESS_METRICS_PLAN.md` uses SQLite-derived proxy metrics.
- No session analytics table is present.
- No notification system is present.
- No user preference surface is present for notifications or digests.

Target:

- Product events are logged in a way that supports retention and operating metrics without guessing.
- Users and moderators can receive targeted notifications.
- Metrics move from proxy-only SQL snapshots to an explicit event model.

### G5. Missing admin/editorial UI for already-supported backend capabilities

Current state:

- Backend endpoints exist for party creation, aliases, memberships, membership updates, and direct canonical promise creation.
- Current protected UI focuses on queues, trust records, and launch coverage.
- Full admin CRUD for those existing backend features is not exposed in-product.

Target:

- Admin and moderator users can manage party identities, aliases, memberships, and direct canonical promise creation from protected product surfaces.

### G6. Public promise discovery gap

Current state:

- Promise detail pages exist.
- Home, search, politician pages, and activity feed can lead to promise detail.
- There is no dedicated public `/promises` browse/index route.

Target:

- Public users can browse promises directly with filters such as politician, party, issue, and status.

### D1. Legacy shared-secret auth path still exists

Current state:

- Launch-safe email-code auth is the real shipped path.
- The legacy `/auth/token` shared-secret route and client wrapper still exist.

Target:

- The legacy shared-secret sign-in path is removed from backend, client API, tests, and docs unless retained behind an explicit internal-only contract with a hard justification.

## Recommended Delivery Order

1. Debt retirement and missing admin/public surfaces.
2. SEO hardening.
3. Metrics and notifications foundation.
4. Reputation and moderation ergonomics.
5. Automated ingest.
6. Final doc and proof-chain re-baseline.

Reasoning:

- Remove drift first, especially auth debt and backend/UI mismatches.
- Ship SEO and public browse improvements early because they improve public usefulness without waiting on ingest.
- Add event logging before notifications and reputation so later systems have trustworthy source data.
- Build ingest after the event and moderation model are mature enough to absorb automated imports safely.

## Workstreams

## W1. Retire Auth Debt And Complete Missing Product Surfaces

### Scope

- Remove legacy shared-secret auth.
- Expose existing backend admin/editorial capabilities in the protected UI.
- Add a public promises index route.

### Implementation slices

1. Remove `/auth/token` from `src/server.ts` and delete the unused client wrapper from `frontend/src/lib/api.ts`.
2. Audit tests and helper scripts for any dependency on the legacy token flow; migrate everything to email-code auth or explicit bootstrap helpers.
3. Add a protected admin route group for:
   - party creation
   - party alias management
   - party membership create/update
   - direct canonical promise creation
4. Expand the existing ops navigation so users can reach those tools without hidden links.
5. Add a public `/promises` route with:
   - list view
   - search/filter by politician, party, issue, and canonical/public state
   - links to promise detail
6. Extend Playwright coverage for all new protected and public routes.

### Acceptance

- No public or internal browser flow depends on `/auth/token`.
- Moderators/admins can manage party graph and canonical promise creation without direct DB edits.
- Public users can browse promises without entering via politician pages only.

## W2. Add Route-Level SEO And Search Preview Metadata

### Scope

- Titles, descriptions, canonical URLs, social tags, robots, and sitemap support for public routes.

### Implementation slices

1. Introduce a route metadata system in the frontend.
2. Define metadata builders for:
   - home
   - politician directory
   - politician profile
   - party directory
   - party profile
   - promise detail
   - methodology
3. Add canonical URL generation with environment-configured site origin.
4. Add Open Graph and Twitter/X tags.
5. Add sitemap and robots outputs, either generated at build time or served statically from a release artifact.
6. Decide whether SPA-only head updates are sufficient; if not, add prerendering for public routes that need reliable crawler previews.
7. Add proof checks that fail if required metadata is missing on critical public routes.

### Acceptance

- All critical public routes emit stable metadata.
- Search preview tags exist for major shareable entities.
- Release proof includes metadata verification.

## W3. Build Event Logging, Metrics, And Notifications Foundation

### Scope

- Replace proxy-only measurement with explicit event capture.
- Add notification primitives and user preferences.

### Implementation slices

1. Add an append-only product event table for core actions:
   - registration
   - sign-in
   - statement submission
   - promise claim submission
   - moderation decisions
   - editorial record creation
2. Add a small event-writing layer so metrics do not depend on ad hoc SQL over unrelated tables.
3. Add notification tables for:
   - notification records
   - delivery attempts
   - user preferences
4. Define first notification triggers:
   - proposal reviewed
   - claim reviewed
   - account role changed
   - optional moderator queue alerts
5. Add protected settings UI for user notification preferences.
6. Replace `SUCCESS_METRICS_PLAN` proxy queries with event-backed snapshots where appropriate.

### Acceptance

- Retention and operating metrics can be computed from explicit events.
- Notification delivery and preferences are stored in-product.
- Docs no longer need to explain retention as proxy-only for the supported metrics.

## W4. Add Contributor Reputation And Moderation Ergonomics

### Scope

- Reputation scoring, queue prioritization, and broader abuse visibility.

### Implementation slices

1. Add contributor reputation aggregates driven by moderation outcomes:
   - approved politician proposals
   - accepted statement edits
   - canonized or merged promise claims
   - rejected or abusive submissions
2. Add queue prioritization inputs:
   - contributor reputation
   - duplicate likelihood
   - stale age
   - abuse/rate-limit/captcha indicators
3. Expand abuse telemetry beyond the current baseline so moderators can inspect all relevant submission classes.
4. Add queue ergonomics:
   - saved filters
   - stronger detail panels
   - explicit assignment visibility
   - clearer status badges and backlog summaries
5. Add tests that prove reputation changes after review outcomes.

### Acceptance

- Contributors have measurable trust/reputation signals.
- Moderators can sort and filter by quality/risk signals instead of raw chronology only.
- Abuse signals are visible for all major contribution paths.

## W5. Add Finland-First Automated Ingest

### Scope

- Automated collection and normalization from official Finland-first sources.

### Implementation slices

1. Define supported source adapters and the first record types to ingest:
   - official party statements or stance pages
   - parliamentary vote events
   - parliamentary vote records
2. Add raw ingest tables that preserve fetched source payloads and provenance.
3. Add normalization pipelines that convert raw source data into:
   - party stances
   - vote events
   - vote records
   - candidate/politician linkage suggestions when needed
4. Add idempotency, deduplication, and audit trails so reruns are safe.
5. Add a staging/review workflow so moderators can approve or inspect automated imports before public exposure when necessary.
6. Add scheduled execution design for production, but keep local/manual replay available inside the repo.
7. Add proof fixtures and tests for parser stability.

### Acceptance

- The first Finland-first official sources can populate trust records with repeatable jobs.
- Automated ingest does not bypass provenance, dedupe, or moderation safeguards.

## W6. Re-Baseline Docs, Proof Chain, And Release Checks

### Scope

- Align canonical planning docs and release proof with the new post-launch state.

### Implementation slices

1. Update canonical planning docs after implementation, not before.
2. Extend `pnpm proof:launch` or introduce a post-launch proof command for:
   - metadata checks
   - public promise index coverage
   - admin CRUD route coverage
   - notification/event logging checks
   - ingest smoke verification
3. Add seeded test data for new public and admin surfaces.
4. Refresh release runbooks and metrics docs.

### Acceptance

- Docs reflect the real shipped post-launch baseline.
- Automated proof covers the new surfaces and data paths.

## Suggested Repository Impact

### Backend

- `src/server.ts`
- `src/auth/**`
- `src/db/**`
- new ingest modules under `src/` or `src/ingest/**`

### Frontend

- `frontend/src/App.tsx`
- `frontend/src/routes/**`
- `frontend/src/components/**`
- `frontend/src/context/**`
- `frontend/src/lib/api.ts`

### Tests And Proof

- `test/**`
- `test/playwright/**`
- `package.json`
- possibly workflow files if new proof jobs are added

### Canonical Docs Later

- `docs/ROADMAP.md`
- `docs/PROJECT_STATUS.md`
- `docs/SPRINT.md`
- `docs/BACKLOG.md`
- `docs/SUCCESS_METRICS_PLAN.md`
- `docs/RELEASE_READINESS_RUNBOOK.md`

## Risks To Manage

- SEO may require prerendering or SSR-like handling if SPA-only metadata is not good enough for crawlers.
- Ingest can corrupt trust records if provenance and idempotency are weak.
- Reputation can create perverse incentives if it is exposed publicly before the scoring model is stable.
- Notifications can create noise unless preferences and batching rules are in place.
- Removing `/auth/token` must be coordinated with every test helper and local bootstrap path first.

## Immediate Next Step

Start with W1 as the first implementation sprint:

1. remove legacy `/auth/token`
2. add admin CRUD surfaces for existing backend capabilities
3. add public `/promises`
4. extend browser coverage

That closes the clearest implementation debt before the larger post-launch systems land.

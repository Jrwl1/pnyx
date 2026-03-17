# V1 traceability matrix

WHAT IT DO? Maps locked V1 capabilities and governance controls to implemented endpoints and regression suites so release-readiness checks can verify end-to-end coverage.

## CAP coverage (`CAP-001..CAP-008`)

| Capability | Implemented endpoints | Primary regression suites |
| --- | --- | --- |
| CAP-001: list/view politicians and statements | `GET /politicians`, `GET /statements`, `GET /statements/:id` | `test/read-surfaces.test.ts`, `test/health.e2e.test.ts` |
| CAP-002: moderated politician intake + canonical create | `POST /politician-proposals`, `GET /politician-proposals`, `PATCH /politician-proposals/:id/review`, `POST /politicians` | `test/politician-proposal-submit.test.ts`, `test/politician-proposal-review.test.ts`, `test/proposal-approval-create-link.test.ts`, `test/politician-dedupe.test.ts` |
| CAP-003: add statement | `POST /statements` | `test/statement-capture.test.ts` |
| CAP-004: edit statement | `PATCH /statements/:id` | `test/edit-window-audit.test.ts` |
| CAP-005: set verification status | `PATCH /statements/:id/verification` | `test/verification-transitions.test.ts` |
| CAP-006: vote overwrite + aggregate | `POST /statements/:id/votes` | `test/vote-overwrite-aggregate.test.ts` |
| CAP-007: withdraw / pending-delete / approve-delete | `POST /statements/:id/withdraw`, `POST /statements/:id/pending-delete`, `POST /statements/:id/approve-delete` | `test/delete-lifecycle-visibility.test.ts` |
| CAP-008: revision history read | `GET /statements/:id/revisions` | `test/revision-history.test.ts` |

## Governance and moderation-ops controls (S1/S2 hardening)

| Control area | Implemented endpoints / behavior | Primary regression suites |
| --- | --- | --- |
| Canonical create role gate | `POST /politicians` requires `admin` (`anonymous|user|moderator` denied) | `test/role-matrix.test.ts`, `test/politician-dedupe.test.ts`, `test/local-admin-bootstrap.test.ts` |
| Registration role hardening | `POST /auth/register` rejects public `moderator|admin` assignment | `test/register-role-hardening.test.ts` |
| Register CAPTCHA enforcement | `POST /auth/register` validates captcha token when enforcement is active | `test/register-captcha.test.ts` |
| Proposal-submit CAPTCHA enforcement | `POST /politician-proposals` validates captcha for eligible caller role when enforcement is active | `test/proposal-captcha.test.ts` |
| Proposal queue moderation ops | `POST /politician-proposals/:id/claim`, `POST /politician-proposals/:id/release`, queue filters/pagination in `GET /politician-proposals` | `test/proposal-queue-ops.test.ts`, `test/politician-proposal-queue.test.ts` |
| Moderation SLA metrics | `GET /politician-proposals/metrics` pending/assignment/age buckets | `test/proposal-sla-metrics.test.ts` |
| Reason taxonomy enforcement | `PATCH /politician-proposals/:id/review` requires reasonCode for reject/duplicate | `test/proposal-reason-policy.test.ts` |
| Duplicate assist | `GET /politician-proposals/:id/duplicate-assist` exact-match hints plus bounded fuzzy suggestions (assistive-only) | `test/proposal-duplicate-assist.test.ts`, `test/proposal-duplicate-assist-fuzzy.test.ts` |
| Concurrency and optimistic lock safety | `review_version` checks on claim/release/review with deterministic `409` conflicts | `test/proposal-review-race.test.ts`, `test/proposal-queue-ops.test.ts` |
| Moderation audit filtering | `GET /politician-proposals/:id/audits` with actor/action/status/date + pagination | `test/proposal-audit-filters.test.ts`, `test/politician-proposal-audit.test.ts` |
| Moderation-path rate limiting | `proposal-claim`, `proposal-review`, `proposal-assist` limiter buckets | `test/proposal-rate-limit.test.ts`, `test/rate-limit-429.test.ts` |
| Abuse telemetry visibility | `GET /abuse/metrics` returns captcha and rate-limit counters to moderators/admins only | `test/abuse-telemetry.test.ts`, `test/role-matrix.test.ts` |

## Contribution, canonization, and trust graph coverage (S21..S26)

| Capability | Implemented endpoints / surfaces | Primary regression suites |
| --- | --- | --- |
| CAP-009: frontend auth, statement capture, voting, and contributor reachability | `POST /auth/register`, `POST /auth/token`, `POST /statements`, `POST /statements/:id/votes`, frontend routes `/register`, `/sign-in`, `/contribute/**` | `test/register-role-hardening.test.ts`, `test/register-captcha.test.ts`, `test/statement-capture.test.ts`, `test/statement-detail-viewer-vote.test.ts` |
| CAP-010: canonical party graph and public party reads | `POST /parties`, `POST /parties/:id/aliases`, `POST|PATCH /party-memberships`, `GET /parties`, `GET /parties/:id`, `GET /parties/:id/members` | `test/party-graph.test.ts`, `test/migration.test.ts` |
| CAP-011: canonical promises, accepted sources, and claim canonization | `POST /canonical-promises`, `GET /canonical-promises`, `GET /canonical-promises/:id`, `POST /promise-claims`, `GET /promise-claims`, `PATCH /promise-claims/:id/review`, `GET /promise-claims/:id/audits` | `test/canonical-promises.test.ts`, `test/promise-claims.test.ts`, `test/trust-records.test.ts` |
| CAP-012: party stance, vote-event, fulfillment, and party-line trust records | `POST /party-stances`, `GET /parties/:id/stances`, `POST /vote-events`, `POST /vote-events/:id/records`, `POST /canonical-promises/:id/vote-links`, `POST /canonical-promises/:id/fulfillment-assessments`, `POST /canonical-promises/:id/party-alignments` | `test/trust-records.test.ts`, `test/migration.test.ts` |
| CAP-013: backend-derived trust summaries and public trust surfaces | `GET /politicians`, `GET /politicians/:id/trust-summary`, `GET /parties`, `GET /parties/:id`, `GET /canonical-promises/:id` (`trustContext`) plus frontend routes `/politicians/:id`, `/parties`, `/parties/:id`, `/promises/:id`, `/methodology` | `test/trust-records.test.ts`, `pnpm frontend:typecheck`, `pnpm frontend:build` |
| CAP-014: backend-backed search, public activity feed, and claim-queue metrics | `GET /search`, `GET /activity`, `GET /promise-claims/metrics`, frontend search suggestions on `/` and `/politicians`, moderator queue metrics on `/ops/claims` | `test/search.test.ts`, `test/activity-feed.test.ts` |

## Release-readiness checks that consume this matrix

- Use this file with `ai/planning/API_CONTRACT.md` to validate endpoint/test drift before closeout.
- Confirm role/access coverage with `test/role-matrix.test.ts` and path-specific suites before marking sprint proof complete.
- If an endpoint changes or a suite is renamed, update this matrix in the same commit.

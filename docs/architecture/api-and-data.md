# API and data truth

Last checked: 2026-05-16

This file summarizes current code reality from `src/server.ts`, `migrations/`, and `frontend/src/App.tsx`.

## Public API areas

- Auth: `/auth/register`, `/auth/request-code`, `/auth/verify-code`, `/auth/logout`, `/me`.
- Public discovery: `/politicians`, `/politicians/:id/trust-summary`, `/parties`, `/parties/:id`, `/parties/:id/members`, `/parties/:id/stances`, `/canonical-promises`, `/canonical-promises/:id`, `/statements`, `/statements/:id`, `/search`, `/activity`.
- Page readiness: public readiness objects on politician, party, and canonical-promise reads.
- Bounded discussion: `/discussions`, `/discussions/:id/comments`, `/discussion-comments/:id/reports`.
- Trust records: `/vote-events`, `/vote-events/:id`, canonical-promise vote links, fulfillment assessments, and party alignments.
- Contributions: `/politician-proposals`, `/promise-claims`, `/statements`, statement votes.
- Moderation: proposal claim/release/review/audits/duplicate assist, promise-claim claim/release/review/audits/equivalence signals, discussion reports, discussion comment moderation, and discussion thread moderation.
- Operations: `/ops/launch-coverage`, `/ops/import-*`, `/ops/stage-items/:id/apply`, `/ops/stage-items/:id/reject`, `/abuse/metrics`.
- Notifications: `/me/notification-preferences`, `/me/notifications`, `/me/notifications/:id/read`.

## Current schema areas

Migrations define:

- users, politicians, statements, votes, revision audits;
- politician proposals and proposal audits;
- parties, aliases, and party memberships;
- canonical promises and sources;
- promise claims, audits, and equivalence signals;
- party stances, vote events, politician vote records, promise vote links, fulfillment assessments, party-alignment assessments;
- email auth login codes;
- product events;
- notification preferences, notifications, notification deliveries;
- contributor reputation;
- ingest runs, raw records, and stage items;
- page readiness records;
- discussion threads, comments, reports, and moderation actions.

## Current frontend route areas

- Public: `/`, `/politicians`, `/politicians/:id`, `/parties`, `/parties/:id`, `/promises`, `/promises/:id`, `/methodology`.
- Auth: `/register`, `/sign-in`.
- Authenticated: `/claims/:id`, `/notifications`, `/contribute/politicians/new`, `/contribute/promises/new`, `/contribute/statements/new`.
- Moderator/admin: `/ops`, `/ops/admin`, `/ops/imports`, `/ops/records`, `/ops/claims`.

## Next data gaps

- Readiness review write tools exist through `/ops/page-readiness` and the editorial records ops page.
- Discussion exists for politician and canonical-promise pages; party discussion remains deferred.
- Current plus previous-term national/EU data coverage is not yet complete.
- Readiness thresholds and freshness evidence need to become queryable.

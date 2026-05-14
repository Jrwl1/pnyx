# Product truth

Last checked: 2026-05-14

## Product purpose

Pnyx is a Finland-first political accountability product. Its public value is source-backed clarity around politicians, parties, promises, public positions, votes, fulfillment evidence, party alignment, and user-contributed evidence.

The product must distinguish:

- canonical facts;
- raw user submissions;
- accepted source bundles;
- automated ingest provenance;
- editorial and moderation decisions;
- user comments or discussion.

Comments and discussion must never become canonical truth merely by being visible.

## Shipped public surfaces

Frontend routes verified from `frontend/src/App.tsx`:

- `/`
- `/politicians`
- `/politicians/:id`
- `/parties`
- `/parties/:id`
- `/promises`
- `/promises/:id`
- `/methodology`
- `/register`
- `/sign-in`

Protected authenticated routes:

- `/claims/:id`
- `/notifications`
- `/contribute/politicians/new`
- `/contribute/promises/new`
- `/contribute/statements/new`

Protected moderator/admin routes:

- `/ops`
- `/ops/admin`
- `/ops/imports`
- `/ops/records`
- `/ops/claims`

## Shipped backend capabilities

Verified from `src/server.ts`, `src/db/**`, `src/ingest/**`, migrations, and tests:

- email-code auth and registered identities;
- admin role grants outside public role selection;
- politician reads, proposals, review, duplicate assist, audits, and queue metrics;
- statement reads, submission, voting, revisions, verification, and delete lifecycle;
- canonical parties, aliases, memberships, party stances, and public party reads;
- canonical promises, accepted sources, promise claims, equivalence signals, canonization/review, and claim audits;
- vote events, politician vote records, promise vote links, fulfillment assessments, and party-alignment assessments;
- backend-derived trust context for public pages;
- search and activity feed;
- product event logging;
- notification preferences, notifications, and delivery tracking;
- contributor reputation and moderation risk signals;
- official-source ingest runs, raw records, staging, apply/reject, and operator UI.

## Current product boundary

The shipped product is launch/post-launch capable as a software baseline, but it is not yet a complete real-data authority for all current plus previous-term Finnish national/EU politicians.

The next product truth target is:

- current Finnish national/EU officeholder coverage;
- previous-term coverage where politically relevant;
- major party identity, membership, ethos/platform, and stance context;
- most important pages reaching a defined readiness bar;
- hybrid user participation with source submission plus bounded discussion.

## Explicit non-goals for the next phase

- cross-country expansion;
- deep historical archive beyond current plus previous-term usefulness;
- opaque public trust scores;
- auto-publishing promises, interpretations, fulfillment, stances, or comments as canonical truth;
- a global forum detached from politicians, promises, parties, or evidence.

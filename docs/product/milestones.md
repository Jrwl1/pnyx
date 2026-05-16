# Milestone truth

Last checked: 2026-05-16

## Completed milestones

M0 through M8 are complete in code and accepted historical evidence. The historical sprint and worklog files are archived under `docs/archive/legacy-protocol/`.

Completed scope includes:

- repository OS reset and legacy AI OS archive;
- public discovery foundation;
- party context and backend-backed party graph;
- contribution flows;
- canonical promises;
- claim canonization;
- trust records and public trust context;
- launch-safe email-code auth;
- protected editorial and admin surfaces;
- durable Playwright coverage;
- release rehearsal and smoke proof;
- route-level SEO metadata, sitemap, and robots generation;
- product events and notification primitives;
- contributor reputation and moderation priority signals;
- official-source ingest with provenance, staging, and operator review;
- post-launch proof chain.

## Current milestone: M9 Authority Page Standard

Goal: make politician, party, and promise pages measurable as public-ready, thin-but-honest, or not-ready.

Done means:

- page readiness states exist in data/API/UI;
- politician, party, and canonical promise-backed promise pages show completeness, freshness, provenance, and missing-data calls to action;
- representative ingest and user-submission flows can move records toward readiness;
- bounded politician/promise discussion exists separately from canonical truth;
- moderation can review evidence, comments, and reports without polluting canonical data;
- proof covers ingest or submission through reviewed public page;
- the harness docs remain indexed and current.

M9 should prove the standard on representative vertical slices. It should not attempt full national/EU population coverage.

Current M9 implementation status:

- readiness data/API/UI exists for representative politician, party, and canonical-promise surfaces;
- conservative `not_ready` defaults prevent fabricated completeness when no reviewed readiness record exists;
- politician and canonical-promise discussion/reporting paths are implemented separately from canonical facts;
- party discussion and a dedicated readiness-editing moderator UI remain outside the current slice.

## Next milestone: M10 National/EU Coverage And Public Beta

Goal: scale the M9 readiness standard across current plus previous-term Finnish national/EU scope and prepare for a launch-spike public beta.

Default coverage threshold:

- every current in-scope Finnish national/EU politician has a public page;
- every major party has a public page;
- at least 80% of current in-scope politician pages are `Ready`;
- all major party pages are `Ready`;
- remaining public pages are at least `Thin But Honest` unless identity/source conflicts make them `Not Ready`;
- previous-term coverage is materially useful and traceable, not a perfect archive.

Operational done means:

- identity and membership facts can auto-publish after validation;
- promises, stances, interpretations, fulfillment, and discussion require review before becoming canonical;
- queues, rate limits, reports, notifications, abuse telemetry, and degraded states are ready for thousands to low tens of thousands of users.

## Future milestone: M11 Security, Refactor, And Growth Prep

Goal: after M10, harden for sustained growth.

Done means:

- security review covers auth, roles, moderation, rate limits, abuse paths, ingest, stored user content, comments, and admin surfaces;
- codebase health pass reduces oversized or tangled areas without product behavior changes;
- performance and reliability proof covers high-traffic pages, search, discussion, queues, and ingest;
- runbooks, backup/restore, monitoring, incident response, metrics, and documentation checks are refreshed;
- growth metrics can track activation, contribution quality, moderation throughput, retention, notification health, freshness, and readiness.

## How to update milestone truth

- Update this file when the goal or done definition changes.
- Update `docs/plans/active/` when implementation sequencing changes.
- Move completed plan summaries to `docs/plans/completed/`.
- Do not use archived sprint files as active milestone truth.

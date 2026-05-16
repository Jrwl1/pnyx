# PNYX Product Context

Last checked: 2026-05-16

## Register

product

## Product Purpose

PNYX is a Finland-first public political accountability service. It helps visitors understand politicians, parties, promises, public positions, votes, fulfillment evidence, party alignment, and source-backed user contributions.

The core product promise is clarity without pretending that incomplete public data is complete. Pages must clearly distinguish what is canonical, what is submitted, what has been accepted as source-backed evidence, what was imported automatically, what was reviewed by editors or moderators, and what is only public discussion.

## Users

- Public readers who want a trustworthy, source-backed overview of Finnish politicians, parties, promises, voting behavior, and fulfillment evidence.
- Contributors who submit missing politicians, promises, statements, sources, corrections, and context.
- Moderators and admins who review proposals, promise claims, source evidence, readiness state, discussion reports, official imports, and editorial records.

## Current Product Boundary

The product is a launch/post-launch capable software baseline, not yet a complete real-data authority for all Finnish national and EU politicians. Current development is focused on M9 and M10:

- page readiness for politician, party, and promise pages;
- current and previous-term Finland national/EU coverage;
- major party identity, membership, ethos/platform, and stance context;
- hybrid participation through source submissions and bounded page discussion.

## Trust Rules

- Canonical facts, raw user submissions, accepted source bundles, automated ingest provenance, editorial decisions, moderation decisions, and comments must remain separate.
- Comments and discussion never become canonical truth merely by being visible.
- Missing or stale data should be visible and actionable.
- No opaque public trust score.
- No auto-publishing promises, interpretations, fulfillment, stances, or comments as canonical truth.
- No global forum detached from politicians, promises, parties, or evidence.

## Public Surfaces

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

## Protected Surfaces

- `/claims/:id`
- `/notifications`
- `/contribute/politicians/new`
- `/contribute/promises/new`
- `/contribute/statements/new`
- `/ops`
- `/ops/admin`
- `/ops/imports`
- `/ops/records`
- `/ops/claims`

## Product Voice

Clear, civic, source-aware, and direct. The interface should read like a public record product with editorial restraint, not a marketing SaaS dashboard. Labels should name concrete data states, review states, source gaps, and next actions.

Avoid ornamental copy, fake confidence, hype, decorative labels, and generic dashboard language.

## Design Priorities

- source clarity;
- honest unknown states;
- readable provenance;
- efficient moderation;
- public trust;
- accessibility;
- responsiveness under realistic civic data density.

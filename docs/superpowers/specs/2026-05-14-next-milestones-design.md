# Pnyx next milestones design

Date: 2026-05-14
Repo: `C:\Users\john\aios\Pnyx`

## Purpose

Define the next product milestones after the accepted M8 post-launch baseline. The next phase should make Pnyx a real Finland-first data authority for national and EU-level accountability, then prepare the product for a public beta influx, then harden security, code health, operations, and growth foundations.

The operating definition of done moves from "feature exists" to "public pages are credible, current, source-backed, reviewable, and safe to expose to real users."

## Product Truth

Pnyx should be a Finland-first political accountability product where a normal visitor can understand:

- who a politician is and what offices they hold or recently held;
- which party context and memberships apply to them;
- what public promises, stances, and claims are source-backed;
- how those promises relate to party platforms, vote records, fulfillment assessments, and public context;
- what is known, what is unknown, and when a page needs sourced help;
- how users can contribute evidence or discuss context without changing canonical truth directly.

The next milestones should cover current plus previous-term Finnish national and EU-level scope. Current coverage should aim for high completeness. Previous-term coverage should be materially useful and traceable, without pretending to be a perfect historical archive.

The next canonical `PLAN` pass should convert this design into exact sprint thresholds. The default threshold proposal is: every current in-scope national/EU politician and major party has a public page, at least 80% of current in-scope politician pages reach `Ready`, 100% of major party pages reach `Ready`, and previous-term pages are at least `Thin But Honest` unless an identity or source conflict makes them `Not Ready`.

## Page Readiness Model

Readiness is assessed at the page level for politicians, parties, and promises.

### Ready

A page is ready when it is credible for public traffic. It satisfies the page-type readiness checklist for identity, context, sources, promise or stance coverage, freshness metadata, and contribution paths, so a normal visitor can trust the page's shape even when some facts remain unknown.

### Thin But Honest

A page is public but incomplete. It clearly labels missing coverage, stale data, or sparse evidence and gives users a source-backed path to help. This state avoids hiding real entities while preventing fake completeness.

### Not Ready

A page should stay out of broad public discovery when it has identity conflicts, duplicate ambiguity, unresolved source contradictions, or missing canonical records that would make the page misleading.

## Ready Criteria By Page Type

### Politician Pages

Ready politician pages include:

- current role and recent national or EU role history;
- party memberships, including current and previous-term context where applicable;
- source-backed promises or public positions that satisfy the readiness threshold selected in the canonical `PLAN`;
- linked party context and party-platform promises where individual promise coverage is sparse;
- linked vote, stance, or fulfillment evidence when available;
- provenance and freshness metadata;
- paths to submit missing promises, sources, corrections, and context;
- bounded discussion separated from canonical facts.

### Party Pages

Ready party pages include:

- canonical party identity, aliases, and relevant party metadata;
- membership coverage for current plus previous-term national or EU politicians;
- platform, ethos, and stance records with source trails;
- major promise themes and links to affected politicians or canonical promises;
- freshness metadata and missing-data calls to action;
- contribution and issue-reporting paths.

Party discussion can be deferred until moderation capacity is proven. Party pages should initially prioritize evidence submission and problem reporting.

### Promise Pages

Ready promise pages include:

- canonical promise text;
- accepted source bundle;
- politician and party linkage;
- fulfillment, vote, party-alignment, or unknown state where applicable;
- provenance and moderation history;
- correction/source submission path;
- bounded discussion for evidence debate and contextual questions.

Promise pages are the primary place for detailed discussion because the claim is specific.

## Milestone M9: Authority Page Standard

Goal: define, implement, and prove the readiness standard on representative politician, party, and promise pages.

Done means:

- the repo has a first-pass markdown harness map for the new phase, so agents can find product truth, architecture, quality bars, plans, and evidence without reading stale or monolithic docs;
- readiness states exist in data/API/UI for `Ready`, `Thin But Honest`, and `Not Ready`;
- politician, party, and promise pages show completeness, freshness, provenance, and missing-data calls to action;
- ingest/review flows can move identity, membership, promise, party stance, and source records toward readiness;
- hybrid participation exists in minimum useful form: source, promise, and correction submission plus bounded discussion attached to politician and promise pages;
- comments and discussion are separate from canonical facts in schema, API, UI, and moderation paths;
- moderation can review user participation without allowing comments to overwrite canonical truth;
- proof covers the full path from ingest or user submission to reviewed public page.

M9 should stay focused on the page standard and representative vertical slices. It should not attempt full national/EU coverage yet.

## Milestone M10: National/EU Coverage And Public Beta

Goal: scale the M9 readiness standard across current plus previous-term Finnish national and EU coverage, then prepare for a launch-spike public beta.

Done means:

- current Finnish MPs, Finnish MEPs, ministers, relevant recent former officeholders, and major parties are represented;
- previous parliamentary and EU term coverage is materially useful where it affects current accountability;
- every current in-scope politician and major party has a public page;
- at least 80% of current in-scope politician pages are `Ready`;
- all major party pages are `Ready`;
- remaining public pages are at least `Thin But Honest`;
- selected official identity and membership facts can auto-publish after validation;
- promises, stances, interpretations, and discussions go through staging or review before becoming canonical;
- user influx workflows are ready: queues, rate limits, abuse reporting, moderation dashboards, notification paths, and graceful degradation;
- seeded and imported-data proof covers realistic volume, not tiny fixtures only.

M10 is complete when Pnyx can be shown to a real public beta audience without the core data surface feeling hollow or operationally fragile.

## Milestone M11: Security, Refactor, And Growth Prep

Goal: after the product is substantively useful and beta-ready, harden the repo and service for sustained growth.

Done means:

- security review covers auth, roles, moderation, rate limits, abuse paths, ingest, stored user content, comments, and admin surfaces;
- the markdown harness is mechanically checked for freshness, cross-links, ownership, and drift against code reality;
- codebase health work reduces risk in oversized or tangled modules without changing product behavior;
- performance and reliability checks cover high-traffic pages, search, discussion, queues, and ingest jobs;
- operational runbooks, backups, restore rehearsal, monitoring, incident paths, and release proof are refreshed;
- metrics support growth decisions: activation, contribution quality, moderation throughput, retention, notification health, data freshness, and page readiness.

M11 should be the final sweep before broader growth and retention loops. Security and maintainability still matter during M9 and M10, but M11 is where the full pass is explicitly completed.

## Participation Model

Use hybrid participation with evidence as the main product path.

### Lane 1: Submit Evidence

Users submit missing promises, sources, corrections, party-context updates, freshness issues, and source conflicts. These submissions enter canonical moderation or review flows and can improve page readiness.

### Lane 2: Discuss A Specific Page

Bounded discussion starts on politician and promise pages. Promise discussion supports detailed evidence debate. Politician discussion supports broader context and can aggregate recent promise-related threads.

### Lane 3: Report Problems

Users can report misinformation, duplicate claims, stale data, source problems, harassment, spam, legal/privacy concerns, and moderation concerns.

## Comment And Discussion Guardrails

Done criteria for discussion:

- every thread is attached to a concrete entity: politician or promise first, party later if needed;
- public UI never implies comments are verified truth;
- canonical facts and comments use separate storage, APIs, permissions, audit trails, and moderation states;
- moderators can hide, lock, remove, restore, or escalate threads;
- reports enter a triage queue with entity, reporter, reason, affected content, and moderation history context;
- rate limits and abuse telemetry exist before launch-spike exposure;
- notifications exist for replies, reviewed evidence submissions, and moderator actions, with user preferences.

Do not begin with a global discussion page. It is too easy for broad discussion to detach from source-backed accountability.

## Automation Trust Model

Use mixed automation:

- official identity and membership facts can auto-publish after validation;
- promises, stances, interpretations, fulfillment, and discussions require staging or review before becoming canonical;
- all imports keep raw provenance, normalized records, idempotency keys, and audit trails;
- stale-data detection should create review work rather than silently degrading public trust.

## Frontend Design Workflow

Use the `impeccable` skill for page design, redesign, critique, audit, polish, or UI-shaping work during M9 and M10. It should guide the design of politician, party, promise, discussion, contribution, moderation, and operator surfaces before implementation changes land.

Use `uncodixfy` (the user's "uncodexify" shorthand) whenever editing frontend UI code such as HTML, CSS, React, route components, layouts, or shared UI components. Its job is to prevent generic AI dashboard patterns and keep the UI restrained, human-designed, and consistent with the existing product surface.

Frontend done means the page is not only functionally correct, but browser-verified, readable under real data density, accessible, responsive, and free of generic AI UI tells such as decorative gradients, floating dashboard shells, ornamental copy, over-rounded cards, fake metrics, or unexplained hero sections inside product workflows.

## Markdown Harness System

The next phase should adapt the repository markdown system toward OpenAI's harness engineering principles from "Harness engineering: leveraging Codex in an agent-first world" (`https://openai.com/index/harness-engineering/`).

Key principles to encode:

- `AGENTS.md` should act as a short map and router, not an encyclopedia. Deeper product, architecture, plan, quality, frontend, security, reliability, and evidence material should live in structured docs.
- Repository-local markdown is the system of record for agent-legible context. Important product decisions, architecture constraints, quality bars, and operating beliefs should not live only in chats or temporary files.
- Use progressive disclosure: start agents from a stable entry point, then point to specific docs by domain and task type.
- Treat plans as first-class artifacts with active, completed, and debt-tracking states.
- Add mechanical checks over docs where possible: freshness dates, cross-links, stale references, required sections, and code/docs drift.
- Capture human taste and review outcomes as repo rules or docs, then promote repeated rules into linting, scripts, or structural tests.
- Prefer small indexed docs over one giant instruction file, with clear ownership and verification status.

Suggested target structure for the canonical `PLAN` pass:

- `AGENTS.md`: concise mode router and documentation map, preserving required protocol behavior.
- `docs/index.md`: entry point for product truth and doc navigation.
- `docs/product/`: product truth, page-readiness model, participation model, data coverage policy.
- `docs/architecture/`: backend/frontend/domain boundaries, data model, ingest, moderation, notifications.
- `docs/plans/active/` and `docs/plans/completed/`: first-class execution plans and completed plan records.
- `docs/quality/`: quality scorecards, proof commands, known debt, doc freshness checks.
- `docs/frontend/`: design system, page standards, `impeccable` and `uncodixfy` workflow notes.
- `docs/security/`: security reviews, threat notes, sensitive paths, audit templates.
- `docs/generated/`: generated schema/API references that can be refreshed mechanically.

This should be incremental. The existing repo protocol and canonical docs should not be ripped out in one pass. The next `PLAN` should first create the map, move or link only the highest-value documents, and add drift checks before larger cleanup.

## Proof And Evidence Expectations

Each milestone should include command-level proof and page-level evidence.

Expected proof themes:

- markdown harness checks for indexed docs, freshness, required cross-links, and stale temporary planning notes;
- data/API tests for readiness states and moderation transitions;
- ingest fixtures for identity, membership, promise, stance, and source records;
- browser coverage for politician, party, promise, contribution, discussion, and moderation flows;
- realistic seeded or imported datasets for M10;
- security and abuse-path checks for M11;
- docs updates tying roadmap, sprint evidence, traceability, metrics, and release runbooks together.

## Out Of Scope For These Milestones

- cross-country rollout;
- deep historical archive beyond current plus previous-term usefulness;
- public opaque trust scores;
- auto-publishing promises, stances, interpretations, or user discussion as canonical truth;
- a global forum detached from politician, party, or promise evidence;
- growth experiments before beta readiness and security/refactor sweep are complete.

## Open Planning Consequence

The next formal repo action should be a `PLAN` pass that converts this design into canonical updates for `docs/ROADMAP.md`, `docs/BACKLOG.md`, `docs/SPRINT.md`, `docs/PROJECT_STATUS.md`, and `docs/CANONICAL_REPORT.md`. That pass should also resolve the current M8 doc drift where project status and sprint evidence say M8 is complete while roadmap/backlog still show stale in-progress or unmarked items.

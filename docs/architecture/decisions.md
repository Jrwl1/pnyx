# Architectural decisions

Last checked: 2026-05-14

This file replaces the old root `docs/DECISIONS.md` as the live decision index. The old file is archived at `docs/archive/legacy-protocol/DECISIONS.md`.

## ADR-001: Repository knowledge uses a harness-style map

Decision: `AGENTS.md` is a short map, and `docs/` is the structured system of record.

Context: OpenAI's harness-engineering article argues that a giant `AGENTS.md` becomes stale, hard to verify, and context-heavy. This repo had grown a large mode-router contract that hid current truth behind protocol machinery.

Consequences:

- The old mode-command system is retired.
- Historical protocol docs move under `docs/archive/legacy-protocol/`.
- Live truth is split into repo, product, architecture, frontend, quality, plans, and reference docs.
- Mechanical doc checks should guard the harness.

## ADR-002: Page readiness is the next acceptance unit

Decision: M9 and M10 evaluate readiness at the politician, party, and promise page level.

Context: Pnyx needs real national/EU data authority, not only feature completion.

Consequences:

- `Ready`, `Thin But Honest`, and `Not Ready` become product states.
- Data coverage, provenance, freshness, and contribution paths must be visible to users.
- A scraper or ingest job is not complete until public pages become truthful and reviewable.

## ADR-003: Hybrid participation, evidence first

Decision: Users can submit evidence and discuss concrete pages, but canonical facts remain separate from discussion.

Context: Freeform comments everywhere would create moderation risk and product ambiguity. Evidence submission is closer to Pnyx's accountability value.

Consequences:

- Promise and politician pages get bounded discussion first.
- Party discussion is deferred until moderation capacity is proven.
- Comments, reports, canonical facts, and moderation decisions require separate data paths.

## ADR-004: Mixed automation for official data

Decision: Official identity and membership facts may auto-publish after validation; promises, stances, interpretations, fulfillment, and discussion require review before becoming canonical.

Context: Low-interpretation official facts should stay current. Interpretive accountability records need human review.

Consequences:

- Ingest must keep raw provenance, normalization, idempotency, and audit trails.
- Stale-data detection creates review work.
- Automation should not bypass public trust semantics.

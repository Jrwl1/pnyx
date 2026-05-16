# Research Watch Pulse Design

Date: 2026-05-16

## Purpose

Pnyx needs an editorial research assistant that can periodically find source-backed party stances, individual politician promises or statements, and fulfillment evidence, then prepare structured candidates for admin review.

The feature is not an autopublisher. It should automate discovery, extraction, dedupe, and staging while preserving the existing trust boundary between raw sources, automated ingest provenance, editorial review, and canonical product truth.

## Scope

The first pilot watches current Finnish government figures and high-value source families.

Pilot politicians:

- Petteri Orpo
- Riikka Purra
- Mari Rantanen
- Anders Adlercreutz
- Sari Multala

Candidate record lanes:

- party stances when official party or government context changes;
- individual promises and public statements from the pilot politicians;
- fulfillment evidence for already-known promises;
- source links and quote spans that help admins decide whether to accept, reject, or request stronger evidence.

Out of scope for the first release:

- automatic publication of promises, statements, stances, or fulfillment decisions;
- broad monitoring of all politicians;
- non-allowlisted web crawling;
- social media scraping;
- opaque confidence-only canonicalization;
- background continuous scraping.

## Source Policy

The watcher uses a two-tier source model.

Official and institutional sources are the strongest evidence tier:

- Finnish Government and ministry pages;
- Eduskunta open data and Parliament pages;
- Finlex legislation and open data;
- Hankeikkuna project data;
- official government publications and monitoring documents;
- official party websites and platform pages.

Article sources are allowed for careful discovery and context:

- Yle;
- Helsingin Sanomat;
- STT-sourced republications where attribution is clear;
- MTV Uutiset.

Article-only sources may create review candidates, especially for promises and statements. Fulfillment candidates based only on articles should default to `needsOfficialConfirmation` unless the article directly links to an official record or quotes a primary document clearly enough for admin review.

## Architecture

The flow should sit beside the existing official ingest system and reuse its review boundary.

1. A weekly `research_watch_pulse` job loads a repo-local watchlist.
2. The job fetches official pages, APIs, party pages, and approved article sources.
3. Raw source payloads are stored before any model processing.
4. The fetcher cleans document text while preserving source URL, title, date, publisher, hash, and enough quote context.
5. A local LLM extracts strict JSON candidates.
6. The backend validates extracted JSON with typed schemas.
7. Valid candidates are deduped against existing raw records, staged items, and canonical records.
8. Passing candidates are inserted as pending ingest stage items.
9. Admins review, optionally edit, apply, reject, or mark candidates as needing stronger source confirmation.

The local LLM must not receive authority to write directly to canonical product tables.

## Data Model

Reuse existing ingest tables as the backbone:

- `ingest_runs`: one row per weekly research pulse.
- `ingest_raw_records`: every fetched page, article, API response, or source document.
- `ingest_stage_items`: structured candidates waiting for admin review.

Add a watchlist file:

- `data/research/watchlist.fi.json`

The watchlist should include:

- pilot politicians and stable target keys;
- official source domains;
- approved article domains;
- party stance URLs;
- policy keywords by politician or topic;
- pulse limits such as max pages per source, fetch timeout, and minimum confidence.

Extend staged item support as needed:

- existing `party_stance`;
- existing `canonical_promise`;
- new `politician_statement`;
- existing `fulfillment_assessment`.

LLM and extraction metadata should live inside staged `normalized_json` and ingest audit records, not in canonical tables.

Candidate metadata should include:

- source URL;
- source title;
- source publisher;
- source publication date or fetch date;
- source tier: `official`, `party`, or `article`;
- evidence quote;
- evidence language;
- local LLM model name;
- extraction confidence;
- target politician or party;
- dedupe key and dedupe reason;
- `needsOfficialConfirmation`;
- extraction warnings.

## Local LLM Setup

The implementation plan should include downloading, installing, and initializing Ollama for local extraction.

Initial local setup steps:

1. Install Ollama for Windows from the official Ollama distribution.
2. Start the local Ollama service.
3. Pull the selected extraction model.
4. Run a health check against the local Ollama API.
5. Run a small dry-run prompt against a saved source fixture.
6. Record the chosen model name and local endpoint in development documentation.

Default local endpoint:

```text
http://127.0.0.1:11434
```

Recommended first model:

```text
llama3.1:8b
```

If the machine struggles with that model, the implementation can fall back to a smaller local model, but extraction quality should be tested against Finnish and English source fixtures before using it in the pulse.

The app should use an Ollama-compatible provider adapter rather than hardcoding Ollama calls throughout ingest code. That leaves room for another local provider later without changing the research pipeline.

## Extraction Contract

The local LLM should output JSON only. The backend must reject malformed JSON and candidates missing required evidence.

Example candidate shape:

```json
{
  "candidateType": "canonical_promise",
  "person": "Petteri Orpo",
  "claimText": "Promise or claim text extracted from the source.",
  "sourceUrl": "https://example.invalid/source",
  "sourceType": "official",
  "publishedAt": "2026-05-16",
  "evidenceQuote": "Short exact source quote used as evidence.",
  "confidence": 0.82,
  "needsOfficialConfirmation": false
}
```

Validation rules:

- every candidate needs a source URL and evidence quote;
- promises need a target politician and promise text;
- statements need a target politician, statement text, and source date or fetch date;
- party stances need a target party, issue, stance text, and source;
- fulfillment assessments need a linked or candidate promise, status, summary, evidence date, and source;
- article-only fulfillment assessments should be marked as needing official confirmation by default;
- low-confidence candidates should be skipped or retained only as non-review extraction diagnostics.

## Review Workflow

The first UI can reuse `/ops/imports`. If candidate cards become too dense, add a dedicated research tab later.

Admin review cards should show:

- candidate type;
- politician or party target;
- extracted claim, statement, stance, or fulfillment summary;
- source title, publisher, URL, and date;
- source tier;
- evidence quote;
- confidence;
- duplicate hints;
- `needsOfficialConfirmation`;
- extraction warnings.

Admin actions:

- Apply: writes to the canonical or accepted-source table through existing review-gated logic.
- Reject: records rejection and reason.
- Needs source: keeps the candidate out of canonical truth and records that stronger evidence is required.
- Edit then apply: allows wording cleanup, with audit trail.

No claim-like record should become public without an explicit admin action.

## Failure Handling

Fetch failures should mark source-level errors and allow the pulse to continue.

Unchanged document hashes should skip LLM reprocessing.

Responses that exceed fetch limits should be skipped with an explicit error.

LLM timeout, malformed JSON, or schema failure should store extraction diagnostics and avoid staging.

Duplicate candidates should collapse into one review item where possible, with multiple source links retained in metadata.

Partial runs should be visible in ops so admins can tell the difference between "no candidates found" and "source failed."

## Verification

Focused verification should include:

- watchlist parsing tests;
- domain allowlist tests;
- fetch limit and raw-record preservation tests;
- Ollama provider adapter tests with mocked responses;
- extraction JSON validation tests;
- dedupe tests against prior stage items and canonical records;
- staging tests for `party_stance`, `canonical_promise`, `politician_statement`, and `fulfillment_assessment`;
- apply/reject tests proving no claim-like candidate auto-publishes;
- frontend or Playwright coverage once review cards change.

Use the narrowest proof commands that cover the implementation. Backend ingest and staging changes should at minimum run `pnpm test` for relevant ingest tests and `pnpm typecheck`. Frontend review changes should also run `pnpm frontend:typecheck` and targeted Playwright coverage.

## Implementation Phases

Implementation plan: `docs/superpowers/plans/2026-05-16-research-watch-pulse-implementation.md`.

Phase 1: watchlist and source fetch.

- Add `data/research/watchlist.fi.json`.
- Add `research_watch_pulse` as an ingest source family.
- Fetch official and approved article sources.
- Store raw records and skip unchanged hashes.
- Add tests for watchlist parsing, domain allowlisting, and raw-record preservation.

Phase 2: Ollama local LLM setup and provider adapter.

- Install Ollama locally.
- Pull the selected model.
- Confirm the Ollama service responds at `http://127.0.0.1:11434`.
- Add a local provider adapter with timeout and JSON-only response handling.
- Add mocked provider tests and fixture-based dry-run tests.
- Document local setup commands for future operators.

Phase 3: extraction and staging.

- Clean source text for extraction.
- Prompt the local model with candidate schemas.
- Validate model output.
- Dedupe candidates.
- Stage pending candidates with extraction metadata.
- Add `politician_statement` stage support.

Phase 4: admin review workflow.

- Improve `/ops/imports` candidate cards or add a research candidates tab.
- Show source tier, quote span, duplicate hints, confidence, and official-confirmation requirement.
- Add "needs source" handling if current reject/apply states are not expressive enough.
- Prove no staged research candidate becomes canonical without admin action.

## Open Questions

The first implementation can proceed without answering these, but they should be revisited after the pilot:

- Whether article source access should use RSS feeds, site search, or a curated URL list per source.
- Whether `needs source` should be a distinct stage status or a rejection reason.
- Whether fulfilled, broken, and in-progress evidence should require two independent sources for publication.
- Whether the watchlist should move from JSON into an ops-managed table after the pilot.

## Acceptance Criteria

The design is successful when a weekly local pulse can:

- fetch allowlisted official and article sources;
- preserve raw provenance before LLM processing;
- extract structured candidates with a local Ollama model;
- stage party stance, promise, statement, and fulfillment candidates;
- require admin review before publication;
- make source tier, quote evidence, confidence, and official-confirmation needs visible in ops;
- prove through tests that claim-like records are never auto-published.

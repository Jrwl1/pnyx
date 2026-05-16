# Public Record Redesign And Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace placeholder-like public pages with a source-backed Finnish public-record slice and a reader-first frontend that answers who, what is known, where it came from, and what remains missing.

**Architecture:** Keep the existing Express/SQLite/React architecture. Add a separate realistic seed helper beside the launch rehearsal seed, then redesign the public React routes around existing API payloads and trust/readiness fields instead of introducing new backend contracts.

**Tech Stack:** TypeScript, Express, better-sqlite3, React 18, Vite, React Router, Playwright, Vitest.

---

## File Structure

- Create `test/helpers/public-record-seed.ts`: source-backed local seed for five parties, five politicians, policy stances, canonical promises, accepted sources, unknown fulfillment assessments, readiness rows, and one staged ingest item.
- Modify `package.json`: add `seed:public-records` and `public-records:coverage` scripts without changing `seed:launch-rehearsal`.
- Modify `frontend/src/lib/domain.ts`: add reader-facing issue labels that match the seeded policy slice and small helper labels for record readiness.
- Modify `frontend/src/layout/PublicLayout.tsx`: keep public nav focused and add Promises as a first-class public route.
- Modify `frontend/src/routes/HomePage.tsx`: change from broad explainer/card wall to search-first public record entry with seeded records, issues, parties, and recent evidence.
- Modify `frontend/src/routes/PoliticiansPage.tsx`: keep dense filters, but simplify table/card copy and remove implementation-flavored labels.
- Modify `frontend/src/routes/PoliticianProfilePage.tsx`: restructure as a record page with compact header, evidence summary, tabs for promises/votes/evidence, and visible readiness/gaps.
- Modify `frontend/src/routes/PartiesPage.tsx`: redesign directory as a scannable party index, not a metric-card grid.
- Modify `frontend/src/routes/PartyProfilePage.tsx`: lead with party identity, stances, members, readiness, and party-line context in a readable order.
- Modify `frontend/src/routes/PromiseIndexPage.tsx`: make promise browsing issue/source oriented and remove "legacy/canonical" as the main visible vocabulary.
- Modify `frontend/src/routes/PromiseDetailPage.tsx`: lead with the claim, source bundle, status, vote/party context, discussion separation, and audit history.
- Modify `frontend/src/styles.css`: add public-record layout primitives, denser list treatments, compact fact rows, and responsive refinements using existing tokens.
- Update `PRODUCT.md`, `DESIGN.md`, and relevant docs only if implementation changes product truth or design rules.

## Data Scope

Seed the following source-backed public slice as of 2026-05-16:

- Parties: KOK, PS, SDP, VAS, VIHR.
- People: Petteri Orpo, Riikka Purra, Antti Lindtman, Li Andersson, Maria Ohisalo.
- Positions/promises: ten official party/government positions from the Finnish Government programme and party platforms.
- Fulfillment: set to `unknown` unless there is explicit implementation proof in the seed. Unknown is a real state, not a failure.
- Page readiness: `thin_but_honest` for seeded public records with explicit missing data keys.

## Task 1: Seed Public Records

**Files:**
- Create: `test/helpers/public-record-seed.ts`
- Modify: `package.json`

- [ ] **Step 1: Add the seed helper**

Create a helper modeled on `test/helpers/launch-rehearsal.ts`, but with stable `INSERT OR IGNORE`/lookup behavior and no reset by default. It must insert parties, aliases, politicians, memberships, statements, canonical promises, accepted sources, party stances, unknown fulfillment assessments, readiness rows, and a small ingest provenance sample.

- [ ] **Step 2: Add scripts**

Add:

```json
"seed:public-records": "pnpm exec tsx test/helpers/public-record-seed.ts seed",
"public-records:coverage": "pnpm exec tsx test/helpers/public-record-seed.ts coverage"
```

- [ ] **Step 3: Verify**

Run:

```powershell
pnpm exec tsx test/helpers/public-record-seed.ts seed
pnpm exec tsx test/helpers/public-record-seed.ts coverage
```

Expected: JSON output with at least five parties, five politicians, ten public promises, ten stances, ten unknown fulfillment assessments, and readiness records.

## Task 2: Reader-First Public Shell

**Files:**
- Modify: `frontend/src/layout/PublicLayout.tsx`
- Modify: `frontend/src/lib/domain.ts`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Add Promises to public nav**

Expose `/promises` in the primary nav because promises are now one of the main public journeys.

- [ ] **Step 2: Align issue labels**

Use issue labels that match the real seed content: Public finances, Employment, Climate and energy, Welfare and social security, Research and innovation, Environment, Mental health, Work incentives.

- [ ] **Step 3: Add CSS primitives**

Add compact record classes: `.record-hero`, `.record-kicker-row`, `.record-summary-grid`, `.record-facts`, `.record-list`, `.source-list`, `.evidence-note`, `.public-tabs`, `.question-panel`, and responsive rules.

## Task 3: Home And Directories

**Files:**
- Modify: `frontend/src/routes/HomePage.tsx`
- Modify: `frontend/src/routes/PoliticiansPage.tsx`
- Modify: `frontend/src/routes/PartiesPage.tsx`
- Modify: `frontend/src/routes/PromiseIndexPage.tsx`

- [ ] **Step 1: Home**

Replace the long explainer/card wall with a search-first entry, current record slice, browse-by-issue, browse-by-party, and a concise "what is missing" section.

- [ ] **Step 2: Politicians**

Keep filters and table behavior, but change labels from metric scoreboard language to "tracked promises", "known outcomes", "missing context", and "last source update".

- [ ] **Step 3: Parties**

Show party identity, connected members, official positions, and missing context as dense rows/cards with restrained copy.

- [ ] **Step 4: Promises**

Make issue/source filtering prominent and present promise records as claims with source, speaker, issue, and status, not generic cards.

## Task 4: Record Detail Pages

**Files:**
- Modify: `frontend/src/routes/PoliticianProfilePage.tsx`
- Modify: `frontend/src/routes/PartyProfilePage.tsx`
- Modify: `frontend/src/routes/PromiseDetailPage.tsx`
- Modify: `frontend/src/components/PageReadinessPanel.tsx` if panel wording needs tightening.

- [ ] **Step 1: Politician profile**

Lead with person identity and source-backed record state. Put readiness after the identity block, then a compact fact row, then tabs. Keep comments visually separate at the bottom.

- [ ] **Step 2: Party profile**

Lead with party identity and stance/member counts. Put official stances before activity logs and explain unknown party-line status only where needed.

- [ ] **Step 3: Promise detail**

Lead with the claim and source bundle. Show fulfillment unknown as "not assessed yet" with the source count and missing evidence before community voting or discussion.

## Task 5: Browser Audit And Verification

**Files:**
- Modify tests only if route text or structure breaks intentional UI assertions.

- [ ] **Step 1: Static verification**

Run:

```powershell
pnpm frontend:typecheck
pnpm frontend:build
pnpm test:ui
pnpm docs:check
```

- [ ] **Step 2: Browser audit**

Use the in-app browser against local frontend routes:

- `/`
- `/politicians`
- `/politicians/:seeded-id`
- `/parties`
- `/parties/kok`
- `/promises`
- `/promises/:seeded-statement-id`
- `/methodology`

Check desktop and mobile widths for overflow, unreadable density, broken links, stale copy, console errors, and evidence/discussion separation.

- [ ] **Step 3: Iterate**

Fix P0-P2 issues first, re-run the relevant browser checks, then do a P3-P4 polish pass across spacing, copy, headings, and mobile scanning.

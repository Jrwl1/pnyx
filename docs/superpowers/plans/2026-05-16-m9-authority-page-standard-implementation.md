# M9 Authority Page Standard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the M9 page-readiness standard across data, API, UI, participation, moderation, docs, and proof.

**Architecture:** Store page readiness as reviewed product state attached to politician, party, and canonical-promise pages. Public APIs expose readiness, freshness, provenance, and missing-data facts without letting user discussion mutate canonical records. UI renders those facts on representative public pages, while participation and moderation paths remain separate tables and routes.

**Tech Stack:** TypeScript, Express, better-sqlite3, React 18, Vite, Vitest, Supertest, Playwright.

---

### Task 1: Readiness Data Model

**Files:**
- Create: `migrations/0018_page_readiness.sql`
- Create: `src/db/page-readiness.ts`
- Test: `test/page-readiness.test.ts`
- Modify: `test/migration.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test that inserts one politician, party, and canonical promise, then asserts that moderator-reviewed readiness records can be upserted and read back with:

```ts
expect(readiness).toMatchObject({
  entityKind: "politician",
  readinessState: "thin_but_honest",
  freshnessCheckedAt: "2026-05-16",
  sourceCount: 1,
  missingDataKeys: ["promise_coverage"],
  provenanceSummary: "Imported from official source and reviewed by moderator."
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- test/page-readiness.test.ts`

Expected: fail because `src/db/page-readiness.ts` and the `page_readiness` table do not exist.

- [ ] **Step 3: Write minimal implementation**

Add `page_readiness` with `entity_kind`, `entity_id`, `readiness_state`, `freshness_checked_at`, `source_count`, `provenance_summary`, `missing_data_json`, `reviewed_by`, `reviewed_at`, timestamps, checks, and a unique `(entity_kind, entity_id)`.

Add typed helpers:

```ts
upsertPageReadiness(input: PageReadinessInput): PageReadinessRow
getPageReadiness(entityKind: PageReadinessEntityKind, entityId: string | number): PageReadinessRow | null
getPageReadinessMap(entityKind: PageReadinessEntityKind, entityIds: Array<string | number>): Map<string, PageReadinessRow>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- test/page-readiness.test.ts`

Expected: pass.

### Task 2: Public Readiness API Output

**Files:**
- Modify: `src/server.ts`
- Modify: `src/db/party-graph.ts`
- Modify: `src/db/canonical-promises.ts`
- Test: `test/page-readiness.test.ts`

- [ ] **Step 1: Write the failing API test**

Extend `test/page-readiness.test.ts` to assert `/politicians`, `/parties`, `/parties/:id`, `/canonical-promises`, and `/canonical-promises/:id` include a `readiness` object when a readiness record exists and a generated `not_ready` or `thin_but_honest` default when no reviewed record exists.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- test/page-readiness.test.ts`

Expected: fail because route serializers do not expose readiness.

- [ ] **Step 3: Write minimal implementation**

Import `getPageReadiness` and `getPageReadinessMap`, add a serializer that returns public readiness fields, and attach the object to representative politician, party, and promise responses.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- test/page-readiness.test.ts`

Expected: pass.

### Task 3: Readiness UI

**Files:**
- Create: `frontend/src/components/PageReadinessPanel.tsx`
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/routes/PoliticianProfilePage.tsx`
- Modify: `frontend/src/routes/PartyProfilePage.tsx`
- Modify: `frontend/src/routes/PromiseDetailPage.tsx`
- Modify: `frontend/src/styles.css`
- Test: existing frontend typecheck and browser checks

- [ ] **Step 1: Use UI skills**

Read and follow `impeccable` for design shaping and `uncodixfy` before editing React/CSS.

- [ ] **Step 2: Implement UI**

Render readiness state, source count, freshness date, provenance summary, and missing-data calls to action on politician, party, and promise pages.

- [ ] **Step 3: Verify UI**

Run: `pnpm frontend:typecheck`, `pnpm frontend:build`, and browser-check representative public pages.

### Task 4: Evidence Submission Tie-In

**Files:**
- Modify existing contribution routes and page links as needed
- Test: add or extend Supertest/frontend coverage

- [ ] **Step 1: Add failing proof**

Add proof that missing-data calls to action route users to the relevant protected contribution page without creating canonical truth directly.

- [ ] **Step 2: Implement minimal route/link behavior**

Use existing proposal, promise-claim, and statement submission flows instead of creating duplicate submission models.

### Task 5: Discussion, Reporting, And Moderation

**Files:**
- Create: `migrations/0019_discussion_moderation.sql`
- Create: `src/db/discussions.ts`
- Modify: `src/server.ts`
- Add tests under `test/`
- Add frontend route components or panels as scoped by current UI routes

- [ ] **Step 1: Add failing storage/API tests**

Assert politician and promise discussions are attached to concrete entities, comments are separate from canonical records, reports enter a moderation queue, and moderators can hide, lock, remove, restore, or escalate content.

- [ ] **Step 2: Implement schema and APIs**

Create discussion threads, comments, reports, moderation actions, and list/detail endpoints with role guards.

- [ ] **Step 3: Implement minimal UI**

Add bounded discussion panels on politician and promise pages and moderation controls in the ops surface.

### Task 6: Proof And Docs

**Files:**
- Modify: `docs/product/page-readiness.md`
- Modify: `docs/architecture/api-and-data.md`
- Modify: `docs/product/milestones.md`
- Modify: `docs/plans/active/M9-authority-page-standard.md`
- Modify: `docs/plans/debt.md`
- Test: proof commands

- [ ] **Step 1: Update docs to match implementation**

Document exact implemented readiness fields, API exposure, discussion boundaries, moderation actions, and remaining gaps.

- [ ] **Step 2: Run proof commands**

Run the narrow proof for changed areas first:

```bash
pnpm test -- test/page-readiness.test.ts
pnpm test -- test/discussions.test.ts
pnpm typecheck
pnpm frontend:typecheck
pnpm frontend:build
pnpm docs:check
```

Broaden to `pnpm proof:postlaunch` when M9 surfaces are integrated.

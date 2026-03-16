# Sprint

Window: 2026-03-17 to 2026-04-06

Executable DO queue. Execute top-to-bottom.
Each `Do` checklist must stay flat and each substep must be small enough to complete in one DO run.
Evidence policy: commit-per-packet. Each checked substep must include packet hash, run summary, and changed files.
Execution policy: after `DO` or `RUNSPRINT`, run continuous `DO -> REVIEW` cycles until all active rows are `DONE` or a protocol blocker is hit.
Clean-tree policy: protocol cleanliness is defined by `git status --porcelain`; ignored local files are out of scope, while tracked changes and untracked non-ignored files still block DO and REVIEW completion.
DO baseline policy: DO may start from dirty tracked or unignored state only when every pre-existing dirty path is already inside the selected packet `Files` scope and can be safely absorbed into that packet.
MCP policy: use direct MCP tools when they help gather evidence or verify behavior. Do not use delegation or autopilot tooling.
Required substep shape:

- `- [ ] <imperative action>`
- `  - files: <paths/globs>`
- `  - run: <command(s)>` or `N/A` only when the substep text explicitly allows it
- `  - evidence: packet:<hash> | run:<cmd> -> <result> | files:<changed paths> | docs:<hash or N/A> | status: clean`

## Goal (this sprint)

Implement the first Finland-first public discovery UI slice against the shipped Frontend V3, starting with route shell, nav, and party-aware public surfaces that remain honest about missing backend data.

---

| ID | Do | Files | Acceptance | Evidence | Stop | Status |
| --- | --- | --- | --- | --- | --- | --- |
| S-11 | Add Finland-first route shell and public nav for party-aware discovery. See `S-11` substeps below. | `frontend/src/App.tsx`, `frontend/src/layout/PublicLayout.tsx`, `frontend/src/routes/PartiesPage.tsx`, `frontend/src/routes/PartyProfilePage.tsx`, `frontend/src/styles.css`, `frontend/src/types.ts` | Public nav is `Home | Politicians | Parties | Methodology`, routes `/parties` and `/parties/:id` exist, and the frontend build/typecheck pass. | Pending. | Stop if route-shell changes require backend or API changes beyond frontend-local placeholder/unknown-state handling. | TODO |
| S-12 | Refresh home and politician directory for Finland-first public discovery. See `S-12` substeps below. | `frontend/src/routes/HomePage.tsx`, `frontend/src/routes/PoliticiansPage.tsx`, `frontend/src/lib/domain.ts`, `frontend/src/styles.css`, `frontend/src/types.ts` | Home keeps politician search as the dominant CTA, adds party-aware discovery context, and politician directory reflects Finland-first labels and party-aware filtering states without faking data. | Pending. | Stop if the slice requires canonical changes or backend data not already covered by honest unknown-state handling. | TODO |
| S-13 | Add party-context surfaces to politician detail, promise detail, and methodology. See `S-13` substeps below. | `frontend/src/routes/PoliticianProfilePage.tsx`, `frontend/src/routes/PromiseDetailPage.tsx`, `frontend/src/routes/MethodologyPage.tsx`, `frontend/src/lib/domain.ts`, `frontend/src/styles.css`, `frontend/src/types.ts` | Politician and promise detail pages include party-context sections, methodology defines party stance and party-line logic, and all missing data is rendered as explicit unknown states. | Pending. | Stop if detail-page party context requires invented alignment or fabricated backend values. | TODO |
| S-14 | Verify the first public discovery slice against build and browser expectations. See `S-14` substeps below. | `frontend/**` | `pnpm frontend:typecheck`, `pnpm frontend:build`, and a browser pass across Home / Politicians / Parties / Methodology complete with no blocking UI regression. | Pending. | Stop if required verification reveals frontend behavior that cannot be fixed within the same frontend area. | TODO |

### S-11 substeps

- [ ] Add `Parties` to the shared public nav and route table
  - files: `frontend/src/App.tsx`, `frontend/src/layout/PublicLayout.tsx`
  - run: `pnpm frontend:typecheck`
  - evidence: pending

- [ ] Add route-shell page components for party directory and party profile
  - files: `frontend/src/routes/PartiesPage.tsx`, `frontend/src/routes/PartyProfilePage.tsx`, `frontend/src/styles.css`, `frontend/src/types.ts`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: pending

- [ ] Keep the new route shell honest about missing backend party APIs by using explicit unknown or placeholder states only
  - files: `frontend/src/routes/PartiesPage.tsx`, `frontend/src/routes/PartyProfilePage.tsx`, `frontend/src/types.ts`
  - run: `pnpm frontend:build`
  - evidence: pending

### S-12 substeps

- [ ] Replace politician-only home-page copy and sections with Finland-first discovery copy while keeping politician search as the primary CTA
  - files: `frontend/src/routes/HomePage.tsx`, `frontend/src/styles.css`
  - run: `pnpm frontend:typecheck`
  - evidence: pending

- [ ] Add party-aware discovery modules to home using honest local placeholder or unknown-state structures
  - files: `frontend/src/routes/HomePage.tsx`, `frontend/src/lib/domain.ts`, `frontend/src/types.ts`, `frontend/src/styles.css`
  - run: `pnpm frontend:build`
  - evidence: pending

- [ ] Refresh the politician directory for Finland-first labels and party-aware filter behavior
  - files: `frontend/src/routes/PoliticiansPage.tsx`, `frontend/src/lib/domain.ts`, `frontend/src/styles.css`, `frontend/src/types.ts`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: pending

### S-13 substeps

- [ ] Add party affiliation and party-line context to the politician profile without inventing alignment data
  - files: `frontend/src/routes/PoliticianProfilePage.tsx`, `frontend/src/lib/domain.ts`, `frontend/src/types.ts`, `frontend/src/styles.css`
  - run: `pnpm frontend:typecheck`
  - evidence: pending

- [ ] Add party stance comparison to promise detail with explicit unknown-state handling
  - files: `frontend/src/routes/PromiseDetailPage.tsx`, `frontend/src/lib/domain.ts`, `frontend/src/types.ts`, `frontend/src/styles.css`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: pending

- [ ] Extend methodology copy to define party stance and party-line comparison alongside fulfillment and vote alignment
  - files: `frontend/src/routes/MethodologyPage.tsx`
  - run: `pnpm frontend:build`
  - evidence: pending

### S-14 substeps

- [ ] Run frontend static proof for the updated public discovery slice
  - files: `frontend/**`
  - run: `pnpm frontend:typecheck && pnpm frontend:build`
  - evidence: pending

- [ ] Verify the updated public route shell in a browser across Home, Politicians, Parties, and Methodology
  - files: `frontend/**`
  - run: `playwright MCP verification of /, /politicians, /parties, /methodology`
  - evidence: pending

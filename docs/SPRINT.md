# Sprint

Window: 2026-03-16 to 2026-04-06

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

Lock the next Finland-first public discovery and party-context delivery slice against the shipped Frontend V3 and backend reality.

---

| ID | Do | Files | Acceptance | Evidence | Stop | Status |
| --- | --- | --- | --- | --- | --- | --- |
| S-01 | Review shipped public-surface reality and lock the next public discovery milestone. See `S-01` substeps below. | `docs/ROADMAP.md`, `docs/BACKLOG.md`, `docs/SPRINT.md`, `docs/PROJECT_STATUS.md`, `docs/CANONICAL_REPORT.md`, `docs/DECISIONS.md`, `docs/FRONTEND_V3_SPEC.md`, `docs/TRACEABILITY_V1.md`, `frontend/**`, `src/**`, `test/**` | Canonical docs describe the next Finland-first delivery slice in a way that matches current shipped code and identifies the first executable implementation queue. | Pending. | Stop if the shipped `frontend/`, `src/`, and current product docs contradict each other in a way that cannot be resolved by canonical hierarchy without a customer decision. | TODO |

### S-01 substeps

- [ ] Review the shipped public surfaces and identify the exact gap between current Frontend V3 and the Finland-first party-context scope
  - files: `frontend/**`, `src/**`, `test/**`, `docs/FRONTEND_V3_SPEC.md`, `docs/TRACEABILITY_V1.md`, `docs/ROADMAP.md`, `docs/PROJECT_STATUS.md`
  - run: `rg -n "party|politician|promise|methodology|ops" frontend src test docs`
  - evidence: pending

- [ ] Update canonical docs so the next milestone and backlog explicitly define party pages, party stance records, and politician-vs-party alignment surfaces
  - files: `docs/ROADMAP.md`, `docs/BACKLOG.md`, `docs/PROJECT_STATUS.md`, `docs/CANONICAL_REPORT.md`, `docs/DECISIONS.md`
  - run: `N/A`
  - evidence: pending

- [ ] Replace this sprint placeholder row with the first implementation-ready queue once the milestone is locked
  - files: `docs/SPRINT.md`
  - run: `N/A`
  - evidence: pending

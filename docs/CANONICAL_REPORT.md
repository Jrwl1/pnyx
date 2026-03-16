# Canonical report

Last updated: 2026-03-17

## Migration summary

- Replaced the legacy always-on `ai/` repository OS with an opt-in root `AGENTS.md` contract modeled on the `saas-monorepo` approach.
- Moved the old `ai/` tree, root `PROJECT_STATUS.md`, root `TASKS.md`, root `WORKLOG.md`, old `AGENTS.md`, and delegation smoke-test artifacts out of the repo and into `C:\Users\john\aios\_archive\Pnyx-aios-legacy-2026-03-16`.
- Added a new canonical planning set under `docs/`: `CANONICAL.md`, `PROJECT_STATUS.md`, `ROADMAP.md`, `BACKLOG.md`, `SPRINT.md`, `DECISIONS.md`, `CANONICAL_REPORT.md`, and `WORKLOG.md`.
- Removed active repo-local references to delegation and autopilot flows from `.cursor/skills/security-auditor/SKILL.md` and `.cursor/rules/security-auditor.mdc`.

## Conflict resolution notes

1. The previous Pnyx contract required every session to read repo AI OS docs first.
   - Winner: the new opt-in `AGENTS.md` contract. Normal chat is now the default.
2. Historical planning state lived in root files plus `ai/` subtrees.
   - Winner: the new `docs/` canonical set. Historical material was archived outside the repo.
3. Delegation guidance existed in repo docs and helper rules.
   - Winner: the no-delegation rule in the new active contract. Direct MCP tools remain allowed and encouraged where useful.

## Reconciliation update

- The frontend public-discovery spec in `docs/FRONTEND_V3_SPEC.md` has now been absorbed into the active canonical direction for Finland-first party-aware public discovery.
- Current shipped frontend reality remains narrower than the absorbed spec:
  - `frontend/src/App.tsx` and `frontend/src/layout/PublicLayout.tsx` still expose only `Home | Politicians | Methodology`.
  - No `frontend/src/routes/PartiesPage.tsx` or `frontend/src/routes/PartyProfilePage.tsx` exists yet.
  - Current home, directory, profile, promise, and methodology pages remain politician-only and do not implement party-context surfaces.
- Resolution by canonical hierarchy:
  - Code wins for "what exists now".
  - `docs/FRONTEND_V3_SPEC.md` + `docs/ROADMAP.md` win for "what must be delivered next".
- This `PLAN` run resolves the previous placeholder sprint by converting it into an implementation-ready frontend queue grounded in current code and the absorbed public-discovery spec.

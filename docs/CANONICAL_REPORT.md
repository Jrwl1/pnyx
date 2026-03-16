# Canonical report

Last updated: 2026-03-16

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

## Follow-up requirement

- The next `PLAN` run must reconcile the new canonical milestone and sprint queue with current shipped `frontend/`, `src/`, `test/`, and `docs/FRONTEND_V3_SPEC.md` reality before implementation resumes.

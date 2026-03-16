# Canonical documentation

Last updated: 2026-03-16

Use this file as the entry point for planning and product truth.

## Top-level OS contract

- `AGENTS.md` is the operating contract for `PLAN`/`DO`/`RUNSPRINT`/`REVIEW` behavior.
- If there is any conflict about agent behavior, `AGENTS.md` wins.
- This repo does not permit delegation or autopilot tooling in its operating contract.
- Prefer direct MCP tools when useful: `filesystem`, `git`, `github`, `context7`, `chrome-devtools`, and `playwright`.

## Conflict resolution hierarchy

Use this order for conflicts:

1. `AGENTS.md` for operating behavior and file permissions.
2. Code reality (`src/**`, `frontend/**`, tests, migrations) for implemented behavior.
3. Product and implementation docs that describe current shipped behavior.
4. Accepted ADRs in `docs/DECISIONS.md`.
5. Active planning docs (`docs/PROJECT_STATUS.md`, `docs/ROADMAP.md`, `docs/SPRINT.md`, `docs/BACKLOG.md`).
6. Supporting and historical docs.

Rules:

- For "what exists now", code wins.
- For "what must be delivered next", canonical planning docs win.
- If uncertain, write `TBD` and assign owner.

## Language policy

- Preserve each file's current language.
- Do not rewrite documents just to translate language.
- New text in a file must follow that file's current language style.

## Canonical plan set

- `docs/ROADMAP.md` is the canonical milestone plan.
- `docs/PROJECT_STATUS.md`, `docs/SPRINT.md`, and `docs/BACKLOG.md` must stay aligned with it.

## Read order

For protocol-required read order, follow `AGENTS.md`. The list below mirrors the default planning order and must not override protocol-specific ordering in `AGENTS.md`.

1. `docs/CANONICAL.md`
2. `AGENTS.md`
3. `docs/PROJECT_STATUS.md`
4. `docs/ROADMAP.md`
5. `docs/SPRINT.md`
6. `docs/BACKLOG.md`
7. `docs/DECISIONS.md`
8. `docs/CANONICAL_REPORT.md`
9. `docs/client/**`

## Canonical set

- `AGENTS.md`: mode router and execution contract
- `docs/CANONICAL.md`: precedence and canonical set
- `docs/PROJECT_STATUS.md`: current planning snapshot
- `docs/ROADMAP.md`: canonical milestones and done criteria
- `docs/SPRINT.md`: active execution queue
- `docs/BACKLOG.md`: structured future tasks and TBDs
- `docs/DECISIONS.md`: ADR history and locked decisions
- `docs/CANONICAL_REPORT.md`: change and conflict log

## Supporting (not normative)

- `docs/TRACEABILITY_V1.md`
- `docs/FRONTEND_V3_SPEC.md`
- `docs/IMPLEMENTATION_GAP_PLAN.md`
- `docs/RELEASE_READINESS_RUNBOOK.md`
- `docs/SUCCESS_METRICS_PLAN.md`
- `frontend/README.md` (if present)

## Historical note

- The previous always-on `ai/` router stack and its root status/task/worklog files were removed from the repo on 2026-03-16 and archived outside the repository at `C:\Users\john\aios\_archive\Pnyx-aios-legacy-2026-03-16`.

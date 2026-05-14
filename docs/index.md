# Documentation index

Last checked: 2026-05-14

This directory is the repository-local knowledge base. It follows the harness-engineering principle that agents need a map, not a giant instruction manual. `AGENTS.md` is the short entry point; these docs hold the deeper truth.

## Source-of-truth order

1. Current code, tests, migrations, package scripts, and generated artifacts.
2. Live harness docs listed in this index.
3. Security docs in `docs/security/`.
4. Historical evidence in `docs/archive/legacy-protocol/`.
5. Temporary notes, chats, and memories.

If docs conflict with code, update the docs or call out the drift. Do not fabricate product truth to match stale docs.

## Live truth files

- `docs/repo/truth.md`: repository purpose, stack, commands, and doc policy.
- `docs/product/truth.md`: shipped product capabilities and current product boundaries.
- `docs/product/milestones.md`: completed milestones and next milestones.
- `docs/product/page-readiness.md`: page readiness states and criteria.
- `docs/product/participation.md`: evidence, discussion, and reporting model.
- `docs/architecture/index.md`: architecture overview and boundaries.
- `docs/architecture/api-and-data.md`: API/data surface truth.
- `docs/architecture/decisions.md`: current architectural decisions.
- `docs/frontend/workflow.md`: frontend design and implementation rules.
- `docs/quality/verification.md`: proof commands and evidence rules.
- `docs/quality/harness-checks.md`: markdown harness checks.

## Plans

- `docs/plans/active/M9-authority-page-standard.md`: next active product plan.
- `docs/plans/debt.md`: known debt and cleanup candidates.
- `docs/plans/completed/M0-M8-summary.md`: completed milestone summary.

Plans are first-class artifacts. Active plans describe intended work. Completed plans summarize shipped outcomes. Debt is tracked separately so it does not masquerade as milestone scope.

## Moved or historical docs

- `docs/archive/legacy-protocol/`: old mode-router, sprint, backlog, worklog, and canonical planning files. These are historical evidence only.
- `docs/quality/release-readiness.md`: release runbook moved from the old root docs.
- `docs/quality/success-metrics.md`: success metrics plan moved from the old root docs.
- `docs/quality/traceability.md`: endpoint/test traceability moved from the old root docs.
- `docs/frontend/v3-spec.md`: existing frontend V3 spec.
- `docs/frontend/audits/frontend-audit.md`: existing frontend audit.

## OpenAI harness reference

- `docs/references/openai-harness-engineering.md`: local summary of the OpenAI harness-engineering article that motivated this documentation structure.

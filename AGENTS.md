# Agent map

This file is a short repository map for agents. It is not a protocol router.

## Operating model

- There is no repository mode-command router in this repo.
- Treat user requests normally. Read the relevant docs, inspect the code, make scoped changes when asked, verify them, and report the result.
- Do not edit files for purely conversational questions unless the user explicitly asks for repo changes.
- Prefer repo-local truth over memory. If a chat, old sprint file, or temporary note conflicts with current code and the live docs below, current code and live docs win.
- Keep old protocol files in `docs/archive/legacy-protocol/` as historical evidence only.

## Start here

1. `docs/index.md` - documentation map and source-of-truth hierarchy.
2. `docs/repo/truth.md` - current repository truth, tech stack, commands, and doc policy.
3. `docs/product/truth.md` - current product truth and shipped capabilities.
4. `docs/product/milestones.md` - current milestone truth and next product direction.
5. `docs/quality/verification.md` - commands and evidence expectations.

## Task routing

- Product or milestone planning: read `docs/product/truth.md`, `docs/product/milestones.md`, and `docs/plans/active/`.
- Frontend work: read `docs/frontend/workflow.md` and use `impeccable` for design shaping plus `uncodixfy` whenever editing UI code.
- Backend or data-model work: read `docs/architecture/index.md` and `docs/architecture/api-and-data.md`.
- Release, proof, or metrics work: read `docs/quality/verification.md`, `docs/quality/release-readiness.md`, `docs/quality/success-metrics.md`, and `docs/quality/traceability.md`.
- Security-sensitive work: read `docs/security/README.md` and follow the audit note requirements.
- Historical context only: read `docs/archive/legacy-protocol/README.md`.

## Engineering rules

- Preserve each file's current language and style.
- Keep changes scoped to the user's request and the relevant domain.
- Do not hide uncertainty. If product, code, or docs conflict, say which source wins and update docs when asked.
- Prefer explicit source-backed product data over inferred or fabricated data.
- Keep canonical facts, user submissions, comments, moderation state, and automated ingest provenance separate.
- Use structured parsers and typed code paths when available.
- Add or update tests and proof commands proportional to risk.
- Do not introduce new third-party dependencies, environment variables, or major architecture patterns without a clear reason.
- Do not revert user changes or unrelated work.

## React and frontend safety

- Hooks must run in the same order every render. Put hooks before conditional returns.
- Browser-verify meaningful UI changes.
- Product pages must be readable with real data density, not only tiny fixtures.

## Git and working tree

- Check `git status --porcelain` before and after non-trivial work.
- Keep commits focused when the user asks for committed changes.
- Existing untracked local tool state such as `.serena/` is not product truth.

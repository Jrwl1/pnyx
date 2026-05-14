# OpenAI harness engineering reference

Last checked: 2026-05-14

Source: https://openai.com/index/harness-engineering/

## Relevant principles

OpenAI's harness-engineering article describes agent-first engineering as environment design: humans steer, agents execute, and repository-local scaffolding makes the work legible and enforceable.

The principles applied to this repo:

- Give agents a map, not a giant instruction manual.
- Treat repository knowledge as the system of record.
- Use structured docs with progressive disclosure.
- Treat execution plans as first-class artifacts.
- Make application behavior, logs, metrics, docs, and architecture legible to agents.
- Enforce architecture and taste with mechanical checks where possible.
- Capture repeated human taste and review feedback as docs, tests, lint rules, or scripts.
- Regularly garbage-collect stale docs and patterns.

## Local interpretation

For Pnyx, this means:

- `AGENTS.md` is short and points to deeper docs.
- Product truth, milestone truth, architecture, frontend workflow, quality, and plans have focused files.
- Old protocol docs are archived, not mixed with active instructions.
- `pnpm docs:check` is the first mechanical guard.
- Future work should add generated schema/API references and stronger drift checks.

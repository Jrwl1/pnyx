# Claude Code repository contract

`AGENTS.md` is the repository OS contract.

Claude must read `AGENTS.md` at the start of every session and follow all rules defined there, including:

- the mode router (`PLAN` / `DO` / `RUNSPRINT` / `REVIEW`)
- global rules and clean-tree semantics
- file caps and sprint schema
- PLAN, DO, and REVIEW read/write permissions
- evidence, worklog, and commit rules

Quick reference:

- Normal chat is the default. If the first line is not `PLAN`, `DO`, `RUNSPRINT`, or `REVIEW`, do not run repo actions unless the user explicitly asks.
- Canonical planning docs live in `docs/`.
- Use direct MCP tools when they help. Do not use delegation or autopilot tooling in this repo.
- `docs/WORKLOG.md` is append-only.
- `docs/DECISIONS.md` is append-only.

See also:

- `AGENTS.md`
- `docs/CANONICAL.md`
- `docs/SPRINT.md`

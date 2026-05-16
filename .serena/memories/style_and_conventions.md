# Style and conventions

Language and code style:
- TypeScript, ES modules, strict-ish project configs.
- Backend route and helper code is plain Express/SQLite with explicit validation and role checks.
- Frontend uses React functional components, React Router, context providers, typed API helpers, and route components in `frontend/src/routes`.
- Preserve existing file language; do not translate entire docs or code comments.
- React hooks must run before conditional early returns; see `AGENTS.md` React Rules of Hooks.

Repo operating contract:
- `AGENTS.md` is authoritative for protocol behavior.
- Normal chat is default unless first non-empty line starts exactly `PLAN`, `DO`, `RUNSPRINT`, or `REVIEW`.
- Protocol docs under `docs/` are tightly controlled. `docs/WORKLOG.md` and `docs/DECISIONS.md` are append-only in their respective protocols.
- The repo contract forbids delegation/autopilot tooling and prefers direct MCP tools where useful.
- PLAN/DO/REVIEW have strict allowed-write scopes, evidence rules, and commit requirements.
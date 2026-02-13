TOOLING_DRIFT.md — Tool versions and environment (drift log)

WHAT IT DO? Single place to record tooling versions, WSL distro, node/codex/MCP details, and where to check them. Prevents "works on my machine" and regression from version drift.

How to use:
- Update this file when you change or verify the environment (e.g. after install, after WSL upgrade).
- When delegation or MCP fails, compare run environment to the last-known-good row below.

Template (copy and fill; keep one block per date or per change):

Last updated: YYYY-MM-DD

WSL distro + version:
- Command: wsl -l -v (Windows) or lsb_release -a (inside WSL).
- Record: e.g. Ubuntu 22.04.

Node + npm:
- Command: node -v && npm -v (in WSL or env where delegation runs).
- Record: e.g. v20.10.0, 10.2.0.

Codex:
- Command: codex --version (in WSL).
- Record: e.g. codex 0.x.x.

MCP codex-specialized-subagents:
- Command: codex mcp get codex-specialized-subagents (in WSL if applicable).
- Record: paste or summarize output; or "path: ...".

MCP server path / config:
- Where the server is configured (e.g. Cursor MCP settings, codex config path).
- Record: e.g. ~/.cursor/mcp.json or path to server binary.

Notes:
- If versions drift from this log and delegation breaks, add a new row with date and new versions; note "regression" in ai/memory/ISSUES.md and WORKLOG.

---
(Initial placeholder: fill on first run or when debugging. Delete this line once first block is added.)

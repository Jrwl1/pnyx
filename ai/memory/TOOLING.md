TOOLING.md — Setup Gotchas (MCP / delegation / skills)

WHAT IT DO? Setup gotchas for delegation and tooling: tool_timeout_sec placement, duplicate TOML tables, run directories sensitivity, skills recursion prevention (delegator_exclude).

tool_timeout_sec placement:
- Must be set where the tool/runtime actually reads it (server config, not only client). If timeout is in the wrong block or file, it is ignored.
- Check both MCP server config and any wrapper or runner config; prefer a single source of truth and document it here when resolved.

Duplicate TOML table issue:
- TOML does not allow the same table header to appear twice (e.g. two [mcp] or two [servers.something]). Merging or splitting config will fail silently or override.
- Use one [servers.<name>] per server; nest tool-specific options under that server’s table, or use a single [mcp] with all servers listed under it per your tool’s schema.

Run directories sensitivity:
- Run directories (where delegate_run / delegate_autopilot write outputs) are often path-sensitive. Relative vs absolute, and cwd, matter.
- Document the expected cwd and run dir for each runner; avoid assuming a fixed path without testing. Log run dir in WORKLOG when relevant.

Skills recursion prevention (delegator_exclude):
- When a skill or agent can invoke the delegator (or another agent that delegates back), recursion can occur. Use delegator_exclude (or equivalent) so the delegator is excluded from the list of callable tools/skills inside delegated runs.
- Document which skills/tools are excluded in your setup and add a note here when you change it.

Environment (record once per host / WSL distro):
- WSL distro + Ubuntu version: Record output of `wsl -l -v` (Windows) or `lsb_release -a` (inside WSL). Example: Ubuntu 22.04.
- node -v and npm -v: Record from inside WSL (or same env where delegation runs). Example: node v20.x, npm 10.x.
- codex --version (from WSL): Run `codex --version` in WSL and record here (delegation often runs in WSL).
- codex mcp get codex-specialized-subagents: Run `codex mcp get codex-specialized-subagents` (in WSL if that’s where MCP runs) and paste or summarize output here.
- MCP server path used: Path to the codex-specialized-subagents server or config entry (e.g. in Cursor MCP settings or codex config). Record so others can match the same server.

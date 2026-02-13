_mcp_smoke_test.md — MCP delegate_run smoke test artifact

WHAT IT DO? Records result of one-time MCP delegate_run smoke test for AI OS wiring verification.

Timestamp: 2026-02-13 (session date).

Tool run: delegate_run (mcp_codex-specialized-subagents_delegate_run).

Parameters: cwd=c:\Users\john\aios\Pnyx, task="Create a short artifact file named docs/_mcp_smoke_test.md that contains: timestamp, what tool ran, and any observed repo context.", sandbox=workspace-write.

Observed result:
- Invocation: tool call returned; run_dir was produced.
- Status: failed (codex exec exited with code 1).
- Run dir (on delegator host): /home/john/.codex/delegator/runs/2026-02-13_155923353_4c9853185dcd.
- Deliverables: 0 (subagent did not create the artifact in-repo).
- Repo context: Pnyx repo, AI OS doc-only; no package.json; no docs/ folder prior to this file.

This file was created in-repo by the verifying agent to document the smoke test outcome. To diagnose delegate_run failure, inspect run_dir artifacts: last_message.json, stderr.log, result.json.

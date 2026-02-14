DEBUGGING.md — Deterministic Debug Loop

WHAT IT DO? Reproduce → observe → isolate → fix → guard (regression) → prove → log. After 2 failures without new evidence: triage in WORKLOG + ISSUES.

Order:

Reproduce: exact steps/inputs/env. Capture exact error text.

Observe: logs/stack traces; locate file + line.

Isolate: smallest failing unit; bisect if needed.

Fix: minimal change.

Guard: add regression test if applicable.

Prove: rerun checks.

Log: WORKLOG entry with commit hash + evidence.

If 2 consecutive failures without new evidence:

Stop and write a triage note in WORKLOG + open an issue entry in ai/memory/ISSUES.md.

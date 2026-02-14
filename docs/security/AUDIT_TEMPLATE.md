# Security audit note

WHAT IT DO? Short template for the required security audit note when changing security-sensitive files. Fill and commit with your change.

- **Timestamp:** YYYY-MM-DD (or ISO datetime)
- **PR / Commit:** #123 or abc1234 (link or SHA)

## Files reviewed

List **every** security-sensitive file you changed. CI requires each changed sensitive path to appear literally here; missing paths cause a failure with a list of what to add.

- path/to/file1
- path/to/file2

## Context

- What changed (area / goal)?
- Why (ticket / one line)?

## Findings

- Any issues considered? (e.g. “No new secrets; validation already present.”)

## Evidence

- File + line or command output if relevant.

## Fix / mitigations

- What was done (or “N/A”)?

## Tests

- How was it tested or why no new tests?

## Verdict

Exactly one of these lines (no TODO, no "SHIP/NO-SHIP"):

- `Verdict: SHIP` — One-line rationale.
- `Verdict: NO-SHIP` — One-line rationale.

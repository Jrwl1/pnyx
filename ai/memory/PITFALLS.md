PITFALLS.md — Prevent Repeated Mistakes (prevention rules)

Entry template:
PIT-###: <title>

Symptom:

Root cause:

Detection:

Rule:

Example:

Seed:
PIT-001: Rule of Hooks violations

Symptom: Hook called conditionally/in loops.

Detection: lint + review.

Rule: Hooks only at top level; never conditional.

PIT-002: Unanchored proof

Symptom: "tests passed" with no command/output/hash.

Detection: WORKLOG missing evidence.

Rule: Proof must include command + summary + commit hash.

PIT-003: Sprint scope creep

Symptom: extra features not in sprint.

Detection: plan grows; unrelated files touched.

Rule: open change request or defer to TASKS; do not slip into sprint.

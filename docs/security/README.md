# Security audit process

WHAT IT DO? Explains when and how to add a security audit note so CI accepts changes to sensitive paths.

## When is an audit note required?

When you change any file that matches a pattern in **SENSITIVE_PATHS.md** (e.g. `.github/workflows/**`, `*.yml`, lock files, `.env*`, `Dockerfile*`), the same PR/push must include an audit note. The note must list **every** changed sensitive file under **Files reviewed:** and include a **Verdict:** line (see below).

## How to satisfy CI (strict)

1. **Audit file** — Include one of: `docs/_security_audit.md` or `docs/security/audit-<shortdesc>.md` in the same change.
2. **Files reviewed** — Under the `## Files reviewed` section, list **every** changed security-sensitive path (one per line, e.g. `- .github/workflows/foo.yml`). CI compares this list to the computed list of changed sensitive files; **any missing path** causes failure and CI prints the missing paths.
3. **Verdict** — Exactly one line: **`Verdict: SHIP`** or **`Verdict: NO-SHIP`**. No `TODO`, no `SHIP/NO-SHIP`, no other text. CI uses: `grep 'Verdict:'` then checks the trimmed line equals one of those two strings.

## One command when CI complains

When CI fails for a missing or incomplete audit note, run **"Generate audit note"** in Cursor. The **audit-note-generator** skill will create (or update) a stub in `docs/security/` that passes the CI gate. A reviewer (or the Security Auditor skill) should then fill in **Findings** and **Verdict**.

## What to add (manual alternative)

1. Add **one** of these files (and commit it in the same change):
   - `docs/_security_audit.md`
   - `docs/security/audit-<shortdesc>.md` (e.g. `audit-workflow-required.yml.md`)

2. Use **docs/security/AUDIT_TEMPLATE.md** and fill:
   - **Timestamp** and **PR / Commit**
   - **Files reviewed:** list **every** sensitive file you changed (CI requires all; missing paths are reported in the failure)
   - **Verdict:** exactly `Verdict: SHIP` or `Verdict: NO-SHIP` (no placeholder text)

## Policy file

**docs/security/SENSITIVE_PATHS.md** lists one pattern per line. The workflow matches changed files against these (exact basename, directory prefix `/**`, suffix `*.ext`, `.env*`). Only the workflow uses this file; you can extend it when adding new sensitive path patterns.

---
name: audit-note-generator
description: Generates or updates a security audit note stub when security-sensitive files change. Reads git diff, matches paths against docs/security/SENSITIVE_PATHS.md (same rules as CI), creates docs/security/audit-<date>-<shortdesc>.md or updates docs/_security_audit.md. Use when user says "generate audit note" or when editing files that match SENSITIVE_PATHS patterns.
---

# Audit note generator

WHAT IT DO? When a dev touches security-sensitive paths (per SENSITIVE_PATHS.md), generates or updates an audit note stub that passes the CI gate once the reviewer fills Findings and Verdict. Uses the same path-matching rules as .github/workflows/security-audit-required.yml.

## Steps (always follow)

1. **Get changed files**  
   Run (or equivalent):  
   `git diff --name-only` and `git diff --name-only --cached`  
   Merge and deduplicate to one list of changed paths (staged + unstaged).

2. **Load patterns**  
   Read **docs/security/SENSITIVE_PATHS.md**. Use only non-empty, non-comment lines (strip `#` lines and blanks; trim). These are the patterns.

3. **Match changed files to patterns (same logic as CI)**  
   For each changed path `f`, for each pattern `p`, treat as sensitive if any pattern matches. Matching rules (apply in order; first match wins):
   - **Dir prefix:** `p` ends with `/**`. Let `prefix = p` with `/**` removed. Match if `f == prefix` or `f` starts with `prefix/`.
   - **Suffix:** `p` starts with `*.` (e.g. `*.yml`). Let `suffix =` part after `*`. Match if `f` ends with `suffix`.
   - **.env:** `p` is `.env*` or starts with `.env` → match if basename of `f` starts with `.env` or `f` contains `/.env`.
   - **`**/.env*`:** `p` contains `/.env` → match if `f` contains `/.env` or basename starts with `.env`.
   - **Basename prefix*suffix:** `p` contains `*` (e.g. `Dockerfile*`, `docker-compose*.yml`). Split at first `*`: `prefix` before, `suffix` after. Match if basename of `f` starts with `prefix` and (if `suffix` non-empty) ends with `suffix`.
   - **Exact basename:** else match if basename of `f` equals `p`.

4. **If no sensitive files in the list**  
   Output: **"No audit needed."** Do not create or edit any file.

5. **If sensitive files were changed**  
   - **Choose target file:**
     - If **docs/_security_audit.md** is already in the changed files list (or already exists and you are updating it), write/update **docs/_security_audit.md**.
     - Otherwise create **docs/security/audit-&lt;yyyy-mm-dd&gt;-&lt;shortdesc&gt;.md** (e.g. `audit-2025-02-13-workflow.yml.md`). Use today’s date and a short description derived from the change (e.g. workflow, lockfile, env).
   - **Content:** Start from **docs/security/AUDIT_TEMPLATE.md**. Fill automatically:
     - **Timestamp:** ISO datetime (e.g. `2025-02-13T12:00:00Z`).
     - **PR / Commit:** placeholder e.g. `(PR # or commit SHA)`.
     - **Files reviewed:** list **every** changed sensitive file (all paths from step 3), one per line as `- path/to/file`. CI requires every changed sensitive path to appear literally; do not omit any.
     - **Verdict:** use exactly one line: **`Verdict: NO-SHIP`** (default; safer until reviewer approves). Add a short note above it: e.g. "Flip to SHIP after review." Reviewer replaces with `Verdict: SHIP` when appropriate. CI accepts only `Verdict: SHIP` or `Verdict: NO-SHIP`—no TODO, no SHIP/NO-SHIP.
     - **Findings:** placeholder bullets e.g. `- (reviewer to fill)`.
   - Keep other sections (Context, Evidence, Fix, Tests) as placeholders from the template. Include **WHAT IT DO?** at the top (one line describing this audit).

## CI compatibility (must match)

- **Verdict:** Exactly one line: `Verdict: SHIP` or `Verdict: NO-SHIP`. Nothing else (no TODO, no "SHIP/NO-SHIP").
- **Files reviewed:** The section from `Files reviewed:` to the next `##` must contain **every** changed sensitive path as literal text. CI fails and lists missing paths if any are omitted.

## Conventions

- Never invent paths. **Files reviewed:** must list only paths that (1) were in the merged changed-files list and (2) matched a pattern in SENSITIVE_PATHS.md.
- Always read the current SENSITIVE_PATHS.md and the current AUDIT_TEMPLATE.md from the repo; do not assume pattern or template content.

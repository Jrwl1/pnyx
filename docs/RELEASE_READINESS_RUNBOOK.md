# Release readiness runbook

WHAT IT DO? Operational checklist for releasing the current V1 service: environment validation, migration policy, proof commands, and security-audit compliance.

## 1) Preconditions

- Working tree is clean before release prep (`git status --short`).
- Latest roadmap sprint status and worklog evidence are committed.
- Required secrets and env vars are available for the target environment.

## 2) Environment checklist

Core runtime:
- `DB_PATH` (SQLite path)
- `JWT_SECRET` (used by `POST /auth/token` and bearer verification)
- `AUTH_CODE_SECRET` (used by launch email-code auth hashing)
- `AUTH_EMAIL_PROVIDER` (for example `inline` in rehearsal, provider-backed value in real deploys)
- `AUTH_EMAIL_FROM` (required when the selected email provider sends real mail)
- `PORT` (optional, default `3000`)

Frontend/dev proxy:
- `VITE_BACKEND_URL` (used by Vite dev proxy for `/api/*`)
- `VITE_API_BASE` (optional absolute frontend API base for non-proxy environments)

Rate-limit tuning (optional, defaults in `src/server.ts`):
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_GLOBAL_MAX`
- `RATE_LIMIT_LOGIN_MAX`
- `RATE_LIMIT_REGISTER_MAX`
- `RATE_LIMIT_POLITICIAN_PROPOSAL_MAX`
- `RATE_LIMIT_POLITICIAN_CREATE_MAX`
- `RATE_LIMIT_PROPOSAL_CLAIM_MAX`
- `RATE_LIMIT_PROPOSAL_REVIEW_MAX`
- `RATE_LIMIT_PROPOSAL_ASSIST_MAX`
- `RATE_LIMIT_ADD_STATEMENT_MAX`
- `RATE_LIMIT_VOTE_MAX`

Abuse-hardening/captcha tuning:
- `CAPTCHA_ENFORCE_REGISTER`
- `CAPTCHA_ENFORCE_PROPOSAL_SUBMIT`
- `CAPTCHA_STATIC_TOKEN`
- `DUPLICATE_ASSIST_FUZZY_LIMIT`
- `DUPLICATE_ASSIST_FUZZY_MIN_SCORE`

## 3) Migration procedure

Apply migrations:

```bash
pnpm migrate
```

Policy:
- Migrations are forward-only in-repo (`src/db/migrate.ts` + `schema_migrations`).
- No down-migration files are maintained in V1.

Rollback strategy:
- Primary rollback is restore-from-backup of SQLite database file.
- If backup restore is not needed, prefer forward-fix migration and redeploy.

## 4) Proof command chain

Run full release proof before publish/deploy:

```bash
pnpm proof:launch
```

Optional focused checks before full run:

```bash
pnpm test -- -t "role matrix"
pnpm test -- -t "proposal review race"
pnpm test -- -t "read surfaces"
pnpm test -- -t "trust records"
pnpm test -- -t "search"
```

Route/browser proof after the command chain:

```bash
chrome-devtools or playwright verification of /, /politicians, /politicians/:id, /parties, /parties/:id, /promises/:id, /methodology, /register, /sign-in, /contribute/**, /ops, and /ops/claims
```

Smoke rehearsal after the server is up:

```bash
SMOKE_BASE_URL=http://127.0.0.1:3000 pnpm smoke:release
```

## 4.1 Manual release rehearsal

Run from repo root:

```bash
pnpm proof:launch
PORT=3001 DB_PATH=/tmp/pnyx-release.db AUTH_EMAIL_PROVIDER=inline pnpm exec tsx src/index.ts
SMOKE_BASE_URL=http://127.0.0.1:3001 pnpm smoke:release
```

Windows PowerShell example:

```powershell
$env:PORT='3001'
$env:DB_PATH="$env:TEMP\\pnyx-release.db"
$env:AUTH_EMAIL_PROVIDER='inline'
Start-Process powershell -ArgumentList '-NoProfile','-Command','Set-Location "C:\\path\\to\\Pnyx"; pnpm exec tsx src/index.ts'
$env:SMOKE_BASE_URL='http://127.0.0.1:3001'
pnpm smoke:release
```

## 5) Security-audit requirement for sensitive file changes

When changing security-sensitive paths (for example `.github/workflows/**`, `*.yml`, lockfiles, `.env*`), include an audit note in the same change:

- `docs/_security_audit.md`, or
- `docs/security/audit-<shortdesc>.md`

Audit note requirements:
- include `Files reviewed:` section listing every changed sensitive file path literally
- include exact verdict line: `Verdict: SHIP` or `Verdict: NO-SHIP`

References:
- `docs/security/README.md`
- `docs/security/SENSITIVE_PATHS.md`
- `docs/security/AUDIT_TEMPLATE.md`

## 6) Release evidence to record

- Commit hash of release-prep changes.
- `pnpm proof:launch` output summary.
- `pnpm smoke:release` output summary.
- Browser/accessibility verification summary, including any Lighthouse accessibility score used for release evidence.
- Any risk notes or deferred non-P0/P1 items.
- Worklog entry with command list and commit anchors.

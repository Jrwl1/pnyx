# WHAT IT DO? Implementation-first gap closure plan for S0.

## Priority order (smallest batches first)

1. **S0-T04** — Edit policy: `PATCH /statements/:id`, 30min window, audit row. Test: `edit window and audit`.
2. **S0-T05** — Verification: add targeted tests for existing route; enforce transitions, downgrade reason.
3. **S0-T06** — Voting: add targeted tests for existing route; anonymous 403, overwrite, aggregate.
4. **S0-T08** — Revision history: `GET /statements/:id/revisions`. Test: `revision history`.
5. **S0-T07** — Withdraw + list visibility: `POST /statements/:id/withdraw`, query params for includeDeleted/includePendingDelete.
6. **S0-T09** — Detail + aggregates: `GET /statements/:id`, `GET /politicians/:id` with statements. Test: `read surfaces`.
7. **S0-T10** — Rate limits: middleware for login/register/add-statement/vote/global. Test: `rate limit 429`.

## Preconditions
- **better-sqlite3**: Resolve native bindings (`pnpm approve-builds` + select better-sqlite3, or node-gyp rebuild).
- **Tests**: Run `pnpm test -- -t "<pattern>"` after each batch.

## Evidence
Each step: implement → prove → WORKLOG + commit per COMMIT_PROTOCOL.

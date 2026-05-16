# WHAT IT DO? Sprint S0 task → code/test mapping; complete vs missing.

| Task | Routes/Code | Tests | Status |
|------|-------------|-------|--------|
| S0-T01 | `src/server.ts`, `src/auth/*`, `migrations/0001_initial.sql` | — | ✅ Done |
| S0-T02 | `POST /politicians`, `GET /politicians` | `test/politician-dedupe.test.ts` | ✅ Done |
| S0-T03 | `POST /statements`, `GET /statements` | `test/statement-capture.test.ts` | ✅ Done |
| S0-T04 | — | — | ❌ Missing: `PATCH /statements/:id`, edit window, audit |
| S0-T05 | `PATCH /statements/:id/verification` | — | ⚠️ Partial: route exists, no targeted tests |
| S0-T06 | `POST /statements/:id/votes` | — | ⚠️ Partial: route exists, no targeted tests |
| S0-T07 | `POST .../pending-delete`, `POST .../approve-delete` | — | ❌ Missing: withdraw (author), list visibility |
| S0-T08 | — | — | ❌ Missing: `GET /statements/:id/revisions` |
| S0-T09 | `GET /politicians`, `GET /statements` | — | ❌ Missing: detail endpoints, aggregates, history ref |
| S0-T10 | — | — | ❌ Missing: rate limits, 429 responses |
| S0-T11 | — | — | Pending: full proof once tests unblocked |
| S0-T12 | — | — | Pending: review gate |

## Missing endpoints
- `PATCH /statements/:id` (edit body/sourceUrl/dateSaid)
- `POST /statements/:id/withdraw` (author soft-delete)
- `GET /statements/:id` (detail + verification + aggregate + history)
- `GET /statements/:id/revisions` (revision history)
- Rate-limit middleware

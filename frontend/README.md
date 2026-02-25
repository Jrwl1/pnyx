WHAT IT DO? Quick start and route map for the citizen-first PNYX V3 frontend app.

# PNYX Frontend V3

## Run locally

1. Start backend service in one terminal:

```bash
pnpm dev
```

2. Start frontend app in another terminal:

```bash
pnpm frontend:dev
```

The frontend dev server proxies `/api/*` to `http://localhost:3000` by default.

## Implemented routes

- `/`
- `/politicians`
- `/politicians/:id`
- `/promises/:id`
- `/methodology`
- `/ops` (internal placeholder, excluded from public nav)

## Data honesty defaults

- Fulfillment and vote alignment render as `Unknown` when backend fields are missing.
- Community support/oppose is displayed as sentiment only, not politician roll-call voting.

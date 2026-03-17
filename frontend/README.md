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
Override the proxy target with `VITE_BACKEND_URL` when you need a different backend port in development.

## Implemented routes

- `/`
- `/register`
- `/sign-in`
- `/politicians`
- `/politicians/:id`
- `/parties`
- `/parties/:id`
- `/promises/:id`
- `/methodology`
- `/contribute/politicians/new`
- `/contribute/statements/new`
- `/contribute/promises/new`
- `/ops`
- `/ops/claims`

## Data honesty defaults

- Fulfillment and vote alignment render as `Unknown` when backend fields are missing.
- Community support/oppose is displayed as sentiment only, not politician roll-call voting.
- Party-line status renders only from explicit party-alignment assessments; no stance match is inferred from branding or rhetoric.
- Home and directory search suggestions are backend-backed and can surface politicians, parties, canonical promises, and trust-era topics.

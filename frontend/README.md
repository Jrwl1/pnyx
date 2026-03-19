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

## Launch proof helpers

- `pnpm seed:launch-rehearsal` loads the seeded launch-candidate dataset into the configured `DB_PATH`.
- `pnpm launch:coverage` asserts the seeded launch-candidate coverage counts against the configured `DB_PATH`.
- `pnpm test:ui` runs the dependency-backed Playwright browser suite.
- `pnpm proof:postlaunch` runs the widened post-launch proof chain.
- `pnpm proof:launch` remains as a compatibility alias to `pnpm proof:postlaunch`.
- `pnpm smoke:release` runs live smoke checks against a running backend using `SMOKE_BASE_URL`.
- `pnpm ingest:run <sourceKey>` replays one supported official-source import from the CLI.

## Implemented routes

- `/`
- `/register`
- `/sign-in`
- `/politicians`
- `/politicians/:id`
- `/parties`
- `/parties/:id`
- `/claims/:id`
- `/promises/:id`
- `/methodology`
- `/contribute/politicians/new`
- `/contribute/statements/new`
- `/contribute/promises/new`
- `/ops`
- `/ops/imports`
- `/ops/records`
- `/ops/claims`

## Data honesty defaults

- Fulfillment and vote alignment render as `Unknown` when backend fields are missing.
- Community support/oppose is displayed as sentiment only, not politician roll-call voting.
- Party-line status renders only from explicit party-alignment assessments; no stance match is inferred from branding or rhetoric.
- Home and directory search suggestions are backend-backed and can surface politicians, parties, canonical promises, and trust-era topics.
- Protected operator surfaces now include notifications, official imports, and reputation-backed moderation queues on top of the launch baseline.

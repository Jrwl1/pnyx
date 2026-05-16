# Suggested commands

Windows shell is PowerShell. Prefer `rg` / `rg --files` for search. Use `Get-Content`, `Get-ChildItem`, and `git status --porcelain` for local inspection.

Install/development:
- `pnpm install`
- `pnpm dev` - backend dev server via `tsx watch src/index.ts`
- `pnpm frontend:dev` - Vite frontend dev server
- `pnpm bootstrap:local-admin` - local admin bootstrap helper
- `pnpm migrate` - run migrations
- `pnpm ingest:run` - run ingest CLI

Verification:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm frontend:typecheck`
- `pnpm frontend:build`
- `pnpm test:ui`
- `pnpm proof:postlaunch` / `pnpm proof:launch` - full post-launch proof chain
- `pnpm seed:launch-rehearsal`
- `pnpm launch:coverage`
- `SMOKE_BASE_URL=http://127.0.0.1:<port> pnpm smoke:release`
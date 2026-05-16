# Task completion checklist

For ordinary code changes, use the narrowest relevant verification first, then broaden based on risk. Common checks are `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm frontend:typecheck`, `pnpm frontend:build`, and `pnpm test:ui` for browser/UI changes.

For release/post-launch proof, the canonical regression floor from docs is:
- `pnpm seed:launch-rehearsal`
- `pnpm launch:coverage`
- `pnpm proof:postlaunch` (alias: `pnpm proof:launch`)
- `pnpm smoke:release` against a live backend via `SMOKE_BASE_URL`

When using repo protocols:
- Follow `AGENTS.md` exactly.
- DO requires product and docs commits per packet and evidence lines in `docs/SPRINT.md`.
- REVIEW pass requires a docs-only `review: evidence update` commit.
- End protocol packet boundaries with a clean working tree under `git status --porcelain`, ignoring only documented scratch exemptions.
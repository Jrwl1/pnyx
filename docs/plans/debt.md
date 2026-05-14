# Debt tracker

Last checked: 2026-05-14

## Current known debt

- `src/server.ts` is large and high-risk. Refactor only when touching related areas and after tests exist.
- Page readiness is not yet implemented as first-class product state.
- Comment/discussion schema and moderation paths do not exist yet.
- Current plus previous-term Finnish national/EU data coverage is incomplete.
- Harness docs need stronger mechanical checks beyond the first `docs:check`.
- Generated API/schema references are not yet produced under `docs/generated/`.

## Resolved by harness migration

- Old mode-command protocol files are no longer active instructions.
- The temporary post-launch plan is archived because M8 shipped.
- Product and milestone truth now have focused docs instead of requiring agents to infer from old sprint rows.

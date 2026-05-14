# Harness checks

Last checked: 2026-05-14

The markdown harness should be mechanically checkable. The first check is intentionally small and can grow with the repo.

## Required checks

Run:

```bash
pnpm docs:check
```

The check verifies:

- required harness docs exist;
- active docs do not reintroduce retired mode commands;
- `docs/index.md` links to core truth files;
- archived protocol docs are not treated as active entry points.

## Future checks

Add checks for:

- stale `Last checked` dates;
- dead markdown links;
- generated schema/API reference freshness;
- frontend design workflow references;
- doc ownership metadata;
- code/docs drift for routes and package scripts.

## Maintenance rule

When an agent discovers recurring confusion, promote the fix into one of:

- a truth doc;
- a quality check;
- a test;
- a lint rule;
- an architecture decision.

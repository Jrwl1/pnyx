# Frontend workflow

Last checked: 2026-05-14

## Required skills

- Use `impeccable` for page design, redesign, critique, audit, polish, and UI-shaping work.
- Use `uncodixfy` whenever editing frontend UI code: HTML, CSS, React, route components, layout components, and shared UI components.

## Product design bar

Pnyx is a public accountability product, not a generic dashboard. Interfaces should be dense enough for real civic data, but clear enough for normal visitors.

Design should prioritize:

- source clarity;
- honest unknown states;
- readable provenance;
- efficient moderation;
- public trust;
- accessibility;
- responsiveness under real data volume.

Avoid:

- decorative gradients or generic dark SaaS treatment;
- over-rounded cards and pills;
- fake metrics;
- hero sections inside product workflows;
- ornamental copy;
- comment UI that looks like verified evidence;
- page layouts that only work with tiny fixtures.

## Current frontend routes

See `docs/architecture/api-and-data.md` for route truth.

## Verification

For meaningful UI changes, run:

- `pnpm frontend:typecheck`
- `pnpm frontend:build`
- `pnpm test:ui` when route behavior or browser-visible UI changes

Use browser verification for important page or workflow changes, especially politician, party, promise, contribution, moderation, notification, and ingest surfaces.

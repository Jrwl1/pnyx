# Architecture truth

Last checked: 2026-05-14

## Overview

Pnyx is a TypeScript service with an Express backend, SQLite persistence, Vite/React frontend, and Playwright/Vitest proof.

## Backend boundaries

- `src/index.ts`: server entry point.
- `src/server.ts`: Express app and route wiring. This file is large and should be treated carefully.
- `src/auth/**`: auth context, JWT, email-code login, role guards.
- `src/db/**`: domain persistence helpers.
- `src/ingest/**`: official-source ingest adapters, CLI, normalization, apply/reject flow.
- `src/dev/**`: local bootstrap helpers.
- `migrations/**`: forward-only SQLite schema changes.

## Frontend boundaries

- `frontend/src/App.tsx`: route table and protected-route composition.
- `frontend/src/routes/**`: page-level route components.
- `frontend/src/components/**`: shared UI primitives.
- `frontend/src/context/**`: auth and public data providers.
- `frontend/src/lib/**`: API client, formatting, domain helpers.
- `frontend/scripts/generate-seo-artifacts.mjs`: sitemap/robots generation.

## Domain boundaries

Keep these separated:

- canonical facts;
- raw user submissions;
- moderation decisions;
- comments/discussion;
- product events;
- notifications;
- contributor reputation;
- official ingest raw records and stage items.

This separation is part of the product trust model.

## Architecture risks

- `src/server.ts` is high-value and high-risk because many domains meet there.
- Page-readiness work should avoid turning public UI into a fabricated completeness layer.
- Discussion/comment work must not share write paths with canonical fact updates.
- Ingest work must preserve raw provenance and idempotency.

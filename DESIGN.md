# PNYX Design Context

Last checked: 2026-05-16

## Design Register

Product UI. Design serves civic reading, contribution, and moderation workflows.

## Current Visual System

The current frontend uses a civic editorial palette and typography:

- display: `Fraunces`;
- body: `Source Sans 3`;
- mono/status/meta: `IBM Plex Mono`;
- page background: warm civic paper;
- surface: white;
- primary ink: deep blue;
- muted ink: slate blue;
- civic accent: blue;
- secondary accent: amber;
- semantic status colors for fulfilled, broken, in progress, and unknown.

Current CSS tokens live in `frontend/src/styles.css`:

- `--bg-page`
- `--bg-surface`
- `--ink-strong`
- `--ink-muted`
- `--accent-civic`
- `--accent-civic-soft`
- `--accent-amber`
- `--accent-amber-soft`
- `--status-fulfilled`
- `--status-broken`
- `--status-progress`
- `--status-unknown`
- `--line-subtle`
- `--shadow-soft`
- spacing tokens `--space-1` through `--space-4`

## Interface Principles

- Public pages should be readable for normal visitors and dense enough for real civic data.
- Moderation and ops pages should prioritize scanning, queue work, review status, and low-friction decisions.
- Readiness, provenance, and missing-data states should be first-class content, not decorative badges.
- Discussion UI must look like public context, not verified evidence.
- Canonical facts and comments should never share visual treatment that implies equal authority.

## Layout Rules

- Use predictable page sections with constrained inner content.
- Cards are acceptable for repeated records, forms, queue items, and contained panels. Avoid nested card piles.
- Keep radius restrained. Prefer 8px for new components unless matching a legacy component requires otherwise.
- Avoid hero sections inside product workflows unless they carry the primary page identity.
- Page sections should support real data density and not rely on tiny fixtures.
- On mobile, grids must collapse without horizontal overflow and controls must remain tappable.

## Typography Rules

- Keep body copy direct and capped where possible.
- Use heading scale sparingly inside dense panels.
- Use mono type for metadata, timestamps, source notes, and compact status context.
- Do not use viewport-scaled type inside compact UI controls.

## Color Rules

- Use existing tokens first.
- Use status colors only for status.
- Avoid decorative gradients, gradient text, glassmorphism, and ornamental glows.
- Do not make comments or discussion visually louder than canonical facts, readiness, or source provenance.

## Component Rules

- Buttons use existing `button`, `button-primary`, `button-secondary`, and `button-link` classes.
- Forms use explicit labels above inputs.
- Tables and dense lists should be left-aligned and scannable.
- Status chips should be small and functional.
- Readiness states should expose source count, freshness, provenance, and missing-data reasons together.
- Comment report and moderation actions should be explicit and reversible where the backend supports it.

## Anti-Patterns To Avoid

- generic SaaS hero panels;
- decorative copy that restates the heading;
- metric-card grids used as filler;
- fake charts or fake confidence indicators;
- side-stripe borders used as decoration;
- rounded pill overload;
- hard-to-scan moderation queues;
- UI that hides missing data;
- comment UI that looks like canonical evidence.

## Browser Verification Bar

Before considering frontend work complete, verify the changed surfaces in a browser across desktop and mobile widths. Check console errors, network failures, overflow, keyboard/focus states where practical, broken CTAs, stale copy, and source/provenance clarity.

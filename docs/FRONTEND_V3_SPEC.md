# WHAT IT DO? Concrete implementation spec for a citizen-first V3 frontend so the next agent builds the right product (politician accountability), not a moderator operations dashboard.

# Frontend V3 Implementation Spec

Status: Ready for handoff to implementation agent
Date: 2026-02-25

## 1) Product truth (non-negotiable)

Primary job of the UI:
- Help any user find any politician.
- Show what that politician promised over time.
- Show whether their voting record supported or contradicted those promises.
- Show whether each promise appears fulfilled, broken, in progress, or unknown.

Primary audience:
- Public users (anonymous first, authenticated optional).

Explicit anti-goals for primary UI:
- No moderator-ops-first language (no "triage", "queue ladder", "control room" in main navigation).
- No operations cockpit layout as the homepage.
- No fake precision or invented accountability data.

## 2) Information architecture and routes

Top-level public routes (must exist):

| Route | Page | Purpose |
|---|---|---|
| `/` | Home | Search + discover politicians, explain how to read data |
| `/politicians` | Directory | Browse/filter politicians |
| `/politicians/:id` | Politician profile | Promise timeline, vote alignment, fulfillment scorecard |
| `/promises/:id` | Promise detail | Single promise, evidence, alignment, fulfillment history |
| `/methodology` | Methodology | Explain scoring/status logic and evidence standards |

Optional route (not in public top nav):

| Route | Page | Purpose |
|---|---|---|
| `/ops` | Moderation operations | Internal moderation surfaces only |

Public top nav labels (exact):
- Home
- Politicians
- Methodology

## 3) Page-level specifications

## 3.1 Home (`/`)

Required sections (top to bottom):
1. Search bar (primary CTA): "Search politician, office, or state"
2. Quick issue filters (Economy, Healthcare, Climate, Education, Public Safety)
3. "How this works" (3 bullets max): promises, votes, fulfillment
4. "Most viewed politicians" cards

No-go items on home:
- No proposal queue counters
- No moderator session badges
- No audit stream as hero content

## 3.2 Politician directory (`/politicians`)

Required controls:
- Search input
- Filters: state/region, office, party (if available), issue
- Sort: Most promises, Fulfillment rate, Most viewed, Recently updated

Required list row/card fields:
- Politician name
- Office + region
- Promise counts: fulfilled, broken, in progress, unknown
- Fulfillment ratio (fulfilled / total promises)
- Last updated timestamp

## 3.3 Politician profile (`/politicians/:id`)

Hero section:
- Name, office, region
- Short identity metadata (external id if available)

Scorecards (required):
- Total promises tracked
- Fulfilled
- Broken
- In progress
- Unknown
- Vote alignment summary (aligned/contradicted/mixed/unknown)

Main body tabs (required):
1. Promises
2. Voting record vs promises
3. Evidence timeline

Promises tab table/list columns (required):
- Promise statement
- Date promised
- Current fulfillment status
- Vote alignment status
- Evidence count
- Link to detail

## 3.4 Promise detail (`/promises/:id`)

Required blocks:
1. Promise claim (full text + date + source)
2. Fulfillment verdict block
   - one of: Fulfilled, Broken, In progress, Unknown
   - short explanation + latest evidence date
3. Vote alignment block
   - one of: Supported by votes, Contradicted by votes, Mixed, Unknown
   - list key vote events with dates and links
4. Evidence list (source links, newest first)
5. Revision/audit history (collapsible)
6. Community confidence (support/oppose aggregate if present)

## 3.5 Methodology (`/methodology`)

Must include:
- Definitions for fulfillment statuses
- Definitions for vote-alignment statuses
- Evidence quality rules
- Handling for missing data and uncertainty
- Change log / update cadence

## 4) Data contract mapping and honesty rules

## 4.1 Existing backend endpoints to use now

Available in current implementation:
- `GET /politicians`
- `GET /statements`
- `GET /statements/:id`
- `GET /statements/:id/revisions`
- `POST /statements/:id/votes`

Current semantics to reuse:
- Promise entity maps to statement entity.
- `verificationStatus` is evidence confidence status, not fulfillment.
- `aggregate.support/oppose` is community voting sentiment, not politician roll-call voting.

## 4.2 Required V3 data model for true accountability UX

UI should be implemented around these domain fields (even if temporarily unavailable):

```ts
type FulfillmentStatus = "fulfilled" | "broken" | "in_progress" | "unknown";
type AlignmentStatus = "aligned" | "contradicted" | "mixed" | "unknown";

interface PromiseRecord {
  id: number;
  politicianId: number;
  promiseText: string;
  datePromised: string;
  fulfillmentStatus: FulfillmentStatus;
  fulfillmentSummary: string;
  voteAlignment: AlignmentStatus;
  evidenceCount: number;
}
```

## 4.3 Missing-data behavior (mandatory)

If fulfillment or vote-alignment data is missing from backend:
- Show `Unknown` with explicit label: "Data not yet available".
- Never infer fulfillment from `verificationStatus`.
- Never infer politician vote alignment from community support/oppose aggregates.

## 5) Visual design system (non-generic)

## 5.1 Typography

Font stack:
- Headings: `Fraunces`, serif
- Body/UI: `Source Sans 3`, sans-serif
- Data labels/ids: `IBM Plex Mono`, monospace

Type scale:
- H1: 48/54 semibold
- H2: 34/40 semibold
- H3: 26/32 semibold
- Body: 18/28 regular
- Secondary/meta: 14/20 medium

## 5.2 Color tokens

Use semantic, civic editorial palette:

```css
:root {
  --bg-page: #f4f1ea;
  --bg-surface: #ffffff;
  --ink-strong: #1f2a44;
  --ink-muted: #4f5d78;
  --accent-civic: #1f5fbf;
  --accent-civic-soft: #dfe9fb;

  --status-fulfilled: #2f7a4d;
  --status-broken: #b13a2f;
  --status-progress: #a36c00;
  --status-unknown: #6b7280;
}
```

Do not use neon gradient progress bars for core truth labels.

## 5.3 Layout and density

- 12-column desktop grid, 8pt spacing system.
- Max content width: 1200px.
- Card radius: 12px, not pill-heavy chrome.
- Visual emphasis on content (claims/evidence), not containers.

## 5.4 Motion

- Subtle only: 120-180ms ease transitions.
- No constant glow effects.
- Animate list/filter transitions, not entire page backgrounds.

## 6) Copy and language rules

Use plain accountability language.

Preferred terms:
- Promise
- Evidence
- Voting record
- Fulfillment
- Unknown / Not enough evidence

Avoid on public pages:
- Triage
- Queue ladder
- Control room
- Conflict controls
- reviewVersion jargon

## 7) Accessibility and responsive requirements

Accessibility:
- Minimum contrast 4.5:1 for body text.
- Full keyboard navigation across search, filters, tabs, and tables.
- Focus styles always visible.
- Screen-reader labels for status chips and charts.

Responsive behavior:
- Mobile first: 360px baseline.
- At <768px, scorecards stack vertically.
- Promise table becomes card list with same fields.
- Search and filters remain usable with sticky top controls.

## 8) Implementation acceptance checklist

A V3 implementation passes only if all are true:

- [ ] Public nav is Home / Politicians / Methodology (no ops-first labels).
- [ ] Home page primary CTA is politician search.
- [ ] Politician profile surfaces promises, vote alignment, and fulfillment summary.
- [ ] Promise detail contains claim, alignment, fulfillment, evidence, and revision history.
- [ ] Missing backend fields are shown as explicit unknown states, not fabricated values.
- [ ] Public pages avoid moderator jargon.
- [ ] Desktop and mobile layouts both pass manual QA.
- [ ] Accessibility checks pass for keyboard and contrast.

## 9) Delivery plan for next agent

Recommended build order:
1. Build route shell and public nav.
2. Implement Home and Politicians directory.
3. Implement Politician profile with scorecards and promises list.
4. Implement Promise detail with evidence and history.
5. Implement Methodology page.
6. Apply design tokens and responsive polish.
7. Run accessibility and content-language QA pass.

Hand-off note:
- If backend fields for vote-alignment and fulfillment are unavailable, ship transparent unknown states first and open a backend follow-up task instead of faking these values.

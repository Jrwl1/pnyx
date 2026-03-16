# WHAT IT DO? Concrete implementation spec for the Finland-first public frontend so the next agent builds the right citizen-facing product, including party context, not a moderator dashboard.

# Frontend Public Discovery Spec

Status: Ready for handoff to implementation agent
Date: 2026-03-17

## 1) Product truth (non-negotiable)

Primary job of the UI:
- Help any user find a Finnish politician or political party.
- Show what that politician promised over time.
- Show what a party's official stance is on key issues.
- Show whether a politician's voting record supported or contradicted their promises when vote data exists.
- Show whether each promise appears fulfilled, broken, in progress, or unknown.
- Show where a politician aligns with or breaks from party stance when mapped party stance data exists.

Primary audience:
- Public users (anonymous first, authenticated optional), starting with Finnish citizens.

Launch boundary:
- Public launch is Finland-first only.
- Copy, placeholders, example content, filters, and page structure should assume Finnish political context.
- Cross-country expansion is explicitly deferred.

Explicit anti-goals for primary UI:
- No moderator-ops-first language (no "triage", "queue ladder", "control room" in main navigation).
- No operations cockpit layout as the homepage.
- No fake precision or invented accountability data.
- No public leaderboards/rankings as a primary discovery mechanic at launch.

## 2) Information architecture and routes

Top-level public routes (must exist):

| Route | Page | Purpose |
|---|---|---|
| `/` | Home | Search + discover politicians and parties, explain how to read data |
| `/politicians` | Politician directory | Browse/filter Finnish politicians |
| `/politicians/:id` | Politician profile | Promise timeline, fulfillment scorecard, vote alignment, party-line context |
| `/parties` | Party directory | Browse Finnish political parties and stance coverage |
| `/parties/:id` | Party profile | Official party stances, member politicians, party-line context |
| `/promises/:id` | Promise detail | Single promise, fulfillment, vote alignment, evidence, party stance comparison |
| `/methodology` | Methodology | Explain fulfillment/vote-alignment logic, evidence standards, party context, and uncertainty |

Optional route (not in public top nav):

| Route | Page | Purpose |
|---|---|---|
| `/ops` | Moderation operations | Internal moderation surfaces only |

Public top nav labels (exact):
- Home
- Politicians
- Parties
- Methodology

## 3) Page-level specifications

## 3.1 Home (`/`)

Priority:
- This is the most important page in the product.
- The soul of the page is "find a politician."

Required sections (top to bottom):
1. Search bar (primary CTA): search for a politician or party by name, office, constituency, or party.
2. Quick discovery chips:
   - issue chips
   - party chips or party shortcuts
3. "How this works" (3 bullets max): promises, party stances, evidence/unknowns
4. Recently documented politicians
5. Latest party stances or featured parties
6. "What PNYX is / is not" trust section
7. Methodology callout

No-go items on home:
- No proposal queue counters
- No moderator session badges
- No audit stream as hero content
- No leaderboard or ranking module as the main attraction

Landing-page requirements:
- Primary CTA must remain search.
- Hero copy should establish public-interest credibility quickly.
- The page must explain that party stance and politician stance are separate concepts.
- Unknown data should be framed as transparency, not failure.

## 3.2 Politician directory (`/politicians`)

Required controls:
- Search input
- Filters: constituency/region, office, party, issue
- Sort: Most promises, Fulfillment rate, Recently updated

Allowed but secondary:
- "Most viewed" only if real data exists

Required list row/card fields:
- Politician name
- Office + constituency/region
- Party affiliation
- Promise counts: fulfilled, broken, in progress, unknown
- Fulfillment ratio (fulfilled / total promises) when available; otherwise explicit Unknown
- Last updated timestamp

## 3.3 Politician profile (`/politicians/:id`)

Hero section:
- Name, office, constituency/region
- Party affiliation linked to party profile
- Short identity metadata (external id if available)

Scorecards (required):
- Total promises tracked
- Fulfilled
- Broken
- In progress
- Unknown
- Vote alignment summary (aligned/contradicted/mixed/unknown)

Required contextual section:
- Party-line alignment
  - show party affiliation
  - show whether mapped promises/votes align with or break from party stance
  - if no mapped party stance exists, show explicit unknown / not yet available state

Main body tabs (required):
1. Promises
2. Voting record
3. Evidence

Promises tab table/list columns (required):
- Promise statement
- Date promised
- Current fulfillment status
- Vote alignment status
- Evidence count
- Link to detail

## 3.4 Party directory (`/parties`)

Required purpose:
- Make party pages first-class, not buried add-ons.

Required content:
- List of Finnish political parties in scope
- Party name + short name
- Short descriptive line
- Stance coverage count or explicit Unknown if not available
- Member count on PNYX or explicit Unknown if not available
- Link to party profile

Required page behavior:
- Must feel public-facing and editorial, not like internal taxonomy management.
- Should support quick understanding of which parties have stance coverage and which do not.

## 3.5 Party profile (`/parties/:id`)

Hero section:
- Party name
- Short name
- Finland-first context line

Required summary cards:
- Official stances tracked
- Members on PNYX
- Party-line alignment summary or Unknown

Required main content:
1. Official party stances
2. Member politicians
3. Party-line alignment context

Required stance-card fields:
- Stance text
- Issue/topic
- Date/source
- Link to source or stance detail if present

Required member-list fields:
- Politician name
- Office/constituency
- Linked profile
- Party-line alignment summary if available, otherwise Unknown

## 3.6 Promise detail (`/promises/:id`)

Required blocks:
1. Promise claim (full text + date + source)
2. Fulfillment verdict block
   - one of: Fulfilled, Broken, In progress, Unknown
   - short explanation + latest evidence date
3. Vote alignment block
   - one of: Supported by votes, Contradicted by votes, Mixed, Unknown
   - list key vote events with dates and links
4. Party stance comparison block
   - linked party
   - official party stance text when available
   - whether the promise aligns with / contradicts / is unmapped against party stance
   - if no official party stance is recorded, show explicit "No party stance recorded" or Unknown state
5. Evidence list (source links, newest first)
6. Revision/audit history (collapsible)
7. Community confidence (support/oppose aggregate if present)

## 3.7 Methodology (`/methodology`)

Must include:
- Definitions for fulfillment statuses
- Definitions for vote-alignment statuses
- Definitions for party stance and party-line alignment
- Evidence quality rules
- Handling for missing data and uncertainty
- Change log / update cadence

Must not include:
- Any claim that party context is out of scope
- Any wording that collapses party stance into politician stance

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

## 4.2 Planned public-surface additions for Finland-first party scope

The frontend IA must leave room for these product-scope additions even if backend support is not yet implemented:
- canonical parties
- party memberships
- party stance records
- politician-vs-party alignment surfaces

## 4.3 Required V3/V4 domain model for public accountability UX

UI should be implemented around these domain fields (even if temporarily unavailable):

```ts
type FulfillmentStatus = "fulfilled" | "broken" | "in_progress" | "unknown";
type AlignmentStatus = "aligned" | "contradicted" | "mixed" | "unknown";
type PartyLineStatus = "aligned" | "broke_party_line" | "unknown";

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

interface PartyRecord {
  id: number;
  name: string;
  shortName?: string;
}

interface PartyStanceRecord {
  id: number;
  partyId: number;
  issue?: string;
  stanceText: string;
  sourceUrl: string;
  dateSaid: string;
}
```

## 4.4 Missing-data behavior (mandatory)

If fulfillment or vote-alignment data is missing from backend:
- Show `Unknown` with explicit label: "Data not yet available".
- Never infer fulfillment from `verificationStatus`.
- Never infer politician vote alignment from community support/oppose aggregates.

If party stance or politician-vs-party comparison data is missing:
- Show explicit Unknown / not yet available state.
- Never invent a party-line break.
- Never imply party alignment without a mapped party stance source.

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
  --bg-page: #faf7f2;
  --bg-surface: #ffffff;
  --ink-strong: #1b2a4a;
  --ink-muted: #4f5d78;
  --accent-civic: #1f5fbf;
  --accent-civic-soft: #dfe9fb;
  --accent-amber: #c8963e;

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
- Card radius: 8-12px range; avoid pill-heavy chrome except for chips.
- Visual emphasis on content (claims/evidence/stances), not containers.

## 5.4 Motion

- Subtle only: 120-180ms ease transitions.
- No constant glow effects.
- Animate list/filter transitions, not entire page backgrounds.

## 6) Copy and language rules

Use plain accountability language.

Preferred terms:
- Promise
- Party stance
- Evidence
- Voting record
- Fulfillment
- Unknown / Data not yet available

Avoid on public pages:
- Triage
- Queue ladder
- Control room
- Conflict controls
- reviewVersion jargon

Copy guidance:
- Keep "find a politician" as the primary behavioral cue.
- Make party context feel essential, not bureaucratic.
- Do not imply that party stance equals politician stance.

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
- 4-item public nav must remain usable on mobile without becoming an ops-style menu.

## 8) Implementation acceptance checklist

A public-discovery implementation passes only if all are true:

- [ ] Public nav is Home / Politicians / Parties / Methodology.
- [ ] Home page primary CTA is politician/party search, with politician discovery still dominant.
- [ ] Home page includes Finland-first public context and party shortcuts without becoming a leaderboard page.
- [ ] Politician profile surfaces promises, fulfillment, vote alignment, and party-line context.
- [ ] Party pages exist and feel first-class.
- [ ] Promise detail contains claim, fulfillment, vote alignment, evidence, revision history, and party stance comparison.
- [ ] Missing backend fields are shown as explicit unknown states, not fabricated values.
- [ ] Public pages avoid moderator jargon.
- [ ] Desktop and mobile layouts both pass manual QA.
- [ ] Accessibility checks pass for keyboard and contrast.

## 9) Delivery plan for next agent

Recommended build order:
1. Update route shell and public nav to include `Parties`.
2. Implement Finland-first home page refresh with politician-first search and party discovery.
3. Implement politician directory updates (party filter + Finland-first labels).
4. Implement party directory and party profile route shell.
5. Update politician profile with party-line context.
6. Update promise detail with party stance comparison block.
7. Update methodology for party-context definitions.
8. Apply design-token and responsive polish.
9. Run accessibility and content-language QA pass.

Hand-off note:
- If backend fields for fulfillment, vote alignment, or party-line comparison are unavailable, ship transparent unknown states first and open backend follow-up tasks instead of faking values.

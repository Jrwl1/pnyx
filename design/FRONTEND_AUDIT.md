# PNYX Frontend Audit — Source Code Review

Date: 2026-03-17
Scope: Full source audit of every route, component, layout, and style file.
Chrome was unavailable, so this audit is based on reading every `.tsx`, `.ts`, and `.css` file in `frontend/src/`.

---

## PART 1: REDUNDANT CONTENT, AI-SPEAK, AND DEAD WEIGHT

### 1.1 "What PNYX is / What PNYX is not" (HomePage.tsx, lines 191-209)

**Kill it.** This is the single worst section on the site. No real product talks about itself in negative definitions on its own landing page. "Not a leaderboard built around popularity or engagement metrics" — who asked? "Not a substitute for canonical party, membership, or vote-mapping APIs that do not exist yet" — this is developer documentation leaking into a public page. A citizen doesn't care about your API coverage.

**Replace with:** Nothing. Or a one-line trust statement embedded naturally in the hero. The methodology page already covers this territory properly.

### 1.2 Hero headline is developer prose, not a headline (HomePage.tsx, line 71)

Current: *"Find a Finnish politician first, then open the party context around the same public record."*

This reads like a ticket description, not a landing page headline. "Open the party context around the same public record" is meaningless to a normal person.

**Replace with something like:** "What did they promise? What does the record show?" or "Track what Finnish politicians promise — and what actually happens."

### 1.3 Hero lede is also developer prose (HomePage.tsx, lines 72-74)

Current: *"PNYX tracks sourced promises, makes party-context gaps explicit, and keeps unknown accountability data visible instead of implying certainty the backend does not have yet."*

"Party-context gaps explicit" and "certainty the backend does not have yet" are internal implementation language. A citizen visiting this site for the first time will bounce.

**Replace with:** "Search politicians by name, party, or issue. See their promises, the evidence, and what's still unknown — no fake scores, no hidden gaps."

### 1.4 Search helper text exposes implementation details (HomePage.tsx, lines 94-97)

Current: *"Exact match found for {shortName}. Search will open that frontend-local party shell until canonical party search ships."* and *"Politician search remains the primary action. Exact placeholder party names also open the new party shells."*

"Frontend-local party shell" and "canonical party search ships" are dev jargon. Users should never see this.

**Replace with:** Just remove the helper text entirely, or use something like "Try searching for a party name like SDP or Kokoomus."

### 1.5 "Featured party route shells" section heading (HomePage.tsx, line 172)

The heading literally says "Featured party route shells" and the description says "Frontend-local placeholders keep party discovery visible while canonical party APIs are still pending." The cards say "Party shortcut" badge and "Open party shell."

Every word here is developer language. A user doesn't know what a "route shell" is.

**Replace with:** "Political parties" or "Browse by party". Cards should say "View party profile", not "Open party shell."

### 1.6 "Placeholder shell" badges everywhere (PartiesPage.tsx, PartyProfilePage.tsx)

Every party card has a `<span class="placeholder-badge">Placeholder shell</span>` badge. The parties page heading says "Browse political party route shells without faking backend coverage." The lede says "These party pages exist so public navigation and discovery can land now."

This is a developer explaining their implementation strategy to the user. Stop it.

**Replace with:** Remove all "Placeholder shell" badges. If data is unavailable, the individual fields already show "Unknown" — that's enough transparency. The heading should just be "Finnish political parties" and the lede should explain what parties are tracked, not why the pages exist technically.

### 1.7 Party profile "What is available right now" section (PartyProfilePage.tsx, lines 54-61)

Lists developer notes like "Frontend-local placeholder for route-shell verification only" and "No canonical party stance records are connected yet."

**Replace with:** Remove this section entirely. The scorecards already show "Unknown" for missing data. If you want a contextual note, one line is enough: "Party stance data is being collected and will appear here as it becomes available."

### 1.8 Repeated meta-notes explaining implementation state

These appear throughout the codebase and all say variations of the same thing:

- "Linked to the frontend-local party shell until canonical party membership APIs exist." (PoliticianProfilePage.tsx, line 114)
- "PNYX does not infer party-line behavior without a linked party, sourced party stance records, and mapped politician comparisons." (PoliticianProfilePage.tsx, line 122)
- "Until those records exist, this profile keeps party-line alignment explicit as Unknown rather than implying support or a break." (PoliticianProfilePage.tsx, line 124)
- "Fulfillment, vote alignment, and party-line comparison fields are currently Unknown until backend accountability mappings are available." (PoliticianProfilePage.tsx, line 145)
- "Party filter state is wired for Finland-first discovery, but politician-to-party mappings are not available from the backend yet." (PoliticiansPage.tsx, line 265)
- "Issue filtering is keyword-based until backend issue tagging becomes available." (PoliticiansPage.tsx, line 267)
- "Frontend shows Unknown until affiliations ship." (PoliticiansPage.tsx, line 302)

These are all developer status updates dressed as user-facing copy. A user sees "Unknown" and understands it. They don't need an essay about why.

**Replace with:** One consistent pattern: show "Unknown" or "Data not yet available" inline, and link to methodology once. Remove all the explanatory paragraphs about backend state.

### 1.9 Promise detail page has redundant blocks (PromiseDetailPage.tsx)

The "Party stance comparison" section (lines 144-155) says "No official party stance record is mapped to this promise yet" then adds "PNYX only compares a promise against party stance when a linked party and a sourced party stance record both exist. Until then, this block remains explicit about Unknown state."

Same pattern. Say "No party stance recorded" and stop. Link to methodology for the curious.

### 1.10 Methodology page is functional but flat (MethodologyPage.tsx)

The methodology page is pure bullet lists in cards. Compared to the HTML mockup (which has a sticky TOC sidebar and richer formatting), this feels like a README dumped into cards. It's readable but doesn't match the editorial quality of the rest of the design system.

---

## PART 2: THE HERO SECTION — MAKE IT EARN ITS SPACE

### Current state

The hero is an 8-column text block + 4-column "How this works" sidebar. Below it: issue chips, party shortcuts. Below that: "Recently documented politicians" cards. Then "Featured party route shells." Then "What PNYX is/is not." Then methodology callout.

### Problem

The hero panel is 100% explanatory text. There is zero live data on the most valuable screen real estate of the entire app. A user lands and sees a paragraph, a search box, and generic chips. They don't see a single politician name, a single promise, or a single piece of evidence until they scroll past multiple sections.

### Recommendation: Replace "Recently documented" cards with a live statement feed

Instead of politician summary cards (which only show name + promise count + "unknown"), show the **actual latest statements/promises** that have been documented. This gives users immediate content to engage with.

Proposed "Latest documented promises" section:

```
┌─────────────────────────────────────────────────────────────────┐
│ LATEST DOCUMENTED PROMISES                                       │
├─────────────────────────────────────────────────────────────────┤
│ "I will work to ensure Finland's defence budget reaches 2.5%    │
│  of GDP by 2028..."                                              │
│  Antti Virtanen · KOK · Uusimaa · Jan 22, 2024                  │
│  Fulfillment: Unknown · 2 evidence items       View promise →    │
├─────────────────────────────────────────────────────────────────┤
│ "We need to cut corporate tax by at least 2 percentage points..." │
│  Antti Virtanen · KOK · Uusimaa · Mar 5, 2024                   │
│  Fulfillment: Unknown · 1 evidence item        View promise →    │
├─────────────────────────────────────────────────────────────────┤
│ ...                                                              │
└─────────────────────────────────────────────────────────────────┘
```

This is dramatically better because:
- Users see real content immediately
- Each row is a clickable entry point into the data
- It demonstrates what PNYX actually does (instead of explaining it)
- It shows the product is alive and being updated

### Also consider: compact politician cards

If you keep politician cards, make them denser. Current cards waste space on "Party affiliation: Data not yet available" and "Last documented activity: Mar 14, 2026 9:23 AM." Instead:

```
┌──────────────────────────┐
│ Antti Virtanen            │
│ Kansanedustaja · Uusimaa  │
│ KOK · 9 promises tracked  │
│ View profile →            │
└──────────────────────────┘
```

---

## PART 3: DESIGN SYSTEM GAPS (spec vs. implementation)

### 3.1 Missing --accent-amber color token

The FRONTEND_V3_SPEC.md defines `--accent-amber: #c8963e` and `--accent-amber-soft: #faf0dd`, but `styles.css` doesn't include these. The mockups use amber for party badges and claim blocks. The live site has no amber accent at all — party-related elements lack visual differentiation from generic content.

### 3.2 Background color mismatch

Spec says `--bg-page: #faf7f2` (warm cream). Implementation uses `--bg-page: #f4f1ea` (slightly different warm tone). Plus the body has radial gradients overlaid. This is fine stylistically but diverges from spec.

### 3.3 No party badge styling

The mockups have distinctive amber pill badges for party abbreviations (KOK, SDP, etc.). The live site has no equivalent — party affiliation is just plain text. This is a significant visual regression from the mockups.

### 3.4 Claim block styling missing

The mockups show promise claims in a distinctive left-bordered amber card with italic text. The live site puts promises in generic white cards with no visual distinction from any other content block.

### 3.5 No footer

The mockups all have a footer: "PNYX · Political accountability through public evidence." The live site has no footer at all.

### 3.6 No breadcrumbs

The mockups show breadcrumb navigation (Home → Politicians → Antti Virtanen → Promise). The live site has none.

---

## PART 4: CONCRETE RECOMMENDATIONS

### Priority 1: Content surgery (do this first)

1. **Kill the "What PNYX is / is not" section** entirely.
2. **Rewrite the hero headline** to something a citizen would understand.
3. **Rewrite the hero lede** to describe what the user can do, not what the backend does.
4. **Remove all "route shell," "frontend-local," "canonical API" language** from every user-facing string.
5. **Remove all "Placeholder shell" badges.**
6. **Collapse all multi-paragraph "why this is unknown" explanations** into a single "Data not yet available" + methodology link.
7. **Rename "Open party shell"** to "View party profile" everywhere.
8. **Rename "Featured party route shells"** to "Political parties" or "Browse by party."

### Priority 2: Show live data on the home page

9. **Replace or supplement politician cards with a "Latest promises" feed** showing actual promise text, politician name, party, date, and evidence count.
10. **Make the politician cards denser** — remove redundant meta-lines, show party badge inline, cut "Last documented activity" timestamp.

### Priority 3: Visual polish to match mockups

11. **Add `--accent-amber` and `--accent-amber-soft`** to CSS custom properties.
12. **Create a `.party-badge` component** — amber pill with party abbreviation.
13. **Style promise/claim blocks** with the left amber border treatment from mockups.
14. **Add a site footer.**
15. **Add breadcrumb navigation** to profile and promise detail pages.
16. **Implement the community sentiment bar** on promise detail (currently just numbers).

### Priority 4: Structural improvements

17. **Make the methodology page richer** — add a sticky TOC sidebar, expand definitions, match the mockup quality.
18. **Add the "How this works" 3-step explainer** from the mockup spec as a more visual component (icon + short text), not a sidebar bullet list.
19. **Implement the "Browse by party" section** on home as a proper card grid with party info (not just shortcut links).
20. **Add empty-state illustrations or messaging** that feels editorial rather than developer-facing.

### Priority 5: Interaction improvements

21. **Make the directory table rows clickable** (link the entire row, not just the name).
22. **Add search-as-you-type** with a dropdown showing matched politicians and parties.
23. **Persist filter state in URL params** (already done for directory — extend to other filterable views).
24. **Add "Back to directory" context links** on profile pages.
25. **Animate tab transitions** on profile page.

### Priority 6: Data presentation

26. **When fulfillment data eventually arrives**, implement the donut/bar visualization from the mockup scorecards instead of just numbers.
27. **Show promise count breakdowns visually** — even "9 unknown" could be a gray bar that fills in with color as statuses resolve.
28. **Consider a timeline view** for politicians — show promises chronologically with markers for evidence additions.

---

## PART 5: COPY REWRITE CHEAT SHEET

| Current (dev-speak) | Proposed (human-speak) |
|---|---|
| "Find a Finnish politician first, then open the party context around the same public record." | "What did they promise? What does the record show?" |
| "PNYX tracks sourced promises, makes party-context gaps explicit, and keeps unknown accountability data visible..." | "Search politicians by name, party, or issue. See their promises, the evidence, and what's still unknown." |
| "Frontend-local placeholder for route-shell verification only." | (delete) |
| "Placeholder shell" | (delete badge entirely) |
| "Open party shell" | "View party profile" |
| "Featured party route shells" | "Political parties" |
| "Browse political party route shells without faking backend coverage." | "Browse Finnish political parties tracked on PNYX." |
| "Party filter state is wired for Finland-first discovery, but politician-to-party mappings are not available from the backend yet." | "Party filtering will be available once membership data is connected." |
| "Frontend shows Unknown until affiliations ship." | (delete — the "Unknown" label is self-explanatory) |
| "Linked to the frontend-local party shell until canonical party membership APIs exist." | (delete) |
| "Fulfillment, vote alignment, and party-line comparison fields are currently Unknown until backend accountability mappings are available." | "All statuses are currently unknown. They'll update as evidence is assessed." |
| "Finland-first route shell. Official stances, membership data, and party-line comparisons are not yet connected to a backend feed." | "Stance and membership data is being collected." |

---

## Summary

The bones are solid: the route structure is right, the type system is well-designed, the data context pattern works, and the design tokens are good. But the current site reads like a developer explaining their architecture to the user instead of a product serving a citizen. The single highest-impact change is rewriting all user-facing copy to remove implementation language. The second highest-impact change is putting actual promise content on the home page instead of meta-descriptions of what the product does.

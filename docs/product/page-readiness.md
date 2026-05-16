# Page readiness

Last checked: 2026-05-16

Page readiness is the product's acceptance unit for the next milestones. A scraper, seed file, or API route is not done until the affected public page is truthful, source-backed, and safe to expose.

## Implemented model

M9 stores reviewed readiness in `page_readiness`.

Implemented entity kinds:

- `politician`
- `party`
- `canonical_promise`

Implemented states:

- `ready`
- `thin_but_honest`
- `not_ready`

Implemented fields:

- entity kind and entity id;
- readiness state;
- freshness checked date;
- source count;
- provenance summary;
- missing-data keys;
- reviewer and review timestamp.

Public politician, party, and canonical-promise APIs expose a public `readiness` object. If no reviewed record exists, the API returns a conservative `not_ready` default with `readiness_review` as the missing-data reason. The UI renders this state on politician, party, and canonical promise-backed promise pages.

Moderators can update reviewed readiness through `/ops/page-readiness` and the editorial records ops page.

## States

### Ready

Credible for public traffic. The page satisfies its page-type checklist for identity, source coverage, freshness, provenance, and contribution paths.

### Thin But Honest

Public but incomplete. The page clearly states what is missing or stale and gives users a source-backed way to help.

### Not Ready

Kept out of broad public discovery because identity, duplicate, source, or canonical-record conflicts would mislead users.

## Politician readiness

A Ready politician page has:

- current national/EU role and relevant recent role history;
- party memberships across current and previous-term context where applicable;
- source-backed promises or public positions that satisfy the milestone threshold;
- party-platform context where individual promise coverage is sparse;
- linked vote, stance, fulfillment, or unknown-state evidence where available;
- source provenance and freshness metadata;
- paths for missing promises, source submissions, corrections, and context;
- bounded discussion separate from canonical facts.

## Party readiness

A Ready party page has:

- canonical identity, aliases, and relevant metadata;
- current and previous-term membership coverage for national/EU politicians;
- platform, ethos, and stance records with source trails;
- major promise themes linked to politicians or canonical promises;
- freshness metadata and missing-data calls to action;
- contribution and issue-reporting paths.

Party discussion is deferred until politician and promise discussion prove moderation capacity.

## Promise readiness

A Ready promise page has:

- canonical promise text;
- accepted source bundle;
- politician and party linkage;
- fulfillment, vote, party-alignment, or explicit unknown state;
- provenance and moderation history;
- correction/source submission path;
- bounded discussion for evidence debate and context.

Promise pages are the primary location for detailed discussion because the claim is specific.

## Discussion and reporting boundary

M9 discussion uses separate `discussion_threads`, `discussion_comments`, `discussion_reports`, and `discussion_moderation_actions` tables. Threads attach only to `politician` or `canonical_promise` entities. There is no global forum.

Comments are public context only. They do not update canonical facts, accepted source bundles, readiness records, promise text, party memberships, or fulfillment assessments.

Implemented moderation actions:

- thread actions: `lock`, `unlock`, `hide`, `remove`, `restore`, `escalate`;
- comment actions: `hide`, `remove`, `restore`;
- comment reports enter `/ops/discussion-reports`.

## Readiness evidence

Readiness evidence should include:

- record IDs for canonical politician, party, promise, and source records;
- last imported, last reviewed, and last public-change timestamps;
- missing-data reason when not Ready;
- moderation or editorial decision history;
- proof command or browser evidence for page rendering when readiness logic changes.

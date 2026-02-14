SCOPE.md — In/Out of Scope

WHAT IT DO? In/out of scope for V1, constraints, assumptions. Explicit boundaries before REQs.

In scope (V1):

- Politicians as verified identities (who is tracked).
- Statements: discrete, time-stamped records tied to one politician; revision history stored.
- Verification status on each statement (defined set of states).
- Voting on statements by users.
- Community review in the form of status + votes (no free-form commentary in V1).
- Transparent edit/outcome history: users can see change history for statements.

Out of scope (V1):

- Partisan opinion platform features (commentary, opinion threads).
- Replacing or duplicating investigative journalism workflows.
- Real-time political news coverage or live feeds.
- Unauthenticated or anonymous statement creation (authority model TBD).
- Public API for third-party consumers.

Constraints / assumptions:

- Statements are discrete records with required timestamp and attribution to a politician.
- Verification status is a closed set (values TBD in DATA_MODEL).
- Politicians are added/verified by a defined process (TBD).

Open questions:

- Who can create or edit statements? (e.g. any registered user, curators only, import only.)
- Who can set or change verification status? (e.g. moderators, community, curators.)
- How are politicians added and verified? (manual entry, import, linked to external ID.)

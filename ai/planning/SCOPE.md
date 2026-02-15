SCOPE.md — In/Out of Scope

WHAT IT DO? In/out of scope for V1, constraints, assumptions, and explicit policy boundaries before lock.

In scope (V1):

- Politicians as verified identities (who is tracked).
- Statements: discrete, time-stamped records tied to one politician; revision history stored.
- Verification status on each statement with closed set `{pending, verified, disputed, rejected}`.
- Voting on statements by users with one vote row per user/statement and vote overwrite on recast.
- Community review in the form of status + votes (no free-form commentary in V1).
- Transparent edit/outcome history: users can see change history for statements.
- Lightweight anti-abuse rate limits on auth and write operations.

Out of scope (V1):

- Partisan opinion platform features (commentary, opinion threads).
- Replacing or duplicating investigative journalism workflows.
- Real-time political news coverage or live feeds.
- Public API for third-party consumers.
- Fuzzy duplicate auto-rejection; V1.1 may add assistive similarity hints only.
- CAPTCHA-based abuse controls (deferred to V1.1).

Constraints / assumptions:

- Statements are discrete records with required timestamp and attribution to a politician.
- Duplicate statement rejection in V1 is exact only: `(politicianId, normalizedTextHash, sourceUrl)`.
- Moderators/admins can set verification status with reason required for confidence-lowering transitions.
- Public lists exclude deleted statements by default.
- Moderator/admin lists include pending-delete by default and exclude deleted by default unless explicitly requested.

Open questions:

- None.

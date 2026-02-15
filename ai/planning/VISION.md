VISION.md — What "Success" Looks Like

WHAT IT DO? Defines success, constraints, non-goals, open questions. Complements PITCH/SCOPE.

Success definition: A barebones but robust v1. built with security and scalability in mind.
  Pnyx is successful in v1 if:

A user can:

View politicians

View statements tied to politicians

See a verification/status label on statements

The system enforces:

Role-based permissions (anonymous read-only; user; moderator; admin)

Clear, consistent API contracts

Secure auth with refresh-token flow

The platform supports structured tracking, not chaos:

Statements have lifecycle states (e.g. pending, verified, rejected)

Every change is intentional and auditable

Users can vote on statements (one per user per statement; aggregate visible) and see revision/audit history for statements. Lightweight rate limits apply to auth and write operations.

Measurable v1 success:

≥ 10 politicians created

≥ 50 statements stored

Role-based moderation flow works end-to-end

No auth or permission bypasses

Clear separation of concerns in backend modules

Constraints:

- V1: internal API only (no public API). TypeScript + Vitest stack per planning.

Non-goals (repeat here if needed):

- Becoming a partisan opinion platform.
- Replacing investigative journalism.
- Providing real-time political news coverage.

Open questions:

- (None for V1; defer to later milestones as needed.) 

WHAT IT DO? Concrete, prioritized recommendations to tighten V1 planning docs before locking and implementation.

# V1 Spec Recommendations

## Blocking (resolve before locking V1)

1. Resolve source-of-truth mismatch across planning docs.
- Problem: `ai/planning/SCOPE.md`, `ai/planning/REQUIREMENTS.md`, and `ai/planning/USER_FLOWS.md` still contain open questions/TBDs, but `ai/planning/V1_SPEC_LOCK.md` already defines roles, permissions, and flow behavior.
- Change: Remove conflicting TBD language and align those docs to the lock decisions (or explicitly mark lock sections as provisional if decisions are not final).

2. Complete `DATA_MODEL.md` with concrete entities, fields, constraints, and INV IDs.
- Problem: `ai/planning/DATA_MODEL.md` is still a template, while `ai/planning/V1_SPEC_LOCK.md` references `INV-001` to `INV-005` and specific fields.
- Change: Add full entity specs for `Politician`, `Statement`, `Vote`, `Revision/Audit`, include uniqueness/foreign keys, soft-delete flags, and allowed status values.

3. Complete `API_CONTRACT.md` so internal interface behavior is testable.
- Problem: `ai/planning/API_CONTRACT.md` is a template, but lock doc includes many endpoint-level decisions (403/404/409 patterns, role gates, duplicate policies).
- Change: Define internal contracts (even if no public API): operations, inputs, outputs, error codes, and auth by role.

4. Eliminate unresolved policy forks in lock-critical paths.
- Problem: Lock currently leaves unresolved alternatives such as duplicate statement handling (deny vs merge), duplicate vote behavior (409 vs overwrite), and grace window duration.
- Change: Decide one policy for each and reflect it consistently in `REQUIREMENTS.md`, `USER_FLOWS.md`, `DATA_MODEL.md`, and `V1_SPEC_LOCK.md`.

## High Impact (should be resolved before first implementation sprint)

1. Add missing requirements/flows for capabilities already in lock.
- Gap: `CAP-002` (add politician) and `CAP-007` (withdraw/pendingDelete/admin approve) exist in lock, but corresponding explicit REQ and full FLOW coverage are incomplete in `REQUIREMENTS.md` and `USER_FLOWS.md`.
- Change: Add dedicated REQ IDs and flows with acceptance criteria and error cases.

2. Tighten acceptance criteria to be objectively testable.
- Gap examples in `REQUIREMENTS.md`:
  - Statement ordering: "time or relevance" is ambiguous.
  - Vote meaning: "agreement/disagreement or accuracy" is ambiguous.
  - "without page reload (or within one refresh)" mixes two UX contracts.
- Change: pick one deterministic behavior per criterion.

3. Define verification-status lifecycle.
- Gap: status set is "closed" but values/transitions/reasons are not formalized in planning docs.
- Change: define enum, transition rules, and whether reason is required for specific transitions.

4. Clarify canonical identity and dedupe strategy.
- Gap: uniqueness rule allows `(name, region, office)` or `externalId`; collision and null-handling behavior is unspecified.
- Change: define precedence and exact constraint behavior when externalId is missing or later added.

## Medium / Nice-to-Have (can be finalized during implementation setup)

1. Expand `TEST_STRATEGY.md` from generic guidance to executable proof.
- Add concrete command placeholders by stack once selected (lint/typecheck/test/build).
- Add negative authorization tests (read vs write vs moderation roles).
- Add conflict/concurrency tests for vote uniqueness and politician dedupe.

2. Add traceability matrix.
- Create a small matrix mapping `REQ -> FLOW -> CAP -> INV -> Test` to prevent drift and missing coverage.

3. Define success metric instrumentation.
- Metrics in `PITCH.md` are clear at a high level, but event definitions are missing.
- Add metric definitions (event names, numerator/denominator, retention window).

## Recommended Edit Order

1. `ai/planning/DATA_MODEL.md` (foundational invariants and enums)
2. `ai/planning/API_CONTRACT.md` (behavior + auth + errors)
3. `ai/planning/REQUIREMENTS.md` and `ai/planning/USER_FLOWS.md` (remove TBDs, add missing REQs/FLOWs)
4. `ai/planning/V1_SPEC_LOCK.md` (final consistency pass, remove remaining forks)
5. `ai/planning/LOCK_CHECKLIST.md` run + lock decision

## Pre-Lock Exit Criteria (suggested)

- No `TBD` or `OPEN QUESTIONS` remain in lock-driving docs.
- Every CAP has at least one REQ and one FLOW.
- Every invariant is defined in `DATA_MODEL.md` and referenced by at least one test target.
- All role/permission decisions are single-path (no alternative forks).

## Remaining open questions

1. Which implementation stack and framework will back the internal operations (needed to replace test command placeholders in `ai/planning/TEST_STRATEGY.md`)?
2. Should statement duplicate detection use exact normalized body hash only, or add fuzzy matching thresholds in V1.1?
3. Should soft-deleted statements be visible to moderators/admin in default list views, or only via explicit include-deleted filters?
4. Should verification status changes require a mandatory reason when transitioning from `verified` to `disputed`?
5. Do we need rate limits for add statement/vote operations in V1, or defer anti-abuse controls to post-V1 hardening?

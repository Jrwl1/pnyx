TEST_STRATEGY.md — Proof Plan

WHAT IT DO? Defines minimum proof commands, regression targets, and negative auth/conflict coverage required per sprint.

## Minimum checks required every sprint

Run all checks that exist for the selected stack. Command placeholders:

- Lint: `<lint-command>`
- Typecheck: `<typecheck-command>`
- Unit/integration tests: `<test-command>`
- Build/package: `<build-command>`

Evidence rule:
- For each reported pass, record command and summarized result in WORKLOG with commit hash.

## Regression coverage (required)

- Politician identity and dedupe
  - create politician success
  - duplicate by externalId -> 409
  - duplicate by normalized name+region+office -> 409
- Statement capture
  - create statement requires politicianId/sourceUrl/body/dateSaid
  - create with unknown politician -> 404
  - duplicate statement fingerprint -> 409
  - list ordering by dateSaid DESC, createdAt DESC, id ASC
- Verification lifecycle
  - allowed transitions only (`pending->verified|disputed`, `verified<->disputed`)
  - disallowed/no-op transition -> 409
  - status change writes audit row
- Voting
  - authenticated vote success with value support/oppose
  - duplicate vote same user/statement -> 409
  - anonymous vote -> 403
  - aggregate updated correctly
- Edit permissions
  - author edit inside 30-minute window succeeds
  - author edit outside 30-minute window -> 403
  - moderator/admin edit any non-deleted statement succeeds
- Delete lifecycle
  - author withdraw soft-deletes statement
  - moderator propose delete sets pending flag
  - admin approve delete requires pending state
  - invalid lifecycle transitions -> 409
- Read flows
  - anonymous can view politicians/statements/revisions
  - revision history ordering is deterministic

## Auth negative tests (required)

- Anonymous denied for add politician, add statement, vote, edit, withdraw.
- User denied for set verification status, propose delete, approve delete.
- Moderator denied for approve delete.

## Test layers

- Unit: transition logic, dedupe policy, vote aggregation.
- Integration: persistence constraints (FKs, unique keys), operation status codes.
- E2E: FLOW-001, FLOW-003, FLOW-005, FLOW-007, FLOW-008.

## Deferred stack decisions

- Exact command strings are finalized after stack/tooling selection and then replace placeholders above.

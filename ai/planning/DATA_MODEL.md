DATA_MODEL.md — Entities, Relationships, Invariants

WHAT IT DO? Defines the implemented V1 data model from migrations `0001..0003` (tables, columns, constraints, indexes) and maps runtime invariants to DB/app enforcement.

## Locked scope additions pending implementation (CR-005)

These additions are in locked product scope but are not yet present in migrations `0001..0003`.

Planned entity: parties
- Purpose:
  - Canonical Finnish party identities for public party pages and stance context.
- Planned columns:
  - `id`, `name`, `short_name?`, `country_code`, `created_by`, `created_at`, `updated_at`, `deleted_at?`

Planned entity: party_memberships
- Purpose:
  - Link politicians to parties for current/historical affiliation and party-page membership lists.
- Planned columns:
  - `id`, `politician_id`, `party_id`, `start_date?`, `end_date?`, `is_current`, `source_url?`, `created_at`, `updated_at`

Planned entity: party_stances
- Purpose:
  - Store party-level positions separately from politician statements so public UX can distinguish party stance from politician stance.
- Planned columns:
  - `id`, `party_id`, `issue?`, `source_url`, `body`, `date_said`, `verification_status`, `created_by`, `created_at`, `updated_at`, `withdrawn_at?`, `deleted_at?`

Planned derived surface: party_line_alignment
- Purpose:
  - Compare politician actions/votes/statements to mapped party stance and surface `aligned`, `broke_party_line`, or `unknown`.
- Rules:
  - Must remain derived from sourced politician + party records.
  - Must not emit a break signal when no mapped party stance source exists.
  - Must preserve explicit unknown states rather than guessing party alignment.

Finland-first scope rule:
- Initial public data coverage is limited to Finland (`country_code='FI'` or equivalent Finland-only source boundaries) until a later accepted change request expands geography.

## Migration map

- `migrations/0001_initial.sql`: core entities (`users`, `politicians`, `statements`, `votes`, `revision_audits`) and base indexes.
- `migrations/0002_politician_proposals.sql`: moderated intake entities (`politician_proposals`, `politician_proposal_audits`) and pending dedupe indexes.
- `migrations/0003_proposal_ops_hardening.sql`: moderation-ops fields (`assignee_id`, `assigned_at`, `decision_code`, `review_version`, `reason_code`) and queue/audit filter indexes.

## Controlled value sets

Verification status (`statements.verification_status`):
- `pending`
- `verified`
- `disputed`
- `rejected`

Vote value (`votes.value`):
- `support`
- `oppose`

Proposal status (`politician_proposals.status`):
- `pending`
- `approved`
- `rejected`
- `duplicate`

Proposal audit actions (`politician_proposal_audits.action`):
- `submitted`
- `approved`
- `rejected`
- `duplicate`
- `linked`

Moderation decision reason-code taxonomy (app-level, `PATCH /politician-proposals/:id/review`):
- `reject`: `insufficient_evidence`, `invalid_identity`, `not_public_figure`, `out_of_scope`
- `duplicate`: `duplicate_canonical`, `duplicate_pending`, `already_tracked`

## Entity: users

Purpose:
- Authenticated actor records used by JWT-backed request context and ownership checks.

Columns:
- `id` TEXT PRIMARY KEY
- `email` TEXT NOT NULL UNIQUE
- `role` TEXT NOT NULL CHECK role in (`user`, `moderator`, `admin`)
- `created_at` TEXT NOT NULL DEFAULT `datetime('now')`
- `updated_at` TEXT NOT NULL DEFAULT `datetime('now')`

## Entity: politicians

Purpose:
- Canonical politician identities used by statements and proposal approvals.

Columns:
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `name` TEXT NOT NULL
- `region` TEXT NULL
- `office` TEXT NULL
- `external_id` TEXT UNIQUE NULL
- `verified` INTEGER NOT NULL DEFAULT `0`
- `created_by` TEXT NOT NULL
- `created_at` TEXT NOT NULL DEFAULT `datetime('now')`
- `updated_at` TEXT NOT NULL DEFAULT `datetime('now')`
- `deleted_at` TEXT NULL
- `normalized_key` TEXT GENERATED ALWAYS AS `lower(trim(name)) || '|' || lower(trim(COALESCE(region, ''))) || '|' || lower(trim(COALESCE(office, '')))` STORED

Indexes/constraints:
- Partial unique index `idx_politicians_normalized_key_no_external` on `normalized_key` when `external_id IS NULL AND deleted_at IS NULL`.
- Canonical create path additionally checks app-level duplicate by `normalized_key` before insert.

## Entity: statements

Purpose:
- Time-stamped claims tied to canonical politicians, with verification and delete lifecycle flags.

Columns:
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `politician_id` INTEGER NOT NULL REFERENCES `politicians(id)`
- `source_url` TEXT NOT NULL
- `body` TEXT NOT NULL
- `date_said` TEXT NOT NULL
- `normalized_body_hash` TEXT NOT NULL
- `statement_fingerprint` TEXT NOT NULL
- `verification_status` TEXT NOT NULL CHECK status in (`pending`, `verified`, `disputed`, `rejected`)
- `author_id` TEXT NOT NULL
- `created_at` TEXT NOT NULL DEFAULT `datetime('now')`
- `updated_at` TEXT NOT NULL DEFAULT `datetime('now')`
- `withdrawn_at` TEXT NULL
- `pending_delete` INTEGER NOT NULL DEFAULT `0`
- `deleted_at` TEXT NULL

Indexes/constraints:
- Partial unique index `idx_statements_fingerprint` on `statement_fingerprint` when `deleted_at IS NULL`.
- Duplicate detection key is app-computed SHA256 fingerprint of `${politicianId}|${normalizedBodyHash}|${sourceUrl}`.

Verification transitions implemented in `src/server.ts`:
- `pending -> verified|disputed|rejected`
- `verified -> disputed|rejected`
- `disputed -> verified|rejected`
- `rejected -> pending`

## Entity: votes

Purpose:
- One active vote per `(statement, user)` with overwrite semantics.

Columns:
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `statement_id` INTEGER NOT NULL REFERENCES `statements(id)`
- `user_id` TEXT NOT NULL
- `value` TEXT NOT NULL CHECK value in (`support`, `oppose`)
- `created_at` TEXT NOT NULL DEFAULT `datetime('now')`
- `updated_at` TEXT NOT NULL DEFAULT `datetime('now')`

Indexes/constraints:
- Unique constraint on `(statement_id, user_id)`.
- Upsert path updates `value` and `updated_at` for recasts.

## Entity: revision_audits

Purpose:
- Immutable statement-change history for implemented audited actions.

Columns:
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `statement_id` INTEGER NOT NULL REFERENCES `statements(id)`
- `actor_id` TEXT NOT NULL
- `change_type` TEXT NOT NULL
- `from_value` TEXT NULL
- `to_value` TEXT NULL
- `reason` TEXT NULL
- `created_at` TEXT NOT NULL DEFAULT `datetime('now')`

Notes:
- No DB-level enum constraint on `change_type`; values are produced by handlers.
- Current handlers write `createStatement`, `editStatement`, `verification_status`, `pendingDeleteStatement`, `withdrawStatement`, and `approveDeleteStatement`.

## Entity: politician_proposals

Purpose:
- Moderated intake queue for candidate canonical politician records.

Columns:
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `submitted_by` TEXT NOT NULL
- `name` TEXT NOT NULL
- `region` TEXT NULL
- `office` TEXT NULL
- `external_id` TEXT NULL
- `source_note` TEXT NULL
- `status` TEXT NOT NULL DEFAULT `pending` CHECK status in (`pending`, `approved`, `rejected`, `duplicate`)
- `decision_by` TEXT NULL
- `decision_reason` TEXT NULL
- `decision_code` TEXT NULL
- `linked_politician_id` INTEGER NULL
- `assignee_id` TEXT NULL
- `assigned_at` TEXT NULL
- `review_version` INTEGER NOT NULL DEFAULT `0`
- `created_at` TEXT NOT NULL DEFAULT `datetime('now')`
- `updated_at` TEXT NOT NULL DEFAULT `datetime('now')`
- `decided_at` TEXT NULL
- `normalized_submission_key` TEXT GENERATED ALWAYS AS `lower(trim(name)) || '|' || lower(trim(COALESCE(region, ''))) || '|' || lower(trim(COALESCE(office, '')))` STORED

Indexes/constraints:
- `idx_politician_proposals_status_created` on `(status, created_at DESC)`.
- `idx_politician_proposals_submitter` on `(submitted_by, created_at DESC)`.
- `idx_politician_proposals_pending_external` unique on `external_id` where `status='pending' AND external_id IS NOT NULL`.
- `idx_politician_proposals_pending_normalized` unique on `normalized_submission_key` where `status='pending' AND external_id IS NULL`.
- `idx_politician_proposals_status_assignee_created` on `(status, assignee_id, created_at DESC)`.
- `idx_politician_proposals_assignee_status_created` on `(assignee_id, status, created_at DESC)`.

Operational semantics:
- `review_version` provides optimistic-lock checks for claim/release/review transitions.
- Once status leaves `pending`, review handlers reject further decisions with `409`.

## Entity: politician_proposal_audits

Purpose:
- Immutable audit trail for proposal lifecycle and moderation operations.

Columns:
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `proposal_id` INTEGER NOT NULL REFERENCES `politician_proposals(id)` ON DELETE CASCADE
- `actor_id` TEXT NOT NULL
- `action` TEXT NOT NULL CHECK action in (`submitted`, `approved`, `rejected`, `duplicate`, `linked`)
- `from_status` TEXT NULL
- `to_status` TEXT NULL
- `reason` TEXT NULL
- `reason_code` TEXT NULL
- `linked_politician_id` INTEGER NULL
- `created_at` TEXT NOT NULL DEFAULT `datetime('now')`

Indexes/constraints:
- `idx_politician_proposal_audits_proposal` on `(proposal_id, id)`.
- `idx_politician_proposal_audits_actor_created` on `(actor_id, created_at DESC)`.
- `idx_politician_proposal_audits_action_created` on `(action, created_at DESC)`.
- `idx_politician_proposal_audits_status_created` on `(to_status, created_at DESC)`.

## Invariant mapping (`INV-001..INV-008`)

- `INV-001` statement-to-politician binding:
  - Enforced by `statements.politician_id` FK and statement-create existence check.
- `INV-002` verification status closed set:
  - Enforced by DB CHECK constraint and verification handler validation.
- `INV-003` one vote row per `(statement, user)`:
  - Enforced by UNIQUE `(statement_id, user_id)` and vote upsert.
- `INV-004` auditable statement lifecycle:
  - Implemented coverage includes `create`, `edit`, `verification`, `pending-delete`, `withdraw`, and `approve-delete` transitions via `revision_audits`.
- `INV-005` canonical politician uniqueness with precedence:
  - `external_id` uniqueness plus normalized-key uniqueness and create-time duplicate checks.
- `INV-006` role-aware soft-delete visibility:
  - `GET /statements` and `GET /statements/:id` include pending-delete rows only for `moderator|admin`; deleted rows are excluded.
- `INV-007` canonical politician creation role gate:
  - Enforced by `POST /politicians` `requireRole("admin")`.
- `INV-008` proposal decision metadata integrity:
  - Review path sets `decision_by`, `decision_reason`, `decision_code`, `decided_at`, and blocks re-review once status is not `pending`.

## Relationships at a glance

- `politicians (1) -> (many) statements`
- `statements (1) -> (many) votes`
- `statements (1) -> (many) revision_audits`
- `politician_proposals (1) -> (many) politician_proposal_audits`
- `politician_proposals (0..1) -> (0..1) politicians` via `linked_politician_id` on approval/duplicate linking

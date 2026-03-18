// WHAT IT DO? S1-T02, S22, and S25 proof: verifies proposal, party, canonization, and trust-record schema migrations are applied.
import { describe, expect, it } from "vitest";

import { db } from "../src/db/client.js";

describe("migration", () => {
  it("creates proposal and party identity tables plus key indexes", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as { name: string }[];
    const tableNames = new Set(tables.map((row) => row.name));

    expect(tableNames.has("politician_proposals")).toBe(true);
    expect(tableNames.has("politician_proposal_audits")).toBe(true);
    expect(tableNames.has("parties")).toBe(true);
    expect(tableNames.has("party_aliases")).toBe(true);
    expect(tableNames.has("party_memberships")).toBe(true);
    expect(tableNames.has("canonical_promises")).toBe(true);
    expect(tableNames.has("canonical_promise_sources")).toBe(true);
    expect(tableNames.has("promise_claims")).toBe(true);
    expect(tableNames.has("promise_claim_audits")).toBe(true);
    expect(tableNames.has("claim_equivalence_signals")).toBe(true);
    expect(tableNames.has("party_stances")).toBe(true);
    expect(tableNames.has("vote_events")).toBe(true);
    expect(tableNames.has("politician_vote_records")).toBe(true);
    expect(tableNames.has("canonical_promise_vote_links")).toBe(true);
    expect(tableNames.has("promise_fulfillment_assessments")).toBe(true);
    expect(tableNames.has("party_alignment_assessments")).toBe(true);
    expect(tableNames.has("auth_login_codes")).toBe(true);
    expect(tableNames.has("product_events")).toBe(true);

    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name")
      .all() as { name: string }[];
    const indexNames = new Set(indexes.map((row) => row.name));

    expect(indexNames.has("idx_politician_proposals_pending_external")).toBe(true);
    expect(indexNames.has("idx_politician_proposals_pending_normalized")).toBe(true);
    expect(indexNames.has("idx_politician_proposal_audits_proposal")).toBe(true);
    expect(indexNames.has("idx_politician_proposals_status_assignee_created")).toBe(true);
    expect(indexNames.has("idx_politician_proposal_audits_actor_created")).toBe(true);
    expect(indexNames.has("idx_parties_name_active")).toBe(true);
    expect(indexNames.has("idx_parties_short_name_active")).toBe(true);
    expect(indexNames.has("idx_party_aliases_normalized")).toBe(true);
    expect(indexNames.has("idx_party_aliases_party")).toBe(true);
    expect(indexNames.has("idx_party_memberships_current_politician")).toBe(true);
    expect(indexNames.has("idx_party_memberships_party_dates")).toBe(true);
    expect(indexNames.has("idx_party_memberships_politician_dates")).toBe(true);
    expect(indexNames.has("idx_canonical_promises_politician_status")).toBe(true);
    expect(indexNames.has("idx_canonical_promises_public")).toBe(true);
    expect(indexNames.has("idx_canonical_promise_sources_promise")).toBe(true);
    expect(indexNames.has("idx_canonical_promise_sources_statement")).toBe(true);
    expect(indexNames.has("idx_promise_claims_status_assignee_created")).toBe(true);
    expect(indexNames.has("idx_promise_claims_submitter_created")).toBe(true);
    expect(indexNames.has("idx_promise_claims_pending_key")).toBe(true);
    expect(indexNames.has("idx_promise_claim_audits_claim")).toBe(true);
    expect(indexNames.has("idx_claim_equivalence_signals_claim")).toBe(true);
    expect(indexNames.has("idx_party_stances_party_date")).toBe(true);
    expect(indexNames.has("idx_party_stances_issue_date")).toBe(true);
    expect(indexNames.has("idx_vote_events_external_key")).toBe(true);
    expect(indexNames.has("idx_vote_events_country_date")).toBe(true);
    expect(indexNames.has("idx_vote_events_issue_date")).toBe(true);
    expect(indexNames.has("idx_politician_vote_records_politician")).toBe(true);
    expect(indexNames.has("idx_politician_vote_records_event")).toBe(true);
    expect(indexNames.has("idx_canonical_promise_vote_links_promise")).toBe(true);
    expect(indexNames.has("idx_canonical_promise_vote_links_event")).toBe(true);
    expect(indexNames.has("idx_promise_fulfillment_assessments_promise")).toBe(true);
    expect(indexNames.has("idx_party_alignment_assessments_promise")).toBe(true);
    expect(indexNames.has("idx_party_alignment_assessments_stance")).toBe(true);
    expect(indexNames.has("idx_auth_login_codes_email_created")).toBe(true);
    expect(indexNames.has("idx_auth_login_codes_user_created")).toBe(true);
    expect(indexNames.has("idx_auth_login_codes_expires_state")).toBe(true);
    expect(indexNames.has("idx_product_events_domain_created")).toBe(true);
    expect(indexNames.has("idx_product_events_name_created")).toBe(true);
    expect(indexNames.has("idx_product_events_actor_created")).toBe(true);
    expect(indexNames.has("idx_product_events_entity_created")).toBe(true);

    const proposalColumns = db
      .prepare("PRAGMA table_info(politician_proposals)")
      .all() as { name: string }[];
    const proposalColumnNames = new Set(proposalColumns.map((column) => column.name));
    expect(proposalColumnNames.has("assignee_id")).toBe(true);
    expect(proposalColumnNames.has("assigned_at")).toBe(true);
    expect(proposalColumnNames.has("decision_code")).toBe(true);
    expect(proposalColumnNames.has("review_version")).toBe(true);

    const proposalAuditColumns = db
      .prepare("PRAGMA table_info(politician_proposal_audits)")
      .all() as { name: string }[];
    const proposalAuditColumnNames = new Set(proposalAuditColumns.map((column) => column.name));
    expect(proposalAuditColumnNames.has("reason_code")).toBe(true);

    const partyColumns = db
      .prepare("PRAGMA table_info(parties)")
      .all() as { name: string }[];
    const partyColumnNames = new Set(partyColumns.map((column) => column.name));
    expect(partyColumnNames.has("country_code")).toBe(true);
    expect(partyColumnNames.has("short_name")).toBe(true);
    expect(partyColumnNames.has("created_by")).toBe(true);

    const aliasColumns = db
      .prepare("PRAGMA table_info(party_aliases)")
      .all() as { name: string }[];
    const aliasColumnNames = new Set(aliasColumns.map((column) => column.name));
    expect(aliasColumnNames.has("party_id")).toBe(true);
    expect(aliasColumnNames.has("alias")).toBe(true);
    expect(aliasColumnNames.has("source_note")).toBe(true);

    const membershipColumns = db
      .prepare("PRAGMA table_info(party_memberships)")
      .all() as { name: string }[];
    const membershipColumnNames = new Set(membershipColumns.map((column) => column.name));
    expect(membershipColumnNames.has("politician_id")).toBe(true);
    expect(membershipColumnNames.has("party_id")).toBe(true);
    expect(membershipColumnNames.has("start_date")).toBe(true);
    expect(membershipColumnNames.has("end_date")).toBe(true);
    expect(membershipColumnNames.has("created_by")).toBe(true);

    const canonicalPromiseColumns = db
      .prepare("PRAGMA table_info(canonical_promises)")
      .all() as { name: string }[];
    const canonicalPromiseColumnNames = new Set(canonicalPromiseColumns.map((column) => column.name));
    expect(canonicalPromiseColumnNames.has("politician_id")).toBe(true);
    expect(canonicalPromiseColumnNames.has("promise_text")).toBe(true);
    expect(canonicalPromiseColumnNames.has("public_status")).toBe(true);
    expect(canonicalPromiseColumnNames.has("primary_statement_id")).toBe(true);

    const canonicalSourceColumns = db
      .prepare("PRAGMA table_info(canonical_promise_sources)")
      .all() as { name: string }[];
    const canonicalSourceColumnNames = new Set(canonicalSourceColumns.map((column) => column.name));
    expect(canonicalSourceColumnNames.has("canonical_promise_id")).toBe(true);
    expect(canonicalSourceColumnNames.has("statement_id")).toBe(true);
    expect(canonicalSourceColumnNames.has("source_url")).toBe(true);
    expect(canonicalSourceColumnNames.has("accepted_by")).toBe(true);

    const claimColumns = db
      .prepare("PRAGMA table_info(promise_claims)")
      .all() as { name: string }[];
    const claimColumnNames = new Set(claimColumns.map((column) => column.name));
    expect(claimColumnNames.has("politician_id")).toBe(true);
    expect(claimColumnNames.has("claim_text")).toBe(true);
    expect(claimColumnNames.has("source_url")).toBe(true);
    expect(claimColumnNames.has("review_version")).toBe(true);

    const claimAuditColumns = db
      .prepare("PRAGMA table_info(promise_claim_audits)")
      .all() as { name: string }[];
    const claimAuditColumnNames = new Set(claimAuditColumns.map((column) => column.name));
    expect(claimAuditColumnNames.has("claim_id")).toBe(true);
    expect(claimAuditColumnNames.has("reason_code")).toBe(true);

    const signalColumns = db
      .prepare("PRAGMA table_info(claim_equivalence_signals)")
      .all() as { name: string }[];
    const signalColumnNames = new Set(signalColumns.map((column) => column.name));
    expect(signalColumnNames.has("claim_id")).toBe(true);
    expect(signalColumnNames.has("target_kind")).toBe(true);
    expect(signalColumnNames.has("relation")).toBe(true);
    expect(signalColumnNames.has("reason_code")).toBe(true);

    const partyStanceColumns = db
      .prepare("PRAGMA table_info(party_stances)")
      .all() as { name: string }[];
    const partyStanceColumnNames = new Set(partyStanceColumns.map((column) => column.name));
    expect(partyStanceColumnNames.has("party_id")).toBe(true);
    expect(partyStanceColumnNames.has("issue")).toBe(true);
    expect(partyStanceColumnNames.has("stance_text")).toBe(true);
    expect(partyStanceColumnNames.has("source_url")).toBe(true);
    expect(partyStanceColumnNames.has("date_said")).toBe(true);

    const voteEventColumns = db
      .prepare("PRAGMA table_info(vote_events)")
      .all() as { name: string }[];
    const voteEventColumnNames = new Set(voteEventColumns.map((column) => column.name));
    expect(voteEventColumnNames.has("external_key")).toBe(true);
    expect(voteEventColumnNames.has("country_code")).toBe(true);
    expect(voteEventColumnNames.has("institution_name")).toBe(true);
    expect(voteEventColumnNames.has("title")).toBe(true);
    expect(voteEventColumnNames.has("event_date")).toBe(true);

    const voteRecordColumns = db
      .prepare("PRAGMA table_info(politician_vote_records)")
      .all() as { name: string }[];
    const voteRecordColumnNames = new Set(voteRecordColumns.map((column) => column.name));
    expect(voteRecordColumnNames.has("vote_event_id")).toBe(true);
    expect(voteRecordColumnNames.has("politician_id")).toBe(true);
    expect(voteRecordColumnNames.has("vote_value")).toBe(true);

    const promiseVoteLinkColumns = db
      .prepare("PRAGMA table_info(canonical_promise_vote_links)")
      .all() as { name: string }[];
    const promiseVoteLinkColumnNames = new Set(promiseVoteLinkColumns.map((column) => column.name));
    expect(promiseVoteLinkColumnNames.has("canonical_promise_id")).toBe(true);
    expect(promiseVoteLinkColumnNames.has("vote_event_id")).toBe(true);
    expect(promiseVoteLinkColumnNames.has("aligned_vote_value")).toBe(true);

    const fulfillmentColumns = db
      .prepare("PRAGMA table_info(promise_fulfillment_assessments)")
      .all() as { name: string }[];
    const fulfillmentColumnNames = new Set(fulfillmentColumns.map((column) => column.name));
    expect(fulfillmentColumnNames.has("canonical_promise_id")).toBe(true);
    expect(fulfillmentColumnNames.has("status")).toBe(true);
    expect(fulfillmentColumnNames.has("summary")).toBe(true);
    expect(fulfillmentColumnNames.has("evidence_date")).toBe(true);

    const partyAlignmentColumns = db
      .prepare("PRAGMA table_info(party_alignment_assessments)")
      .all() as { name: string }[];
    const partyAlignmentColumnNames = new Set(partyAlignmentColumns.map((column) => column.name));
    expect(partyAlignmentColumnNames.has("canonical_promise_id")).toBe(true);
    expect(partyAlignmentColumnNames.has("party_stance_id")).toBe(true);
    expect(partyAlignmentColumnNames.has("status")).toBe(true);
    expect(partyAlignmentColumnNames.has("reason")).toBe(true);

    const authLoginCodeColumns = db
      .prepare("PRAGMA table_info(auth_login_codes)")
      .all() as { name: string }[];
    const authLoginCodeColumnNames = new Set(authLoginCodeColumns.map((column) => column.name));
    expect(authLoginCodeColumnNames.has("user_id")).toBe(true);
    expect(authLoginCodeColumnNames.has("email")).toBe(true);
    expect(authLoginCodeColumnNames.has("code_hash")).toBe(true);
    expect(authLoginCodeColumnNames.has("delivery_state")).toBe(true);
    expect(authLoginCodeColumnNames.has("expires_at")).toBe(true);
    expect(authLoginCodeColumnNames.has("consumed_at")).toBe(true);

    const productEventColumns = db
      .prepare("PRAGMA table_info(product_events)")
      .all() as { name: string }[];
    const productEventColumnNames = new Set(productEventColumns.map((column) => column.name));
    expect(productEventColumnNames.has("event_domain")).toBe(true);
    expect(productEventColumnNames.has("event_name")).toBe(true);
    expect(productEventColumnNames.has("actor_id")).toBe(true);
    expect(productEventColumnNames.has("actor_role")).toBe(true);
    expect(productEventColumnNames.has("entity_kind")).toBe(true);
    expect(productEventColumnNames.has("entity_id")).toBe(true);
    expect(productEventColumnNames.has("metadata_json")).toBe(true);
  });
});

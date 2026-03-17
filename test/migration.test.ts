// WHAT IT DO? S1-T02 and S22 proof: verifies proposal and party schema migrations are applied.
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
  });
});

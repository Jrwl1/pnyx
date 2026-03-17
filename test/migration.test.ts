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
  });
});

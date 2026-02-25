// WHAT IT DO? S1-T02 proof: verifies proposal schema migrations are applied.
import { describe, expect, it } from "vitest";

import { db } from "../src/db/client.js";

describe("migration", () => {
  it("creates politician proposal tables and key indexes", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as { name: string }[];
    const tableNames = new Set(tables.map((row) => row.name));

    expect(tableNames.has("politician_proposals")).toBe(true);
    expect(tableNames.has("politician_proposal_audits")).toBe(true);

    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name")
      .all() as { name: string }[];
    const indexNames = new Set(indexes.map((row) => row.name));

    expect(indexNames.has("idx_politician_proposals_pending_external")).toBe(true);
    expect(indexNames.has("idx_politician_proposals_pending_normalized")).toBe(true);
    expect(indexNames.has("idx_politician_proposal_audits_proposal")).toBe(true);
    expect(indexNames.has("idx_politician_proposals_status_assignee_created")).toBe(true);
    expect(indexNames.has("idx_politician_proposal_audits_actor_created")).toBe(true);

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
  });
});

// WHAT IT DO? S2-T08 proof: proposal audit endpoint supports actor/action/status/date filters and pagination.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("proposal audit filters", () => {
  beforeEach(() => {
    db.exec("DELETE FROM politician_proposal_audits");
    db.exec("DELETE FROM politician_proposals");
    db.exec("DELETE FROM politicians");
  });

  it("filters audits by actor/action/status/date and paginates results", async () => {
    const user = await authHeaders("audit-filter-user", "user");
    const proposal = await request(app)
      .post("/politician-proposals")
      .set(user)
      .send({ name: "Audit Filter Target" })
      .expect(201);

    const modA = await authHeaders("audit-filter-mod-a", "moderator");
    await request(app)
      .patch(`/politician-proposals/${proposal.body.id}/review`)
      .set(modA)
      .send({ decision: "reject", reasonCode: "out_of_scope", reason: "policy mismatch", expectedVersion: 0 })
      .expect(200);

    const modView = await request(app)
      .get(`/politician-proposals/${proposal.body.id}/audits?actorId=audit-filter-mod-a&action=rejected&status=rejected&page=1&pageSize=1`)
      .set(modA)
      .expect(200);
    expect(modView.body).toMatchObject({ page: 1, pageSize: 1, total: 1 });
    expect(modView.body.items).toHaveLength(1);
    expect(modView.body.items[0]).toMatchObject({ actorId: "audit-filter-mod-a", action: "rejected", toStatus: "rejected" });

    const emptyWindow = await request(app)
      .get(`/politician-proposals/${proposal.body.id}/audits?fromDate=2999-01-01 00:00:00`)
      .set(modA)
      .expect(200);
    expect(emptyWindow.body.total).toBe(0);
    expect(emptyWindow.body.items).toEqual([]);
  });

  it("rejects invalid filter values", async () => {
    const proposalRow = db
      .prepare(
        "INSERT INTO politician_proposals (submitted_by, name, region, office, external_id, source_note, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')"
      )
      .run("audit-filter-user-2", "Audit Filter Seed", null, null, null, null);
    const mod = await authHeaders("audit-filter-mod-b", "moderator");

    await request(app)
      .get(`/politician-proposals/${proposalRow.lastInsertRowid}/audits?action=archive`)
      .set(mod)
      .expect(400);

    await request(app)
      .get(`/politician-proposals/${proposalRow.lastInsertRowid}/audits?status=unknown`)
      .set(mod)
      .expect(400);
  });
});

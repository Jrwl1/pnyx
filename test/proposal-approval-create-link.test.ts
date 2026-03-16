// WHAT IT DO? S1-T06 proof: proposal approval creates/links canonical politicians atomically.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("proposal approval create link", () => {
  beforeEach(() => {
    db.exec("DELETE FROM politician_proposal_audits");
    db.exec("DELETE FROM politician_proposals");
    db.exec("DELETE FROM politicians");
  });

  const submitProposal = async (name: string, region: string, office: string): Promise<number> => {
    const userHeaders = await authHeaders(`submit-${name}`, "user");
    const res = await request(app)
      .post("/politician-proposals")
      .set(userHeaders)
      .send({ name, region, office })
      .expect(201);
    return res.body.id as number;
  };

  it("approve creates canonical politician and links proposal", async () => {
    const proposalId = await submitProposal("Approve Target", "NY", "Mayor");
    const modHeaders = await authHeaders("mod-approve", "moderator");

    const review = await request(app)
      .patch(`/politician-proposals/${proposalId}/review`)
      .set(modHeaders)
      .send({ decision: "approve", reason: "verified identity" })
      .expect(200);

    expect(review.body).toMatchObject({ ok: true, status: "approved", politicianId: expect.any(Number) });

    const proposal = db
      .prepare("SELECT status, linked_politician_id AS linkedPoliticianId FROM politician_proposals WHERE id = ?")
      .get(proposalId) as { status: string; linkedPoliticianId: number | null };
    expect(proposal).toMatchObject({ status: "approved", linkedPoliticianId: review.body.politicianId });
  });

  it("returns deterministic 409 when approval hits canonical duplicate", async () => {
    const proposalId = await submitProposal("Dup Canonical", "CA", "Senator");

    const adminHeaders = await authHeaders("admin-existing", "admin");
    await request(app)
      .post("/politicians")
      .set(adminHeaders)
      .send({ name: "Dup Canonical", region: "CA", office: "Senator" })
      .expect(201);

    await request(app)
      .patch(`/politician-proposals/${proposalId}/review`)
      .set(adminHeaders)
      .send({ decision: "approve", reason: "should duplicate" })
      .expect(409);

    const proposal = db.prepare("SELECT status FROM politician_proposals WHERE id = ?").get(proposalId) as { status: string };
    expect(proposal.status).toBe("pending");
  });
});

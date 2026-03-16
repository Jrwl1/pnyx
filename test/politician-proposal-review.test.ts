// WHAT IT DO? S1-T04 proof: moderator/admin review pending politician proposals.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("politician proposal review", () => {
  beforeEach(() => {
    db.exec("DELETE FROM politician_proposal_audits");
    db.exec("DELETE FROM politician_proposals");
    db.exec("DELETE FROM politicians");
  });

  const createPendingProposal = async (): Promise<number> => {
    const userHeaders = await authHeaders("proposal-submitter", "user");
    const res = await request(app)
      .post("/politician-proposals")
      .set(userHeaders)
      .send({ name: "Review Candidate", region: "CO", office: "Governor" })
      .expect(201);
    return res.body.id as number;
  };

  it("moderator can reject pending proposal with reason", async () => {
    const proposalId = await createPendingProposal();
    const modHeaders = await authHeaders("mod-reviewer", "moderator");

    const res = await request(app)
      .patch(`/politician-proposals/${proposalId}/review`)
      .set(modHeaders)
      .send({ decision: "reject", reasonCode: "insufficient_evidence", reason: "insufficient sourcing" })
      .expect(200);
    expect(res.body).toMatchObject({ ok: true, status: "rejected" });
  });

  it("admin can mark proposal duplicate and link existing politician", async () => {
    const proposalId = await createPendingProposal();
    const creatorHeaders = await authHeaders("admin-maker", "admin");
    const create = await request(app)
      .post("/politicians")
      .set(creatorHeaders)
      .send({ name: "Existing Target", region: "CO", office: "Governor" })
      .expect(201);

    const adminHeaders = await authHeaders("admin-reviewer", "admin");
    const res = await request(app)
      .patch(`/politician-proposals/${proposalId}/review`)
      .set(adminHeaders)
      .send({ decision: "duplicate", reasonCode: "duplicate_canonical", reason: "already tracked", linkedPoliticianId: create.body.id })
      .expect(200);
    expect(res.body).toMatchObject({ ok: true, status: "duplicate", politicianId: create.body.id });
  });

  it("rejects invalid decision and non-pending reviews", async () => {
    const proposalId = await createPendingProposal();
    const modHeaders = await authHeaders("mod-invalid", "moderator");

    await request(app)
      .patch(`/politician-proposals/${proposalId}/review`)
      .set(modHeaders)
      .send({ decision: "archive" })
      .expect(400);

    await request(app)
      .patch(`/politician-proposals/${proposalId}/review`)
      .set(modHeaders)
      .send({ decision: "reject", reasonCode: "invalid_identity", reason: "bad data" })
      .expect(200);

    await request(app)
      .patch(`/politician-proposals/${proposalId}/review`)
      .set(modHeaders)
      .send({ decision: "reject", reasonCode: "invalid_identity", reason: "again" })
      .expect(409);
  });

  it("denies user review attempts", async () => {
    const proposalId = await createPendingProposal();
    const userHeaders = await authHeaders("plain-user", "user");
    await request(app)
      .patch(`/politician-proposals/${proposalId}/review`)
      .set(userHeaders)
      .send({ decision: "reject", reasonCode: "out_of_scope", reason: "not allowed" })
      .expect(403);
  });
});

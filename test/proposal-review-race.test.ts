// WHAT IT DO? S2-T07 proof: optimistic-lock/version checks prevent concurrent moderation race writes.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("proposal review race", () => {
  beforeEach(() => {
    db.exec("DELETE FROM politician_proposal_audits");
    db.exec("DELETE FROM politician_proposals");
    db.exec("DELETE FROM politicians");
  });

  const submitProposal = async (name: string): Promise<number> => {
    const user = await authHeaders(`race-user-${name}`, "user");
    const res = await request(app)
      .post("/politician-proposals")
      .set(user)
      .send({ name })
      .expect(201);
    return res.body.id as number;
  };

  it("returns deterministic 409 on stale version for claim/release/review", async () => {
    const proposalId = await submitProposal("Race Target");
    const mod = await authHeaders("race-mod", "moderator");

    const claim = await request(app)
      .post(`/politician-proposals/${proposalId}/claim`)
      .set(mod)
      .send({ expectedVersion: 0 })
      .expect(200);

    await request(app)
      .post(`/politician-proposals/${proposalId}/claim`)
      .set(mod)
      .send({ expectedVersion: 0 })
      .expect(409);

    const release = await request(app)
      .post(`/politician-proposals/${proposalId}/release`)
      .set(mod)
      .send({ expectedVersion: claim.body.reviewVersion })
      .expect(200);

    await request(app)
      .patch(`/politician-proposals/${proposalId}/review`)
      .set(mod)
      .send({
        decision: "reject",
        reasonCode: "out_of_scope",
        reason: "stale check",
        expectedVersion: claim.body.reviewVersion
      })
      .expect(409);

    await request(app)
      .patch(`/politician-proposals/${proposalId}/review`)
      .set(mod)
      .send({
        decision: "reject",
        reasonCode: "out_of_scope",
        reason: "current version",
        expectedVersion: release.body.reviewVersion
      })
      .expect(200);

    const row = db.prepare("SELECT status FROM politician_proposals WHERE id = ?").get(proposalId) as { status: string };
    expect(row.status).toBe("rejected");
  });
});

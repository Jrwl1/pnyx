// WHAT IT DO? S2-T05 proof: reject/duplicate moderation decisions require valid normalized reason codes.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("proposal reason policy", () => {
  beforeEach(() => {
    db.exec("DELETE FROM politician_proposal_audits");
    db.exec("DELETE FROM politician_proposals");
    db.exec("DELETE FROM politicians");
  });

  const submitPending = async (name: string): Promise<number> => {
    const user = await authHeaders(`reason-user-${name}`, "user");
    const res = await request(app)
      .post("/politician-proposals")
      .set(user)
      .send({ name })
      .expect(201);
    return res.body.id as number;
  };

  it("rejects reject/duplicate decisions without valid reason codes", async () => {
    const proposalId = await submitPending("Reason Target A");
    const mod = await authHeaders("reason-mod-a", "moderator");

    await request(app)
      .patch(`/politician-proposals/${proposalId}/review`)
      .set(mod)
      .send({ decision: "reject", reason: "missing code", expectedVersion: 0 })
      .expect(400);

    await request(app)
      .patch(`/politician-proposals/${proposalId}/review`)
      .set(mod)
      .send({ decision: "duplicate", reasonCode: "invalid_code", reason: "bad", expectedVersion: 0 })
      .expect(400);
  });

  it("rejects approve decision when reasonCode is provided", async () => {
    const proposalId = await submitPending("Reason Target B");
    const mod = await authHeaders("reason-mod-b", "moderator");
    await request(app)
      .patch(`/politician-proposals/${proposalId}/review`)
      .set(mod)
      .send({ decision: "approve", reasonCode: "out_of_scope", expectedVersion: 0 })
      .expect(400);
  });

  it("accepts valid reject reason code and persists decision_code", async () => {
    const proposalId = await submitPending("Reason Target C");
    const mod = await authHeaders("reason-mod-c", "moderator");

    await request(app)
      .patch(`/politician-proposals/${proposalId}/review`)
      .set(mod)
      .send({ decision: "reject", reasonCode: "out_of_scope", reason: "policy mismatch", expectedVersion: 0 })
      .expect(200);

    const row = db
      .prepare("SELECT status, decision_code AS decisionCode FROM politician_proposals WHERE id = ?")
      .get(proposalId) as { status: string; decisionCode: string | null };
    expect(row).toMatchObject({ status: "rejected", decisionCode: "out_of_scope" });
  });
});

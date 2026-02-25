// WHAT IT DO? S1-T10 proof: proposal lifecycle actions are audit-visible to moderators/admins.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("politician proposal audit", () => {
  beforeEach(() => {
    db.exec("DELETE FROM politician_proposal_audits");
    db.exec("DELETE FROM politician_proposals");
    db.exec("DELETE FROM politicians");
  });

  it("records submitted and approved audit entries", async () => {
    const userHeaders = await authHeaders("audit-submitter", "user");
    const submitRes = await request(app)
      .post("/politician-proposals")
      .set(userHeaders)
      .send({ name: "Audit Proposal", region: "FL", office: "Governor" })
      .expect(201);

    const modHeaders = await authHeaders("audit-mod", "moderator");
    await request(app)
      .patch(`/politician-proposals/${submitRes.body.id}/review`)
      .set(modHeaders)
      .send({ decision: "approve", reason: "identity confirmed" })
      .expect(200);

    const audits = db
      .prepare("SELECT action, from_status AS fromStatus, to_status AS toStatus FROM politician_proposal_audits WHERE proposal_id = ? ORDER BY id")
      .all(submitRes.body.id) as { action: string; fromStatus: string | null; toStatus: string | null }[];

    expect(audits).toHaveLength(2);
    expect(audits[0]).toMatchObject({ action: "submitted", fromStatus: null, toStatus: "pending" });
    expect(audits[1]).toMatchObject({ action: "approved", fromStatus: "pending", toStatus: "approved" });
  });

  it("audit endpoint is restricted to moderator/admin", async () => {
    const userHeaders = await authHeaders("audit-user", "user");
    const submitRes = await request(app)
      .post("/politician-proposals")
      .set(userHeaders)
      .send({ name: "Audit Scope" })
      .expect(201);

    await request(app)
      .get(`/politician-proposals/${submitRes.body.id}/audits`)
      .set(userHeaders)
      .expect(403);

    const modHeaders = await authHeaders("audit-mod-view", "moderator");
    await request(app)
      .get(`/politician-proposals/${submitRes.body.id}/audits`)
      .set(modHeaders)
      .expect(200);
  });
});

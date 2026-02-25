// WHAT IT DO? S1-T08 proof: proposal queue visibility for submitters and moderators.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("politician proposal queue", () => {
  beforeEach(() => {
    db.exec("DELETE FROM politician_proposal_audits");
    db.exec("DELETE FROM politician_proposals");
    db.exec("DELETE FROM politicians");
  });

  it("user sees only own proposals", async () => {
    const userOne = await authHeaders("queue-user-1", "user");
    const userTwo = await authHeaders("queue-user-2", "user");

    await request(app)
      .post("/politician-proposals")
      .set(userOne)
      .send({ name: "Mine One" })
      .expect(201);
    await request(app)
      .post("/politician-proposals")
      .set(userTwo)
      .send({ name: "Not Mine" })
      .expect(201);

    const list = await request(app).get("/politician-proposals").set(userOne).expect(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]).toMatchObject({ submittedBy: "queue-user-1", name: "Mine One" });
  });

  it("moderator can view all and filter by status", async () => {
    const userHeaders = await authHeaders("queue-submitter", "user");
    const pendingRes = await request(app)
      .post("/politician-proposals")
      .set(userHeaders)
      .send({ name: "Pending Proposal" })
      .expect(201);

    const rejectRes = await request(app)
      .post("/politician-proposals")
      .set(userHeaders)
      .send({ name: "Rejected Proposal" })
      .expect(201);

    const modHeaders = await authHeaders("queue-mod", "moderator");
    await request(app)
      .patch(`/politician-proposals/${rejectRes.body.id}/review`)
      .set(modHeaders)
      .send({ decision: "reject", reason: "out of scope" })
      .expect(200);

    const all = await request(app).get("/politician-proposals").set(modHeaders).expect(200);
    expect(all.body.items.length).toBeGreaterThanOrEqual(2);

    const pending = await request(app).get("/politician-proposals?status=pending").set(modHeaders).expect(200);
    expect(pending.body.items.map((item: { id: number }) => item.id)).toContain(pendingRes.body.id);
    expect(pending.body.items.map((item: { id: number }) => item.id)).not.toContain(rejectRes.body.id);
  });
});

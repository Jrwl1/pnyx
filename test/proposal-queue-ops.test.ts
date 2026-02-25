// WHAT IT DO? S2-T02/T03 proof: moderation queue claim/release operations plus queue filtering/pagination behavior.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("proposal queue ops", () => {
  beforeEach(() => {
    db.exec("DELETE FROM politician_proposal_audits");
    db.exec("DELETE FROM politician_proposals");
    db.exec("DELETE FROM politicians");
  });

  it("enforces claim and release ownership transitions", async () => {
    const userHeaders = await authHeaders("queue-op-user", "user");
    const submit = await request(app)
      .post("/politician-proposals")
      .set(userHeaders)
      .send({ name: "Queue Claim Candidate" })
      .expect(201);

    const modA = await authHeaders("queue-mod-a", "moderator");
    const modB = await authHeaders("queue-mod-b", "moderator");
    const admin = await authHeaders("queue-admin", "admin");

    const claimA = await request(app)
      .post(`/politician-proposals/${submit.body.id}/claim`)
      .set(modA)
      .send({ expectedVersion: 0 })
      .expect(200);
    expect(claimA.body).toMatchObject({ ok: true, assigneeId: "queue-mod-a", reviewVersion: 1 });

    await request(app)
      .post(`/politician-proposals/${submit.body.id}/claim`)
      .set(modB)
      .send({ expectedVersion: 1 })
      .expect(409);

    await request(app)
      .post(`/politician-proposals/${submit.body.id}/release`)
      .set(modB)
      .send({ expectedVersion: 1 })
      .expect(403);

    await request(app)
      .post(`/politician-proposals/${submit.body.id}/release`)
      .set(modA)
      .send({ expectedVersion: 1 })
      .expect(200);

    await request(app)
      .post(`/politician-proposals/${submit.body.id}/claim`)
      .set(admin)
      .send({ expectedVersion: 2 })
      .expect(200);
  });

  it("supports queue pagination and operational filters", async () => {
    const userA = await authHeaders("queue-user-a", "user");
    const userB = await authHeaders("queue-user-b", "user");

    const p1 = await request(app)
      .post("/politician-proposals")
      .set(userA)
      .send({ name: "Queue Alpha" })
      .expect(201);
    const p2 = await request(app)
      .post("/politician-proposals")
      .set(userA)
      .send({ name: "Queue Bravo" })
      .expect(201);
    const p3 = await request(app)
      .post("/politician-proposals")
      .set(userB)
      .send({ name: "Queue Charlie" })
      .expect(201);
    await request(app)
      .post("/politician-proposals")
      .set(userB)
      .send({ name: "Queue Delta" })
      .expect(201);

    db.prepare("UPDATE politician_proposals SET created_at = datetime('now', '-30 hours') WHERE id = ?").run(p3.body.id);

    const modHeaders = await authHeaders("queue-mod-filter", "moderator");
    await request(app)
      .post(`/politician-proposals/${p1.body.id}/claim`)
      .set(modHeaders)
      .send({ expectedVersion: 0 })
      .expect(200);

    await request(app)
      .patch(`/politician-proposals/${p2.body.id}/review`)
      .set(modHeaders)
      .send({ decision: "reject", reasonCode: "out_of_scope", reason: "not in scope", expectedVersion: 0 })
      .expect(200);

    const pageOne = await request(app)
      .get("/politician-proposals?page=1&pageSize=2&sort=asc")
      .set(modHeaders)
      .expect(200);
    expect(pageOne.body).toMatchObject({ page: 1, pageSize: 2, total: 4 });
    expect(pageOne.body.items).toHaveLength(2);

    const assignedToMe = await request(app)
      .get("/politician-proposals?assignee=me")
      .set(modHeaders)
      .expect(200);
    expect(assignedToMe.body.items.map((item: { id: number }) => item.id)).toContain(p1.body.id);

    const pendingOnly = await request(app)
      .get("/politician-proposals?status=pending")
      .set(modHeaders)
      .expect(200);
    expect(pendingOnly.body.items.map((item: { id: number }) => item.id)).toContain(p1.body.id);
    expect(pendingOnly.body.items.map((item: { id: number }) => item.id)).not.toContain(p2.body.id);

    const oldPending = await request(app)
      .get("/politician-proposals?status=pending&ageBucket=gt24h")
      .set(modHeaders)
      .expect(200);
    expect(oldPending.body.items.map((item: { id: number }) => item.id)).toContain(p3.body.id);

    const userAList = await request(app)
      .get("/politician-proposals")
      .set(userA)
      .expect(200);
    expect(userAList.body.items).toHaveLength(2);
    expect(userAList.body.items.every((item: { submittedBy: string }) => item.submittedBy === "queue-user-a")).toBe(true);
  });
});

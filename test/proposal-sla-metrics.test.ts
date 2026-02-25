// WHAT IT DO? S2-T04 proof: moderation queue SLA/backlog metrics are available for moderator/admin.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("proposal sla metrics", () => {
  beforeEach(() => {
    db.exec("DELETE FROM politician_proposal_audits");
    db.exec("DELETE FROM politician_proposals");
    db.exec("DELETE FROM politicians");
  });

  it("returns pending backlog totals by assignment and age bucket", async () => {
    const submitter = await authHeaders("sla-user", "user");
    const p1 = await request(app).post("/politician-proposals").set(submitter).send({ name: "SLA Fresh" }).expect(201);
    const p2 = await request(app).post("/politician-proposals").set(submitter).send({ name: "SLA Mid" }).expect(201);
    const p3 = await request(app).post("/politician-proposals").set(submitter).send({ name: "SLA Old" }).expect(201);

    db.prepare("UPDATE politician_proposals SET created_at = datetime('now', '-2 hours') WHERE id = ?").run(p2.body.id);
    db.prepare("UPDATE politician_proposals SET created_at = datetime('now', '-30 hours') WHERE id = ?").run(p3.body.id);

    const mod = await authHeaders("sla-mod", "moderator");
    await request(app)
      .post(`/politician-proposals/${p1.body.id}/claim`)
      .set(mod)
      .send({ expectedVersion: 0 })
      .expect(200);

    const metrics = await request(app).get("/politician-proposals/metrics").set(mod).expect(200);
    expect(metrics.body).toMatchObject({
      pending: { total: 3, assigned: 1, unassigned: 2 },
      ageBuckets: { lt1h: 1, oneTo24h: 1, gt24h: 1 }
    });
  });

  it("denies metrics access to non-moderator users", async () => {
    const user = await authHeaders("sla-user-2", "user");
    await request(app)
      .get("/politician-proposals/metrics")
      .set(user)
      .expect(403);
  });
});

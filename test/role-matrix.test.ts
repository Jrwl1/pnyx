// WHAT IT DO? S1-T12 proof: role matrix for proposal submit/review and canonical politician create.
import { beforeEach, describe, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("role matrix", () => {
  beforeEach(() => {
    db.exec("DELETE FROM politician_proposal_audits");
    db.exec("DELETE FROM politician_proposals");
    db.exec("DELETE FROM politicians");
  });

  it("applies expected role access rules across intake and canonical create", async () => {
    await request(app).post("/politician-proposals").send({ name: "Anon proposal" }).expect(403);
    await request(app).post("/politicians").send({ name: "Anon canonical" }).expect(403);

    const userHeaders = await authHeaders("matrix-user", "user");
    const submit = await request(app)
      .post("/politician-proposals")
      .set(userHeaders)
      .send({ name: "User proposal" })
      .expect(201);

    await request(app)
      .post("/politicians")
      .set(userHeaders)
      .send({ name: "User canonical denied" })
      .expect(403);

    await request(app)
      .patch(`/politician-proposals/${submit.body.id}/review`)
      .set(userHeaders)
      .send({ decision: "reject", reason: "not allowed" })
      .expect(403);

    const modHeaders = await authHeaders("matrix-mod", "moderator");
    await request(app)
      .post("/politicians")
      .set(modHeaders)
      .send({ name: "Mod canonical" })
      .expect(201);
    await request(app)
      .patch(`/politician-proposals/${submit.body.id}/review`)
      .set(modHeaders)
      .send({ decision: "approve", reason: "approved by mod" })
      .expect(200);

    const submit2 = await request(app)
      .post("/politician-proposals")
      .set(userHeaders)
      .send({ name: "User proposal two" })
      .expect(201);

    const adminHeaders = await authHeaders("matrix-admin", "admin");
    await request(app)
      .post("/politicians")
      .set(adminHeaders)
      .send({ name: "Admin canonical" })
      .expect(201);
    await request(app)
      .patch(`/politician-proposals/${submit2.body.id}/review`)
      .set(adminHeaders)
      .send({ decision: "reject", reason: "admin decision" })
      .expect(200);
  });
});

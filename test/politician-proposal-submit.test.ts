// WHAT IT DO? S1-T03 proof: authenticated users submit politician proposals into pending queue.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("politician proposal submit", () => {
  beforeEach(() => {
    db.exec("DELETE FROM politician_proposal_audits");
    db.exec("DELETE FROM politician_proposals");
    db.exec("DELETE FROM politicians");
  });

  it("user can submit proposal and it starts pending", async () => {
    const userHeaders = await authHeaders("proposal-user", "user");
    const res = await request(app)
      .post("/politician-proposals")
      .set(userHeaders)
      .send({
        name: "Proposal Politician",
        region: "CA",
        office: "Governor",
        externalId: "proposal-ext-1",
        sourceNote: "campaign website"
      })
      .expect(201);

    expect(res.body).toMatchObject({ id: expect.any(Number), status: "pending" });

    const proposal = db
      .prepare("SELECT status, submitted_by AS submittedBy FROM politician_proposals WHERE id = ?")
      .get(res.body.id) as { status: string; submittedBy: string };
    expect(proposal).toMatchObject({ status: "pending", submittedBy: "proposal-user" });
  });

  it("anonymous submit is denied", async () => {
    await request(app)
      .post("/politician-proposals")
      .send({ name: "Anon Proposal" })
      .expect(403);
  });

  it("returns 409 when proposal matches existing canonical politician", async () => {
    const adminHeaders = await authHeaders("admin-canonical", "admin");
    await request(app)
      .post("/politicians")
      .set(adminHeaders)
      .send({ name: "Canonical Match", region: "TX", office: "Mayor" })
      .expect(201);

    const userHeaders = await authHeaders("proposal-user-2", "user");
    await request(app)
      .post("/politician-proposals")
      .set(userHeaders)
      .send({ name: "canonical match", region: "tx", office: "mayor" })
      .expect(409);
  });

  it("returns 409 when matching pending proposal already exists", async () => {
    const userHeaders = await authHeaders("proposal-user-3", "user");
    await request(app)
      .post("/politician-proposals")
      .set(userHeaders)
      .send({ name: "Pending Dup", region: "WA", office: "Senator" })
      .expect(201);

    await request(app)
      .post("/politician-proposals")
      .set(userHeaders)
      .send({ name: "pending dup", region: "wa", office: "senator" })
      .expect(409);
  });
});

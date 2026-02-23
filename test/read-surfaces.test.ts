// WHAT IT DO? S0-T09 proof: read surfaces for politicians/statements/list/detail with status, aggregate, and revision history reference.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("read surfaces", () => {
  beforeEach(() => {
    db.exec("DELETE FROM revision_audits");
    db.exec("DELETE FROM votes");
    db.exec("DELETE FROM statements");
    db.exec("DELETE FROM politicians");
  });

  it("anonymous users can browse politicians/statements and fetch detail with status+aggregate+history reference", async () => {
    const creatorHeaders = await authHeaders("creator-1", "user");
    const politicianRes = await request(app)
      .post("/politicians")
      .set(creatorHeaders)
      .send({ name: "Reader Politician", region: "AA", office: "Representative" })
      .expect(201);
    const politicianId = politicianRes.body.id as number;

    const statementRes = await request(app)
      .post("/statements")
      .set(creatorHeaders)
      .send({
        politicianId,
        sourceUrl: "https://example.com/read",
        body: "Read surface statement",
        dateSaid: "2025-01-01"
      })
      .expect(201);
    const statementId = statementRes.body.id as number;

    const modHeaders = await authHeaders("reader-mod", "moderator");
    await request(app)
      .patch(`/statements/${statementId}/verification`)
      .set(modHeaders)
      .send({ newStatus: "verified" })
      .expect(200);

    const voterA = await authHeaders("reader-voter-a", "user");
    const voterB = await authHeaders("reader-voter-b", "user");
    await request(app)
      .post(`/statements/${statementId}/votes`)
      .set(voterA)
      .send({ value: "support" })
      .expect(200);
    await request(app)
      .post(`/statements/${statementId}/votes`)
      .set(voterB)
      .send({ value: "oppose" })
      .expect(200);

    const politiciansList = await request(app).get("/politicians").expect(200);
    expect(politiciansList.body.items).toHaveLength(1);
    expect(politiciansList.body.items[0]).toMatchObject({ id: politicianId, name: "Reader Politician" });

    const statementsList = await request(app).get("/statements").expect(200);
    expect(statementsList.body.items).toHaveLength(1);
    expect(statementsList.body.items[0]).toMatchObject({ id: statementId, verificationStatus: "verified" });

    const detail = await request(app).get(`/statements/${statementId}`).expect(200);
    expect(detail.body).toMatchObject({
      id: statementId,
      politicianId,
      verificationStatus: "verified",
      aggregate: { support: 1, oppose: 1 },
      revisionHistoryUrl: `/statements/${statementId}/revisions`
    });
    expect(typeof detail.body.revisionCount).toBe("number");
  });

  it("invalid statement id returns 404", async () => {
    await request(app).get("/statements/999999").expect(404);
  });

  it("empty state returns empty lists", async () => {
    const politiciansList = await request(app).get("/politicians").expect(200);
    const statementsList = await request(app).get("/statements").expect(200);

    expect(politiciansList.body.items).toEqual([]);
    expect(statementsList.body.items).toEqual([]);
  });
});

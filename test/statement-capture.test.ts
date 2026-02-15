// WHAT IT DO? S0-T03 proof: statement create/list with required fields, pending status, duplicate key.
import { describe, expect, it } from "vitest";

import request from "supertest";

import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

const userHeaders = { "x-role": "user", "x-user-id": "test-user-1" };
const anonHeaders = { "x-role": "anonymous" };

describe("statement capture", () => {
  let politicianId: number;

  beforeEach(() => {
    db.exec("DELETE FROM revision_audits");
    db.exec("DELETE FROM statements");
    db.exec("DELETE FROM politicians");
    const r = db.prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 0, ?)").run("Test Politician", "XX", "Tester", "system");
    politicianId = r.lastInsertRowid as number;
  });

  it("create requires politicianId, sourceUrl, body, dateSaid", async () => {
    await request(app)
      .post("/statements")
      .set(userHeaders)
      .send({ politicianId })
      .expect(400);

    await request(app)
      .post("/statements")
      .set(userHeaders)
      .send({ politicianId, sourceUrl: "https://example.com/1", body: "Quote here", dateSaid: "2025-01-01" })
      .expect(201);
  });

  it("unknown politician returns 404", async () => {
    await request(app)
      .post("/statements")
      .set(userHeaders)
      .send({
        politicianId: 99999,
        sourceUrl: "https://example.com/1",
        body: "Quote",
        dateSaid: "2025-01-01"
      })
      .expect(404);
  });

  it("anonymous create denied with 403", async () => {
    await request(app)
      .post("/statements")
      .set(anonHeaders)
      .send({
        politicianId,
        sourceUrl: "https://example.com/1",
        body: "Quote",
        dateSaid: "2025-01-01"
      })
      .expect(403);
  });

  it("duplicate (politicianId, normalizedBodyHash, sourceUrl) returns 409", async () => {
    const payload = {
      politicianId,
      sourceUrl: "https://example.com/dup",
      body: "Same quote",
      dateSaid: "2025-01-01"
    };

    await request(app).post("/statements").set(userHeaders).send(payload).expect(201);

    await request(app)
      .post("/statements")
      .set(userHeaders)
      .send({ ...payload, body: "  SAME QUOTE  ", dateSaid: "2025-06-15" })
      .expect(409);
  });

  it("statement created as pending and list returns it", async () => {
    const res = await request(app)
      .post("/statements")
      .set(userHeaders)
      .send({
        politicianId,
        sourceUrl: "https://example.com/a",
        body: "A statement",
        dateSaid: "2025-02-01"
      })
      .expect(201);

    expect(res.body).toMatchObject({ id: expect.any(Number), verificationStatus: "pending" });

    const listRes = await request(app).get("/statements").expect(200);
    expect(listRes.body.items).toHaveLength(1);
    expect(listRes.body.items[0]).toMatchObject({
      politicianId,
      sourceUrl: "https://example.com/a",
      body: "A statement",
      verificationStatus: "pending"
    });
  });
});

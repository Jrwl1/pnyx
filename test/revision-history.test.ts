// WHAT IT DO? S0-T08 proof: public revision history endpoint with ordered audit rows and 404 for missing statement.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("revision history", () => {
  let statementId: number;

  beforeEach(async () => {
    db.exec("DELETE FROM revision_audits");
    db.exec("DELETE FROM votes");
    db.exec("DELETE FROM statements");
    db.exec("DELETE FROM politicians");

    const politician = db
      .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 0, ?)")
      .run("History", "ZZ", "Tester", "system");

    const authorHeaders = await authHeaders("history-author", "user");
    const createRes = await request(app)
      .post("/statements")
      .set(authorHeaders)
      .send({
        politicianId: politician.lastInsertRowid,
        sourceUrl: "https://example.com/history",
        body: "Original revision body",
        dateSaid: "2025-01-01"
      })
      .expect(201);
    statementId = createRes.body.id as number;

    await request(app)
      .patch(`/statements/${statementId}`)
      .set(authorHeaders)
      .send({ body: "Edited revision body" })
      .expect(200);

    const modHeaders = await authHeaders("history-mod", "moderator");
    await request(app)
      .patch(`/statements/${statementId}/verification`)
      .set(modHeaders)
      .send({ newStatus: "verified" })
      .expect(200);
  });

  it("returns ordered revision rows for anonymous users", async () => {
    const res = await request(app).get(`/statements/${statementId}/revisions`).expect(200);

    expect(res.body.items).toHaveLength(3);
    expect(res.body.items[0]).toMatchObject({ changeType: "createStatement" });
    expect(res.body.items[1]).toMatchObject({ changeType: "editStatement" });
    expect(res.body.items[2]).toMatchObject({ changeType: "verification_status", fromValue: "pending", toValue: "verified" });

    const ids = res.body.items.map((item: { id: number }) => item.id);
    expect([...ids].sort((a: number, b: number) => a - b)).toEqual(ids);
  });

  it("is also visible to authenticated users", async () => {
    const userHeaders = await authHeaders("reader-1", "user");
    const res = await request(app)
      .get(`/statements/${statementId}/revisions`)
      .set(userHeaders)
      .expect(200);

    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it("returns 404 for non-existent statement", async () => {
    await request(app).get("/statements/999999/revisions").expect(404);
  });
});

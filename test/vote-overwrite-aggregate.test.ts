// WHAT IT DO? S0-T06 proof: vote overwrite behavior and aggregate visibility.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("vote overwrite aggregate", () => {
  let statementId: number;

  beforeEach(async () => {
    db.exec("DELETE FROM revision_audits");
    db.exec("DELETE FROM votes");
    db.exec("DELETE FROM statements");
    db.exec("DELETE FROM politicians");

    const politician = db
      .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 0, ?)")
      .run("Vote Target", "ZZ", "Tester", "system");

    const userHeaders = await authHeaders("author-vote", "user");
    const createRes = await request(app)
      .post("/statements")
      .set(userHeaders)
      .send({
        politicianId: politician.lastInsertRowid,
        sourceUrl: "https://example.com/vote",
        body: "Vote target quote",
        dateSaid: "2025-01-01"
      })
      .expect(201);

    statementId = createRes.body.id as number;
  });

  it("authenticated vote works and aggregate is returned", async () => {
    const voter = await authHeaders("voter-1", "user");
    const res = await request(app)
      .post(`/statements/${statementId}/votes`)
      .set(voter)
      .send({ value: "support" })
      .expect(200);

    expect(res.body).toMatchObject({
      ok: true,
      aggregate: { support: 1, oppose: 0 }
    });
  });

  it("recast overwrites same user vote and aggregate reflects overwrite", async () => {
    const voter = await authHeaders("voter-2", "user");

    await request(app)
      .post(`/statements/${statementId}/votes`)
      .set(voter)
      .send({ value: "support" })
      .expect(200);

    const recast = await request(app)
      .post(`/statements/${statementId}/votes`)
      .set(voter)
      .send({ value: "oppose" })
      .expect(200);

    expect(recast.body.aggregate).toEqual({ support: 0, oppose: 1 });

    const voteRows = db
      .prepare("SELECT user_id AS userId, value FROM votes WHERE statement_id = ?")
      .all(statementId) as { userId: string; value: string }[];
    expect(voteRows).toHaveLength(1);
    expect(voteRows[0]).toMatchObject({ userId: "voter-2", value: "oppose" });
  });

  it("anonymous vote is denied", async () => {
    await request(app)
      .post(`/statements/${statementId}/votes`)
      .send({ value: "support" })
      .expect(403);
  });

  it("returns 404 when statement does not exist", async () => {
    const voter = await authHeaders("voter-3", "user");
    await request(app)
      .post("/statements/999999/votes")
      .set(voter)
      .send({ value: "support" })
      .expect(404);
  });
});

// WHAT IT DO? S21 proof: statement detail returns the caller's vote context and vote writes echo the caller choice.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("statement detail viewer vote", () => {
  let statementId: number;

  beforeEach(async () => {
    db.exec("DELETE FROM votes");
    db.exec("DELETE FROM revision_audits");
    db.exec("DELETE FROM statements");
    db.exec("DELETE FROM politicians");

    const politician = db
      .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 0, ?)")
      .run("Vote Detail Politician", "FI", "MP", "system");
    const politicianId = politician.lastInsertRowid as number;

    const authorHeaders = await authHeaders("viewer-vote-author", "user");
    const createRes = await request(app)
      .post("/statements")
      .set(authorHeaders)
      .send({
        politicianId,
        sourceUrl: "https://example.com/viewer-vote",
        body: "Viewer vote detail statement",
        dateSaid: "2025-03-01"
      })
      .expect(201);

    statementId = createRes.body.id as number;
  });

  it("includes viewerVote for the authenticated caller and null for anonymous", async () => {
    const voterHeaders = await authHeaders("viewer-vote-user", "user");

    const voteRes = await request(app)
      .post(`/statements/${statementId}/votes`)
      .set(voterHeaders)
      .send({ value: "support" })
      .expect(200);
    expect(voteRes.body).toMatchObject({
      ok: true,
      viewerVote: "support",
      aggregate: { support: 1, oppose: 0 }
    });

    const anonymousDetail = await request(app).get(`/statements/${statementId}`).expect(200);
    expect(anonymousDetail.body.viewerVote).toBeNull();

    const authenticatedDetail = await request(app).get(`/statements/${statementId}`).set(voterHeaders).expect(200);
    expect(authenticatedDetail.body).toMatchObject({
      id: statementId,
      viewerVote: "support",
      aggregate: { support: 1, oppose: 0 }
    });
  });
});

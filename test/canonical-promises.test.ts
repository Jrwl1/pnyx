// WHAT IT DO? S23 proof: canonical promises and accepted sources coexist with legacy statement reads.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("canonical promises", () => {
  let politicianId: number;

  beforeEach(() => {
    db.exec("DELETE FROM canonical_promise_sources");
    db.exec("DELETE FROM canonical_promises");
    db.exec("DELETE FROM party_memberships");
    db.exec("DELETE FROM party_aliases");
    db.exec("DELETE FROM parties");
    db.exec("DELETE FROM revision_audits");
    db.exec("DELETE FROM votes");
    db.exec("DELETE FROM statements");
    db.exec("DELETE FROM politicians");

    const politician = db
      .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 0, ?)")
      .run("Canonical Promise Politician", "Helsinki", "MP", "system");
    politicianId = politician.lastInsertRowid as number;
  });

  it("moderator can create a public canonical promise and legacy statement reads expose canonical metadata", async () => {
    const user = await authHeaders("canonical-user", "user");
    const statement = await request(app)
      .post("/statements")
      .set(user)
      .send({
        politicianId,
        sourceUrl: "https://example.com/canonical-source",
        body: "Legacy statement promise",
        dateSaid: "2026-03-17"
      })
      .expect(201);

    const moderator = await authHeaders("canonical-mod", "moderator");
    const create = await request(app)
      .post("/canonical-promises")
      .set(moderator)
      .send({
        politicianId,
        promiseText: "Canonical public promise",
        publicStatus: "public",
        primaryStatementId: statement.body.id
      })
      .expect(201);

    const canonicalList = await request(app).get(`/canonical-promises?politicianId=${politicianId}`).expect(200);
    expect(canonicalList.body.items).toEqual([
      expect.objectContaining({
        id: create.body.id,
        politicianId,
        promiseText: "Canonical public promise",
        publicStatus: "public",
        primaryStatementId: statement.body.id,
        acceptedSourceCount: 1
      })
    ]);

    const canonicalDetail = await request(app).get(`/canonical-promises/${create.body.id}`).expect(200);
    expect(canonicalDetail.body.promise).toMatchObject({
      id: create.body.id,
      promiseText: "Canonical public promise",
      primaryStatementId: statement.body.id,
      acceptedSourceCount: 1
    });
    expect(canonicalDetail.body.acceptedSources).toEqual([
      expect.objectContaining({
        statementId: statement.body.id,
        sourceUrl: "https://example.com/canonical-source"
      })
    ]);

    const statements = await request(app).get("/statements").expect(200);
    expect(statements.body.items[0]).toMatchObject({
      id: statement.body.id,
      canonicalPromiseId: create.body.id,
      promiseKind: "canonical_public",
      canonicalPromiseText: "Canonical public promise",
      acceptedSourceCount: 1
    });

    const detail = await request(app).get(`/statements/${statement.body.id}`).expect(200);
    expect(detail.body.canonical).toMatchObject({
      id: create.body.id,
      promiseText: "Canonical public promise",
      publicStatus: "public",
      acceptedSourceCount: 1
    });
    expect(detail.body.acceptedSources).toEqual([
      expect.objectContaining({
        statementId: statement.body.id,
        sourceUrl: "https://example.com/canonical-source"
      })
    ]);
  });

  it("keeps draft canonical promises hidden from anonymous reads but visible to moderators", async () => {
    const user = await authHeaders("canonical-draft-user", "user");
    const statement = await request(app)
      .post("/statements")
      .set(user)
      .send({
        politicianId,
        sourceUrl: "https://example.com/draft-source",
        body: "Draft canonical source statement",
        dateSaid: "2026-03-18"
      })
      .expect(201);

    const moderator = await authHeaders("canonical-draft-mod", "moderator");
    const create = await request(app)
      .post("/canonical-promises")
      .set(moderator)
      .send({
        politicianId,
        promiseText: "Draft canonical promise",
        publicStatus: "draft",
        primaryStatementId: statement.body.id
      })
      .expect(201);

    const anonymousList = await request(app).get("/canonical-promises").expect(200);
    expect(anonymousList.body.items).toEqual([]);

    await request(app).get(`/canonical-promises/${create.body.id}`).expect(404);

    const moderatorList = await request(app)
      .get(`/canonical-promises?politicianId=${politicianId}`)
      .set(moderator)
      .expect(200);
    expect(moderatorList.body.items[0]).toMatchObject({
      id: create.body.id,
      publicStatus: "draft"
    });

    const moderatorDetail = await request(app)
      .get(`/statements/${statement.body.id}`)
      .set(moderator)
      .expect(200);
    expect(moderatorDetail.body.canonical).toMatchObject({
      id: create.body.id,
      publicStatus: "draft"
    });

    const anonymousDetail = await request(app).get(`/statements/${statement.body.id}`).expect(200);
    expect(anonymousDetail.body.canonical).toBeNull();
    expect(anonymousDetail.body.acceptedSources).toEqual([]);
  });

  it("rejects unauthorized canonical promise writes and missing accepted-source input", async () => {
    const user = await authHeaders("canonical-plain-user", "user");
    await request(app)
      .post("/canonical-promises")
      .set(user)
      .send({
        politicianId,
        promiseText: "User should not create canonical promise"
      })
      .expect(403);

    const moderator = await authHeaders("canonical-invalid-mod", "moderator");
    await request(app)
      .post("/canonical-promises")
      .set(moderator)
      .send({
        politicianId,
        promiseText: "Missing accepted source path",
        publicStatus: "public"
      })
      .expect(400);
  });
});

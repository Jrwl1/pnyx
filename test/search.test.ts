// WHAT IT DO? S26 proof: backend-backed search returns politician, party, canonical-promise, and topic matches from the expanded graph.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("search", () => {
  let politicianId: number;
  let moderatorHeaders: Record<string, string>;

  beforeEach(async () => {
    db.exec("DELETE FROM party_alignment_assessments");
    db.exec("DELETE FROM promise_fulfillment_assessments");
    db.exec("DELETE FROM canonical_promise_vote_links");
    db.exec("DELETE FROM politician_vote_records");
    db.exec("DELETE FROM vote_events");
    db.exec("DELETE FROM party_stances");
    db.exec("DELETE FROM claim_equivalence_signals");
    db.exec("DELETE FROM promise_claim_audits");
    db.exec("DELETE FROM promise_claims");
    db.exec("DELETE FROM canonical_promise_sources");
    db.exec("DELETE FROM canonical_promises");
    db.exec("DELETE FROM party_memberships");
    db.exec("DELETE FROM party_aliases");
    db.exec("DELETE FROM parties");
    db.exec("DELETE FROM revision_audits");
    db.exec("DELETE FROM votes");
    db.exec("DELETE FROM statements");
    db.exec("DELETE FROM politicians");

    politicianId = db
      .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 0, ?)")
      .run("Aino Searcher", "Helsinki", "MP", "system").lastInsertRowid as number;

    moderatorHeaders = await authHeaders("search-mod", "moderator");

    await request(app)
      .post("/parties")
      .set(moderatorHeaders)
      .send({
        id: "sdp",
        name: "Social Democratic Party of Finland",
        shortName: "SDP"
      })
      .expect(201);

    await request(app)
      .post("/parties/sdp/aliases")
      .set(moderatorHeaders)
      .send({ alias: "Suomen Sosialidemokraattinen Puolue" })
      .expect(201);

    await request(app)
      .post("/party-memberships")
      .set(moderatorHeaders)
      .send({
        politicianId,
        partyId: "sdp",
        startDate: "2024-01-01"
      })
      .expect(201);

    const userHeaders = await authHeaders("search-user", "user");
    const statement = await request(app)
      .post("/statements")
      .set(userHeaders)
      .send({
        politicianId,
        sourceUrl: "https://example.fi/promises/rail",
        body: "I will keep commuter rail fares stable.",
        dateSaid: "2026-03-01"
      })
      .expect(201);

    await request(app)
      .post("/canonical-promises")
      .set(moderatorHeaders)
      .send({
        politicianId,
        promiseText: "Keep commuter rail fares stable",
        publicStatus: "public",
        primaryStatementId: statement.body.id
      })
      .expect(201);

    await request(app)
      .post("/party-stances")
      .set(moderatorHeaders)
      .send({
        partyId: "sdp",
        issue: "Transport",
        stanceText: "Keep commuter rail fares stable for regular riders.",
        sourceUrl: "https://example.fi/stances/rail",
        dateSaid: "2026-02-20"
      })
      .expect(201);

    await request(app)
      .post("/vote-events")
      .set(moderatorHeaders)
      .send({
        title: "Commuter rail fare freeze amendment",
        issue: "Transport",
        sourceUrl: "https://example.fi/votes/rail",
        eventDate: "2026-03-08"
      })
      .expect(201);
  });

  it("returns search results across politicians, parties, canonical promises, and topics", async () => {
    const politicianSearch = await request(app).get("/search?q=aino").expect(200);
    expect(politicianSearch.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "politician",
          label: "Aino Searcher",
          target: `/politicians/${politicianId}`
        })
      ])
    );

    const partySearch = await request(app).get("/search?q=sosialidemokraattinen").expect(200);
    expect(partySearch.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "party",
          label: "Social Democratic Party of Finland",
          target: "/parties/sdp"
        })
      ])
    );

    const promiseSearch = await request(app).get("/search?q=rail fares").expect(200);
    expect(promiseSearch.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "promise",
          label: "Keep commuter rail fares stable",
          target: "/promises/1"
        })
      ])
    );

    const topicSearch = await request(app).get("/search?q=transport").expect(200);
    expect(topicSearch.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "topic",
          label: "Transport",
          target: "/politicians?q=Transport"
        })
      ])
    );
  });
});

// WHAT IT DO? S26 proof: public activity feed and promise-claim moderation metrics expose canonization and party-record activity.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("activity feed and claim metrics", () => {
  let politicianId: number;

  beforeEach(() => {
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
      .run("Activity Politician", "Turku", "MP", "system").lastInsertRowid as number;
  });

  it("shows public activity items and moderator claim metrics for the expanded graph", async () => {
    const moderator = await authHeaders("activity-mod", "moderator");
    const user = await authHeaders("activity-user", "user");

    await request(app)
      .post("/parties")
      .set(moderator)
      .send({
        id: "sdp",
        name: "Social Democratic Party of Finland",
        shortName: "SDP"
      })
      .expect(201);

    await request(app)
      .post("/party-memberships")
      .set(moderator)
      .send({
        politicianId,
        partyId: "sdp",
        startDate: "2024-01-01"
      })
      .expect(201);

    await request(app)
      .post("/party-stances")
      .set(moderator)
      .send({
        partyId: "sdp",
        issue: "Transport",
        stanceText: "Keep regional rail fares stable.",
        sourceUrl: "https://example.fi/stances/activity",
        dateSaid: "2026-03-01"
      })
      .expect(201);

    const claim = await request(app)
      .post("/promise-claims")
      .set(user)
      .send({
        politicianId,
        claimText: "I will keep regional rail fares stable.",
        sourceUrl: "https://example.fi/claims/activity",
        dateSaid: "2026-03-02"
      })
      .expect(201);

    const activity = await request(app).get("/activity?partyId=sdp").expect(200);
    expect(activity.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "party_stance_added",
          title: "Party stance added",
          partyId: "sdp",
          target: "/parties/sdp"
        }),
        expect.objectContaining({
          action: "submitted",
          title: "Promise claim submitted",
          partyId: "sdp",
          politicianId,
          target: `/politicians/${politicianId}`
        })
      ])
    );

    const metrics = await request(app).get("/promise-claims/metrics").set(moderator).expect(200);
    expect(metrics.body).toMatchObject({
      pending: {
        total: 1,
        assigned: 0,
        unassigned: 1
      },
      statuses: {
        pending: 1,
        merged: 0,
        canonized: 0,
        rejected: 0
      }
    });

    await request(app).get("/promise-claims/metrics").expect(403);
    expect(claim.body.id).toBeGreaterThan(0);
  });
});

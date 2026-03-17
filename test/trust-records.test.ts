// WHAT IT DO? S25 proof: party stances, vote events, fulfillment assessments, and party-alignment records work through moderator writes and public reads.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("trust records", () => {
  let politicianId: number;
  let canonicalPromiseId: number;

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
      .run("Trust Graph Politician", "Helsinki", "MP", "system").lastInsertRowid as number;

    db.prepare(
      "INSERT INTO parties (id, name, short_name, country_code, description, created_by) VALUES (?, ?, ?, 'FI', ?, ?)"
    ).run("sdp", "Social Democratic Party of Finland", "SDP", "Trust test party", "system");

    db.prepare(
      `INSERT INTO party_memberships (politician_id, party_id, role_title, start_date, source_note, created_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(politicianId, "sdp", "Member of Parliament", "2024-01-01", "seeded membership", "system");

    canonicalPromiseId = db
      .prepare(
        "INSERT INTO canonical_promises (politician_id, promise_text, public_status, created_by) VALUES (?, ?, 'public', ?)"
      )
      .run(politicianId, "Keep commuter rail fares stable", "system").lastInsertRowid as number;
  });

  it("moderator can create trust records and public reads expose them", async () => {
    const moderator = await authHeaders("trust-mod", "moderator");

    const stance = await request(app)
      .post("/party-stances")
      .set(moderator)
      .send({
        partyId: "sdp",
        issue: "Transport",
        stanceText: "Keep commuter rail fares stable for regular riders.",
        sourceUrl: "https://example.fi/stances/rail-fares",
        sourceNote: "party programme",
        dateSaid: "2026-03-10"
      })
      .expect(201);

    const partyStances = await request(app).get("/parties/sdp/stances").expect(200);
    expect(partyStances.body.items).toEqual([
      expect.objectContaining({
        id: stance.body.id,
        partyId: "sdp",
        issue: "Transport",
        stanceText: "Keep commuter rail fares stable for regular riders."
      })
    ]);

    const voteEvent = await request(app)
      .post("/vote-events")
      .set(moderator)
      .send({
        externalKey: "eduskunta-2026-001",
        issue: "Transport",
        title: "Commuter rail fare freeze amendment",
        sourceUrl: "https://example.fi/votes/rail-fares",
        sourceNote: "Finland-first seeded vote",
        eventDate: "2026-03-12"
      })
      .expect(201);

    await request(app)
      .post(`/vote-events/${voteEvent.body.id}/records`)
      .set(moderator)
      .send({
        politicianId,
        voteValue: "for",
        sourceNote: "recorded parliamentary vote"
      })
      .expect(201);

    await request(app)
      .post(`/canonical-promises/${canonicalPromiseId}/vote-links`)
      .set(moderator)
      .send({
        voteEventId: voteEvent.body.id,
        alignedVoteValue: "for",
        comparisonNote: "A yes vote supports the fare freeze promise."
      })
      .expect(201);

    await request(app)
      .post(`/canonical-promises/${canonicalPromiseId}/fulfillment-assessments`)
      .set(moderator)
      .send({
        status: "in_progress",
        summary: "Legislation is advancing but the full fare freeze has not passed yet.",
        sourceUrl: "https://example.fi/fulfillment/rail-fares",
        sourceNote: "committee stage",
        evidenceDate: "2026-03-14"
      })
      .expect(201);

    await request(app)
      .post(`/canonical-promises/${canonicalPromiseId}/party-alignments`)
      .set(moderator)
      .send({
        partyStanceId: stance.body.id,
        status: "aligned",
        reason: "Promise text and official party stance point in the same direction."
      })
      .expect(201);

    const voteEvents = await request(app).get(`/vote-events?politicianId=${politicianId}`).expect(200);
    expect(voteEvents.body.items).toEqual([
      expect.objectContaining({
        id: voteEvent.body.id,
        politicianId,
        politicianName: "Trust Graph Politician",
        voteValue: "for",
        recordCount: 1,
        linkedPromiseCount: 1
      })
    ]);

    const politicianTrust = await request(app).get(`/politicians/${politicianId}/trust-summary`).expect(200);
    expect(politicianTrust.body.trustSummary).toMatchObject({
      politicianId,
      fulfillmentCounts: {
        total: 1,
        fulfilled: 0,
        broken: 0,
        inProgress: 1,
        unknown: 0
      },
      voteAlignmentCounts: {
        aligned: 1,
        contradicted: 0,
        mixed: 0,
        unknown: 0
      },
      partyLineCounts: {
        aligned: 1,
        brokePartyLine: 0,
        unknown: 0
      }
    });
    expect(politicianTrust.body.trustSummary.promises).toEqual([
      expect.objectContaining({
        canonicalPromiseId,
        promiseText: "Keep commuter rail fares stable",
        fulfillmentStatus: "in_progress",
        voteAlignment: "aligned",
        partyLineStatus: "aligned"
      })
    ]);

    const parties = await request(app).get("/parties").expect(200);
    expect(parties.body.items).toEqual([
      expect.objectContaining({
        id: "sdp",
        officialStanceCount: 1,
        trustSummary: expect.objectContaining({
          partyId: "sdp",
          memberCount: 1,
          promiseCount: 1
        })
      })
    ]);

    const partyDetail = await request(app).get("/parties/sdp").expect(200);
    expect(partyDetail.body.party).toMatchObject({
      id: "sdp",
      officialStanceCount: 1,
      trustSummary: expect.objectContaining({
        partyId: "sdp",
        officialStanceCount: 1,
        memberCount: 1,
        promiseCount: 1
      })
    });

    const partyMembers = await request(app).get("/parties/sdp/members").expect(200);
    expect(partyMembers.body.items).toEqual([
      expect.objectContaining({
        politicianId,
        trustSummary: expect.objectContaining({
          promiseCount: 1,
          fulfillmentCounts: expect.objectContaining({ total: 1, inProgress: 1 }),
          voteAlignmentCounts: expect.objectContaining({ aligned: 1 }),
          partyLineCounts: expect.objectContaining({ aligned: 1 })
        })
      })
    ]);

    const voteEventDetail = await request(app).get(`/vote-events/${voteEvent.body.id}`).expect(200);
    expect(voteEventDetail.body.event).toMatchObject({
      id: voteEvent.body.id,
      title: "Commuter rail fare freeze amendment"
    });
    expect(voteEventDetail.body.records).toEqual([
      expect.objectContaining({
        politicianId,
        politicianName: "Trust Graph Politician",
        voteValue: "for"
      })
    ]);

    const voteLinks = await request(app).get(`/canonical-promises/${canonicalPromiseId}/vote-links`).expect(200);
    expect(voteLinks.body.summary).toBe("aligned");
    expect(voteLinks.body.items).toEqual([
      expect.objectContaining({
        canonicalPromiseId,
        voteEventId: voteEvent.body.id,
        alignedVoteValue: "for",
        politicianVoteValue: "for",
        alignmentStatus: "aligned"
      })
    ]);

    const fulfillment = await request(app).get(`/canonical-promises/${canonicalPromiseId}/fulfillment-assessments`).expect(200);
    expect(fulfillment.body.latest).toMatchObject({
      canonicalPromiseId,
      status: "in_progress",
      evidenceDate: "2026-03-14"
    });
    expect(fulfillment.body.items).toEqual([
      expect.objectContaining({
        canonicalPromiseId,
        status: "in_progress",
        summary: "Legislation is advancing but the full fare freeze has not passed yet."
      })
    ]);

    const alignments = await request(app).get(`/canonical-promises/${canonicalPromiseId}/party-alignments`).expect(200);
    expect(alignments.body.items).toEqual([
      expect.objectContaining({
        canonicalPromiseId,
        partyStanceId: stance.body.id,
        status: "aligned",
        partyId: "sdp",
        partyShortName: "SDP",
        stanceText: "Keep commuter rail fares stable for regular riders."
      })
    ]);

    const canonicalDetail = await request(app).get(`/canonical-promises/${canonicalPromiseId}`).expect(200);
    expect(canonicalDetail.body.trustContext).toMatchObject({
      latestFulfillment: expect.objectContaining({
        status: "in_progress"
      }),
      voteAlignmentSummary: "aligned",
      latestPartyAlignment: expect.objectContaining({
        status: "aligned"
      })
    });
  });

  it("summarizes mixed vote alignment and picks the latest fulfillment assessment by evidence date", async () => {
    const moderator = await authHeaders("trust-mod-2", "moderator");

    const firstEvent = await request(app)
      .post("/vote-events")
      .set(moderator)
      .send({
        title: "Fare freeze amendment",
        sourceUrl: "https://example.fi/votes/fare-freeze",
        eventDate: "2026-03-12"
      })
      .expect(201);

    const secondEvent = await request(app)
      .post("/vote-events")
      .set(moderator)
      .send({
        title: "Fare increase amendment",
        sourceUrl: "https://example.fi/votes/fare-increase",
        eventDate: "2026-03-18"
      })
      .expect(201);

    await request(app)
      .post(`/vote-events/${firstEvent.body.id}/records`)
      .set(moderator)
      .send({ politicianId, voteValue: "for" })
      .expect(201);

    await request(app)
      .post(`/vote-events/${secondEvent.body.id}/records`)
      .set(moderator)
      .send({ politicianId, voteValue: "against" })
      .expect(201);

    await request(app)
      .post(`/canonical-promises/${canonicalPromiseId}/vote-links`)
      .set(moderator)
      .send({ voteEventId: firstEvent.body.id, alignedVoteValue: "for" })
      .expect(201);

    await request(app)
      .post(`/canonical-promises/${canonicalPromiseId}/vote-links`)
      .set(moderator)
      .send({ voteEventId: secondEvent.body.id, alignedVoteValue: "for" })
      .expect(201);

    await request(app)
      .post(`/canonical-promises/${canonicalPromiseId}/fulfillment-assessments`)
      .set(moderator)
      .send({
        status: "in_progress",
        summary: "Initial committee work has started.",
        sourceUrl: "https://example.fi/fulfillment/early",
        evidenceDate: "2026-03-13"
      })
      .expect(201);

    await request(app)
      .post(`/canonical-promises/${canonicalPromiseId}/fulfillment-assessments`)
      .set(moderator)
      .send({
        status: "broken",
        summary: "The final budget removed the fare freeze.",
        sourceUrl: "https://example.fi/fulfillment/final",
        evidenceDate: "2026-03-20"
      })
      .expect(201);

    const voteLinks = await request(app).get(`/canonical-promises/${canonicalPromiseId}/vote-links`).expect(200);
    expect(voteLinks.body.summary).toBe("mixed");
    expect(voteLinks.body.items.map((item: { alignmentStatus: string }) => item.alignmentStatus).sort()).toEqual([
      "aligned",
      "contradicted"
    ]);

    const fulfillment = await request(app).get(`/canonical-promises/${canonicalPromiseId}/fulfillment-assessments`).expect(200);
    expect(fulfillment.body.latest).toMatchObject({
      status: "broken",
      evidenceDate: "2026-03-20"
    });
    expect(fulfillment.body.items).toHaveLength(2);

    const politicianTrust = await request(app).get(`/politicians/${politicianId}/trust-summary`).expect(200);
    expect(politicianTrust.body.trustSummary.voteAlignmentCounts).toMatchObject({
      aligned: 0,
      contradicted: 0,
      mixed: 1,
      unknown: 0
    });
    expect(politicianTrust.body.trustSummary.fulfillmentCounts).toMatchObject({
      total: 1,
      fulfilled: 0,
      broken: 1,
      inProgress: 0,
      unknown: 0
    });
  });

  it("rejects unauthorized writes and cross-party party-line assessments without membership coverage", async () => {
    const user = await authHeaders("trust-user", "user");
    await request(app)
      .post("/party-stances")
      .set(user)
      .send({
        partyId: "sdp",
        stanceText: "Users should not create official stances.",
        sourceUrl: "https://example.fi/nope",
        dateSaid: "2026-03-10"
      })
      .expect(403);

    const moderator = await authHeaders("trust-mod-3", "moderator");
    await request(app)
      .post("/parties")
      .set(moderator)
      .send({
        id: "kok",
        name: "National Coalition Party",
        shortName: "KOK"
      })
      .expect(201);

    const otherStance = await request(app)
      .post("/party-stances")
      .set(moderator)
      .send({
        partyId: "kok",
        issue: "Transport",
        stanceText: "Allow commuter rail fares to rise with costs.",
        sourceUrl: "https://example.fi/stances/fare-rise",
        dateSaid: "2026-03-11"
      })
      .expect(201);

    await request(app)
      .post(`/canonical-promises/${canonicalPromiseId}/party-alignments`)
      .set(moderator)
      .send({
        partyStanceId: otherStance.body.id,
        status: "broke_party_line",
        reason: "This should fail because the politician is not linked to KOK."
      })
      .expect(409);

    await request(app)
      .post("/vote-events")
      .set(moderator)
      .send({
        title: "Invalid vote event",
        sourceUrl: "https://example.fi/votes/invalid",
        eventDate: "17-03-2026"
      })
      .expect(400);
  });
});

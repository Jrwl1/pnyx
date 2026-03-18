// WHAT IT DO? Proves auth, contribution, moderation, and editorial flows append rows into product_events.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

const clearAllTables = (): void => {
  db.exec("DELETE FROM product_events");
  db.exec("DELETE FROM claim_equivalence_signals");
  db.exec("DELETE FROM promise_claim_audits");
  db.exec("DELETE FROM promise_claims");
  db.exec("DELETE FROM party_alignment_assessments");
  db.exec("DELETE FROM promise_fulfillment_assessments");
  db.exec("DELETE FROM canonical_promise_vote_links");
  db.exec("DELETE FROM politician_vote_records");
  db.exec("DELETE FROM vote_events");
  db.exec("DELETE FROM party_stances");
  db.exec("DELETE FROM canonical_promise_sources");
  db.exec("DELETE FROM canonical_promises");
  db.exec("DELETE FROM party_memberships");
  db.exec("DELETE FROM party_aliases");
  db.exec("DELETE FROM parties");
  db.exec("DELETE FROM politician_proposal_audits");
  db.exec("DELETE FROM politician_proposals");
  db.exec("DELETE FROM revision_audits");
  db.exec("DELETE FROM votes");
  db.exec("DELETE FROM statements");
  db.exec("DELETE FROM auth_login_codes");
  db.exec("DELETE FROM politicians");
  db.exec("DELETE FROM users");
};

describe("product events", () => {
  beforeEach(() => {
    clearAllTables();
  });

  it("records auth, contribution, moderation, and editorial actions", async () => {
    const registerRes = await request(app)
      .post("/auth/register")
      .send({ email: "events-user@example.fi", captchaToken: "test-captcha-pass" })
      .expect(201);

    const requestCodeRes = await request(app).post("/auth/request-code").send({ email: "events-user@example.fi" }).expect(202);
    await request(app)
      .post("/auth/verify-code")
      .send({ email: "events-user@example.fi", code: requestCodeRes.body.codePreview })
      .expect(200);

    await request(app)
      .post("/auth/register")
      .send({ email: "events-mod@example.fi", captchaToken: "test-captcha-pass" })
      .expect(201);

    const adminHeaders = await authHeaders("events-admin", "admin");
    await request(app)
      .post("/auth/role-grants")
      .set(adminHeaders)
      .send({ email: "events-mod@example.fi", role: "moderator" })
      .expect(200);

    const politicianResult = db
      .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 0, ?)")
      .run("Events Politician", "Helsinki", "MP", "system");
    const politicianId = politicianResult.lastInsertRowid as number;

    const contributorHeaders = await authHeaders(registerRes.body.id, "user");
    const moderatorHeaders = await authHeaders("events-mod", "moderator");

    const proposalRes = await request(app)
      .post("/politician-proposals")
      .set(contributorHeaders)
      .send({ name: "Events Proposal", captchaToken: "test-captcha-pass" })
      .expect(201);

    const statementRes = await request(app)
      .post("/statements")
      .set(contributorHeaders)
      .send({
        politicianId,
        sourceUrl: "https://example.fi/events-statement",
        body: "Events statement promise",
        dateSaid: "2026-03-18"
      })
      .expect(201);

    const claimRes = await request(app)
      .post("/promise-claims")
      .set(contributorHeaders)
      .send({
        politicianId,
        claimText: "Events promise claim",
        sourceUrl: "https://example.fi/events-claim",
        dateSaid: "2026-03-18"
      })
      .expect(201);

    await request(app)
      .post(`/politician-proposals/${proposalRes.body.id}/claim`)
      .set(moderatorHeaders)
      .send({ expectedVersion: 0 })
      .expect(200);

    await request(app)
      .patch(`/politician-proposals/${proposalRes.body.id}/review`)
      .set(moderatorHeaders)
      .send({ decision: "reject", reasonCode: "out_of_scope", expectedVersion: 1 })
      .expect(200);

    await request(app)
      .post(`/promise-claims/${claimRes.body.id}/claim`)
      .set(moderatorHeaders)
      .send({ expectedVersion: 0 })
      .expect(200);

    const partyRes = await request(app)
      .post("/parties")
      .set(moderatorHeaders)
      .send({ id: "events-party", name: "Events Party", shortName: "EVT", countryCode: "FI" })
      .expect(201);

    await request(app)
      .post(`/parties/${partyRes.body.id}/aliases`)
      .set(moderatorHeaders)
      .send({ alias: "Events Alias" })
      .expect(201);

    const membershipRes = await request(app)
      .post("/party-memberships")
      .set(moderatorHeaders)
      .send({ politicianId, partyId: partyRes.body.id, roleTitle: "Member", startDate: "2026-01-01" })
      .expect(201);

    await request(app)
      .patch(`/party-memberships/${membershipRes.body.id}`)
      .set(moderatorHeaders)
      .send({ roleTitle: "Lead member", sourceNote: "updated by test" })
      .expect(200);

    const canonicalPromiseRes = await request(app)
      .post("/canonical-promises")
      .set(moderatorHeaders)
      .send({
        politicianId,
        promiseText: "Events canonical promise",
        publicStatus: "public",
        primaryStatementId: statementRes.body.id
      })
      .expect(201);

    const stanceRes = await request(app)
      .post("/party-stances")
      .set(moderatorHeaders)
      .send({
        partyId: partyRes.body.id,
        issue: "Economy and jobs",
        stanceText: "Events party stance",
        sourceUrl: "https://example.fi/events-stance",
        dateSaid: "2026-03-18"
      })
      .expect(201);

    const voteEventRes = await request(app)
      .post("/vote-events")
      .set(moderatorHeaders)
      .send({
        title: "Events vote event",
        sourceUrl: "https://example.fi/events-vote",
        eventDate: "2026-03-18"
      })
      .expect(201);

    await request(app)
      .post(`/vote-events/${voteEventRes.body.id}/records`)
      .set(moderatorHeaders)
      .send({ politicianId, voteValue: "for" })
      .expect(201);

    await request(app)
      .post(`/canonical-promises/${canonicalPromiseRes.body.id}/vote-links`)
      .set(moderatorHeaders)
      .send({ voteEventId: voteEventRes.body.id, alignedVoteValue: "for" })
      .expect(201);

    await request(app)
      .post(`/canonical-promises/${canonicalPromiseRes.body.id}/fulfillment-assessments`)
      .set(moderatorHeaders)
      .send({
        status: "in_progress",
        summary: "Events fulfillment",
        sourceUrl: "https://example.fi/events-fulfillment",
        evidenceDate: "2026-03-18"
      })
      .expect(201);

    await request(app)
      .post(`/canonical-promises/${canonicalPromiseRes.body.id}/party-alignments`)
      .set(moderatorHeaders)
      .send({ partyStanceId: stanceRes.body.id, status: "aligned" })
      .expect(201);

    await request(app)
      .patch(`/promise-claims/${claimRes.body.id}/review`)
      .set(moderatorHeaders)
      .send({
        decision: "merge",
        linkedCanonicalPromiseId: canonicalPromiseRes.body.id,
        expectedVersion: 1
      })
      .expect(200);

    const rows = db
      .prepare("SELECT event_domain AS eventDomain, event_name AS eventName FROM product_events ORDER BY id")
      .all() as Array<{ eventDomain: string; eventName: string }>;

    expect(rows).toEqual(
      expect.arrayContaining([
        { eventDomain: "auth", eventName: "user_registered" },
        { eventDomain: "auth", eventName: "login_code_requested" },
        { eventDomain: "auth", eventName: "signed_in" },
        { eventDomain: "auth", eventName: "role_granted" },
        { eventDomain: "contribution", eventName: "politician_proposal_submitted" },
        { eventDomain: "contribution", eventName: "statement_submitted" },
        { eventDomain: "contribution", eventName: "promise_claim_submitted" },
        { eventDomain: "moderation", eventName: "politician_proposal_claimed" },
        { eventDomain: "moderation", eventName: "politician_proposal_reviewed" },
        { eventDomain: "moderation", eventName: "promise_claim_claimed" },
        { eventDomain: "moderation", eventName: "promise_claim_reviewed" },
        { eventDomain: "editorial", eventName: "party_created" },
        { eventDomain: "editorial", eventName: "party_alias_created" },
        { eventDomain: "editorial", eventName: "party_membership_created" },
        { eventDomain: "editorial", eventName: "party_membership_updated" },
        { eventDomain: "editorial", eventName: "canonical_promise_created" },
        { eventDomain: "editorial", eventName: "party_stance_created" },
        { eventDomain: "editorial", eventName: "vote_event_created" },
        { eventDomain: "editorial", eventName: "vote_record_created" },
        { eventDomain: "editorial", eventName: "vote_link_created" },
        { eventDomain: "editorial", eventName: "fulfillment_assessment_created" },
        { eventDomain: "editorial", eventName: "party_alignment_created" }
      ])
    );
  });
});

// WHAT IT DO? Proves moderator launch-coverage metrics reflect party, promise, and trust record completeness.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("launch coverage", () => {
  beforeEach(() => {
    db.exec("DELETE FROM auth_login_codes");
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
    db.exec("DELETE FROM users");
  });

  it("reports launch-critical coverage counts for moderators", async () => {
    const politician = db
      .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 0, ?)")
      .run("Launch Coverage Politician", "FI", "MP", "seed");
    const politicianId = politician.lastInsertRowid as number;

    db.prepare(
      "INSERT INTO parties (id, name, short_name, country_code, description, website_url, created_by) VALUES (?, ?, ?, 'FI', ?, ?, ?)"
    ).run("lc-party", "Launch Coverage Party", "LCP", "Launch coverage seed party", "https://example.fi/party", "seed");
    db.prepare(
      "INSERT INTO party_memberships (politician_id, party_id, role_title, start_date, source_note, created_by) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(politicianId, "lc-party", "Member", "2026-01-01", "seed membership", "seed");

    const promise = db
      .prepare(
        "INSERT INTO canonical_promises (politician_id, promise_text, public_status, created_by) VALUES (?, ?, 'public', ?)"
      )
      .run(politicianId, "Launch coverage canonical promise", "seed");
    const canonicalPromiseId = promise.lastInsertRowid as number;

    db.prepare(
      "INSERT INTO promise_claims (submitted_by, politician_id, claim_text, source_url, date_said, status) VALUES (?, ?, ?, ?, ?, 'pending')"
    ).run("seed-user", politicianId, "Pending launch claim", "https://example.fi/claim", "2026-03-17");

    const stance = db
      .prepare(
        "INSERT INTO party_stances (party_id, issue, stance_text, source_url, source_note, date_said, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run("lc-party", "Economy", "We support launch coverage.", "https://example.fi/stance", "seed stance", "2026-03-17", "seed");
    const partyStanceId = stance.lastInsertRowid as number;

    const voteEvent = db
      .prepare(
        "INSERT INTO vote_events (country_code, institution_name, issue, title, source_url, source_note, event_date, created_by) VALUES ('FI', 'Eduskunta', ?, ?, ?, ?, ?, ?)"
      )
      .run("Economy", "Launch coverage vote", "https://example.fi/vote", "seed vote", "2026-03-17", "seed");
    const voteEventId = voteEvent.lastInsertRowid as number;

    db.prepare(
      "INSERT INTO canonical_promise_vote_links (canonical_promise_id, vote_event_id, aligned_vote_value, comparison_note, created_by) VALUES (?, ?, 'for', ?, ?)"
    ).run(canonicalPromiseId, voteEventId, "seed link", "seed");
    db.prepare(
      "INSERT INTO promise_fulfillment_assessments (canonical_promise_id, status, summary, source_url, source_note, evidence_date, created_by) VALUES (?, 'fulfilled', ?, ?, ?, ?, ?)"
    ).run(canonicalPromiseId, "seed fulfillment", "https://example.fi/fulfillment", "seed fulfillment", "2026-03-17", "seed");
    db.prepare(
      "INSERT INTO party_alignment_assessments (canonical_promise_id, party_stance_id, status, reason, created_by) VALUES (?, ?, 'aligned', ?, ?)"
    ).run(canonicalPromiseId, partyStanceId, "seed alignment", "seed");

    const moderatorHeaders = await authHeaders("coverage-mod", "moderator");
    const response = await request(app)
      .get("/ops/launch-coverage")
      .set(moderatorHeaders)
      .expect(200);

    expect(response.body).toEqual({
      parties: {
        total: 1,
        withStances: 1
      },
      politicians: {
        total: 1,
        withCurrentMembership: 1
      },
      canonicalPromises: {
        publicTotal: 1,
        withFulfillment: 1,
        withVoteLinks: 1,
        withPartyAlignment: 1
      },
      pendingClaims: 1
    });
  });
});

// WHAT IT DO? Proves contributor reputation backfill and score aggregation from reviewed statements, proposals, and claims.
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "../src/db/client.js";
import { recomputeAllContributorReputation, recomputeContributorReputation } from "../src/db/reputation.js";

describe("contributor reputation", () => {
  beforeEach(() => {
    db.exec("DELETE FROM contributor_reputation");
    db.exec("DELETE FROM promise_claims");
    db.exec("DELETE FROM politician_proposals");
    db.exec("DELETE FROM statements");
    db.exec("DELETE FROM politicians");
  });

  it("computes counts and weighted score from existing review outcomes", () => {
    const userId = "rep-user";
    const politicianId = db
      .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 0, ?)")
      .run("Reputation Politician", "Turku", "MP", "system").lastInsertRowid as number;

    db.prepare(
      "INSERT INTO statements (politician_id, source_url, body, date_said, normalized_body_hash, statement_fingerprint, verification_status, author_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      politicianId,
      "https://example.fi/rep-verified",
      "Verified statement",
      "2026-03-18",
      "hash-verified",
      "fingerprint-verified",
      "verified",
      userId
    );
    db.prepare(
      "INSERT INTO statements (politician_id, source_url, body, date_said, normalized_body_hash, statement_fingerprint, verification_status, author_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      politicianId,
      "https://example.fi/rep-disputed",
      "Disputed statement",
      "2026-03-18",
      "hash-disputed",
      "fingerprint-disputed",
      "disputed",
      userId
    );
    db.prepare(
      "INSERT INTO statements (politician_id, source_url, body, date_said, normalized_body_hash, statement_fingerprint, verification_status, author_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      politicianId,
      "https://example.fi/rep-rejected",
      "Rejected statement",
      "2026-03-18",
      "hash-rejected",
      "fingerprint-rejected",
      "rejected",
      userId
    );

    db.prepare(
      "INSERT INTO politician_proposals (submitted_by, name, region, office, status) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)"
    ).run(
      userId,
      "Approved Proposal",
      null,
      null,
      "approved",
      userId,
      "Duplicate Proposal",
      null,
      null,
      "duplicate",
      userId,
      "Rejected Proposal",
      null,
      null,
      "rejected"
    );

    db.prepare(
      "INSERT INTO promise_claims (submitted_by, politician_id, claim_text, source_url, date_said, status) VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)"
    ).run(
      userId,
      politicianId,
      "Merged claim",
      "https://example.fi/rep-claim-merged",
      "2026-03-18",
      "merged",
      userId,
      politicianId,
      "Canonized claim",
      "https://example.fi/rep-claim-canonized",
      "2026-03-18",
      "canonized",
      userId,
      politicianId,
      "Rejected claim",
      "https://example.fi/rep-claim-rejected",
      "2026-03-18",
      "rejected"
    );

    const reputation = recomputeContributorReputation(userId);
    expect(reputation).toMatchObject({
      userId,
      verifiedStatements: 1,
      disputedStatements: 1,
      rejectedStatements: 1,
      approvedProposals: 1,
      duplicateProposals: 1,
      rejectedProposals: 1,
      mergedClaims: 1,
      canonizedClaims: 1,
      rejectedClaims: 1
    });
    expect(reputation.score).toBe(2);
  });

  it("backfills every distinct contributor into contributor_reputation", () => {
    const politicianId = db
      .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 0, ?)")
      .run("Backfill Politician", "Vantaa", "MP", "system").lastInsertRowid as number;

    db.prepare(
      "INSERT INTO statements (politician_id, source_url, body, date_said, normalized_body_hash, statement_fingerprint, verification_status, author_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      politicianId,
      "https://example.fi/backfill-statement",
      "Backfill statement",
      "2026-03-18",
      "hash-backfill",
      "fingerprint-backfill",
      "verified",
      "rep-a"
    );
    db.prepare(
      "INSERT INTO politician_proposals (submitted_by, name, region, office, status) VALUES (?, ?, ?, ?, ?)"
    ).run("rep-b", "Backfill Proposal", null, null, "approved");

    const rows = recomputeAllContributorReputation();
    expect(rows.map((row) => row.userId).sort()).toEqual(["rep-a", "rep-b"]);
  });
});

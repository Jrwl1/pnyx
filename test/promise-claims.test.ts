// WHAT IT DO? S24 proof: promise claim intake, equivalence signals, duplicate assist, and moderator merge/canonize actions work end to end.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("promise claims", () => {
  let politicianId: number;
  let canonicalPromiseId: number;

  beforeEach(async () => {
    db.exec("DELETE FROM claim_equivalence_signals");
    db.exec("DELETE FROM promise_claim_audits");
    db.exec("DELETE FROM promise_claims");
    db.exec("DELETE FROM canonical_promise_sources");
    db.exec("DELETE FROM canonical_promises");
    db.exec("DELETE FROM revision_audits");
    db.exec("DELETE FROM votes");
    db.exec("DELETE FROM statements");
    db.exec("DELETE FROM politicians");

    const politician = db
      .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 0, ?)")
      .run("Claim Politician", "Tampere", "MP", "system");
    politicianId = politician.lastInsertRowid as number;

    const moderator = await authHeaders("claim-seed-mod", "moderator");
    const statement = await request(app)
      .post("/statements")
      .set(await authHeaders("claim-seed-user", "user"))
      .send({
        politicianId,
        sourceUrl: "https://example.com/canonical-claim-source",
        body: "Canonical seeded claim",
        dateSaid: "2026-03-17"
      })
      .expect(201);

    const canonicalPromise = await request(app)
      .post("/canonical-promises")
      .set(moderator)
      .send({
        politicianId,
        promiseText: "Canonical seeded promise",
        publicStatus: "public",
        primaryStatementId: statement.body.id
      })
      .expect(201);
    canonicalPromiseId = canonicalPromise.body.id as number;
  });

  it("user can submit claims, preview duplicate assist, and post equivalence signals", async () => {
    const user = await authHeaders("claim-user-1", "user");

    const preview = await request(app)
      .post("/promise-claims/duplicate-assist-preview")
      .set(user)
      .send({
        politicianId,
        claimText: "Canonical seeded promise",
        sourceUrl: "https://example.com/new-claim-source"
      })
      .expect(200);
    expect(preview.body.canonicalMatches).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: canonicalPromiseId })])
    );

    const claim = await request(app)
      .post("/promise-claims")
      .set(user)
      .send({
        politicianId,
        claimText: "Canonical seeded promise",
        sourceUrl: "https://example.com/new-claim-source",
        dateSaid: "2026-03-18",
        sourceNote: "user-submitted source"
      })
      .expect(201);

    const detail = await request(app).get(`/promise-claims/${claim.body.id}`).set(user).expect(200);
    expect(detail.body.claim).toMatchObject({
      id: claim.body.id,
      submittedBy: "claim-user-1",
      status: "pending"
    });

    await request(app)
      .post(`/promise-claims/${claim.body.id}/equivalence-signals`)
      .set(user)
      .send({
        targetKind: "canonical_promise",
        targetId: canonicalPromiseId,
        relation: "same_as",
        reasonCode: "same_promise"
      })
      .expect(201);

    const signals = await request(app).get(`/promise-claims/${claim.body.id}/equivalence-signals`).set(user).expect(200);
    expect(signals.body.items).toEqual([
      expect.objectContaining({
        claimId: claim.body.id,
        actorId: "claim-user-1",
        targetKind: "canonical_promise",
        targetId: canonicalPromiseId,
        relation: "same_as",
        reasonCode: "same_promise"
      })
    ]);
  });

  it("moderator can claim, release, merge, and canonize promise claims with canonical history", async () => {
    const user = await authHeaders("claim-user-2", "user");
    const mergeClaim = await request(app)
      .post("/promise-claims")
      .set(user)
      .send({
        politicianId,
        claimText: "Canonical seeded promise",
        sourceUrl: "https://example.com/merge-source",
        dateSaid: "2026-03-19"
      })
      .expect(201);

    const canonizeClaim = await request(app)
      .post("/promise-claims")
      .set(user)
      .send({
        politicianId,
        claimText: "Canonized new promise",
        sourceUrl: "https://example.com/canonize-source",
        dateSaid: "2026-03-20"
      })
      .expect(201);

    const moderator = await authHeaders("claim-mod", "moderator");
    const claimAction = await request(app)
      .post(`/promise-claims/${mergeClaim.body.id}/claim`)
      .set(moderator)
      .send({ expectedVersion: 0 })
      .expect(200);
    expect(claimAction.body).toMatchObject({ ok: true, assigneeId: "claim-mod", reviewVersion: 1 });

    await request(app)
      .post(`/promise-claims/${mergeClaim.body.id}/release`)
      .set(moderator)
      .send({ expectedVersion: 1 })
      .expect(200);

    await request(app)
      .patch(`/promise-claims/${mergeClaim.body.id}/review`)
      .set(moderator)
      .send({
        decision: "merge",
        linkedCanonicalPromiseId: canonicalPromiseId,
        reasonCode: "same_promise",
        reason: "merge into existing canonical promise",
        expectedVersion: 2
      })
      .expect(200);

    const canonizeReview = await request(app)
      .patch(`/promise-claims/${canonizeClaim.body.id}/review`)
      .set(moderator)
      .send({
        decision: "canonize",
        publicStatus: "public",
        reasonCode: "same_claim",
        reason: "new canonical promise",
        expectedVersion: 0
      })
      .expect(200);
    expect(canonizeReview.body).toMatchObject({ ok: true, status: "canonized", canonicalPromiseId: expect.any(Number) });

    const mergedDetail = await request(app).get(`/promise-claims/${mergeClaim.body.id}`).set(moderator).expect(200);
    expect(mergedDetail.body.claim).toMatchObject({
      status: "merged",
      linkedCanonicalPromiseId: canonicalPromiseId
    });

    const audits = await request(app).get(`/promise-claims/${mergeClaim.body.id}/audits`).set(moderator).expect(200);
    expect(audits.body.items.map((item: { action: string }) => item.action)).toContain("merged");

    const canonicalDetail = await request(app).get(`/canonical-promises/${canonicalPromiseId}`).expect(200);
    expect(canonicalDetail.body.acceptedSources).toEqual(
      expect.arrayContaining([expect.objectContaining({ sourceUrl: "https://example.com/merge-source" })])
    );
    expect(canonicalDetail.body.history).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: "merged", claimText: "Canonical seeded promise" })])
    );
  });

  it("rejects invalid moderation and access outside submitter or moderator scope", async () => {
    const user = await authHeaders("claim-user-3", "user");
    const claim = await request(app)
      .post("/promise-claims")
      .set(user)
      .send({
        politicianId,
        claimText: "Rejection claim",
        sourceUrl: "https://example.com/reject-source",
        dateSaid: "2026-03-21"
      })
      .expect(201);

    await request(app).get(`/promise-claims/${claim.body.id}`).expect(403);

    const moderator = await authHeaders("claim-mod-2", "moderator");
    await request(app)
      .patch(`/promise-claims/${claim.body.id}/review`)
      .set(moderator)
      .send({
        decision: "reject",
        reasonCode: "insufficient_evidence",
        reason: "no public evidence",
        expectedVersion: 0
      })
      .expect(200);

    await request(app)
      .patch(`/promise-claims/${claim.body.id}/review`)
      .set(moderator)
      .send({
        decision: "reject",
        reasonCode: "insufficient_evidence",
        expectedVersion: 1
      })
      .expect(409);
  });
});

// WHAT IT DO? M9 proof: page readiness records are reviewed state separate from canonical facts.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import {
  getPageReadiness,
  getPageReadinessMap,
  upsertPageReadiness
} from "../src/db/page-readiness.js";
import { db } from "../src/db/client.js";
import { app } from "../src/server.js";

describe("page readiness", () => {
  let politicianId: number;
  let canonicalPromiseId: number;

  beforeEach(() => {
    db.exec("DELETE FROM page_readiness");
    db.exec("DELETE FROM canonical_promise_sources");
    db.exec("DELETE FROM canonical_promises");
    db.exec("DELETE FROM party_memberships");
    db.exec("DELETE FROM party_aliases");
    db.exec("DELETE FROM parties");
    db.exec("DELETE FROM statements");
    db.exec("DELETE FROM politicians");

    politicianId = db
      .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 1, ?)")
      .run("Readiness Politician", "Helsinki", "MP", "system").lastInsertRowid as number;

    db.prepare("INSERT INTO parties (id, name, short_name, created_by) VALUES (?, ?, ?, ?)").run(
      "readiness-party",
      "Readiness Party",
      "RP",
      "system"
    );

    canonicalPromiseId = db
      .prepare(
        `INSERT INTO canonical_promises (politician_id, promise_text, public_status, created_by)
         VALUES (?, ?, 'public', ?)`
      )
      .run(politicianId, "Readiness promise text", "system").lastInsertRowid as number;
  });

  it("stores reviewed page readiness for politician, party, and promise pages", () => {
    const politicianReadiness = upsertPageReadiness({
      entityKind: "politician",
      entityId: politicianId,
      readinessState: "thin_but_honest",
      freshnessCheckedAt: "2026-05-16",
      sourceCount: 1,
      missingDataKeys: ["promise_coverage"],
      provenanceSummary: "Imported from official source and reviewed by moderator.",
      reviewedBy: "moderator-1"
    });

    upsertPageReadiness({
      entityKind: "party",
      entityId: "readiness-party",
      readinessState: "ready",
      freshnessCheckedAt: "2026-05-15",
      sourceCount: 3,
      missingDataKeys: [],
      provenanceSummary: "Party identity, aliases, and membership coverage reviewed.",
      reviewedBy: "moderator-1"
    });

    upsertPageReadiness({
      entityKind: "canonical_promise",
      entityId: canonicalPromiseId,
      readinessState: "not_ready",
      freshnessCheckedAt: null,
      sourceCount: 0,
      missingDataKeys: ["accepted_sources", "fulfillment_evidence"],
      provenanceSummary: "Canonical promise exists but source bundle is incomplete.",
      reviewedBy: "moderator-2"
    });

    expect(politicianReadiness).toMatchObject({
      entityKind: "politician",
      entityId: String(politicianId),
      readinessState: "thin_but_honest",
      freshnessCheckedAt: "2026-05-16",
      sourceCount: 1,
      missingDataKeys: ["promise_coverage"],
      provenanceSummary: "Imported from official source and reviewed by moderator.",
      reviewedBy: "moderator-1"
    });

    expect(getPageReadiness("politician", politicianId)).toMatchObject({
      entityKind: "politician",
      entityId: String(politicianId),
      readinessState: "thin_but_honest",
      missingDataKeys: ["promise_coverage"]
    });

    const readinessMap = getPageReadinessMap("party", ["readiness-party", "missing-party"]);
    expect(readinessMap.get("readiness-party")).toMatchObject({
      entityKind: "party",
      entityId: "readiness-party",
      readinessState: "ready",
      missingDataKeys: []
    });
    expect(readinessMap.has("missing-party")).toBe(false);

    expect(getPageReadiness("canonical_promise", canonicalPromiseId)).toMatchObject({
      entityKind: "canonical_promise",
      entityId: String(canonicalPromiseId),
      readinessState: "not_ready",
      freshnessCheckedAt: null,
      sourceCount: 0,
      missingDataKeys: ["accepted_sources", "fulfillment_evidence"]
    });
  });

  it("exposes readiness on representative politician, party, and promise APIs", async () => {
    upsertPageReadiness({
      entityKind: "politician",
      entityId: politicianId,
      readinessState: "thin_but_honest",
      freshnessCheckedAt: "2026-05-16",
      sourceCount: 1,
      missingDataKeys: ["promise_coverage"],
      provenanceSummary: "Politician identity reviewed; promise coverage still thin.",
      reviewedBy: "moderator-1"
    });
    upsertPageReadiness({
      entityKind: "party",
      entityId: "readiness-party",
      readinessState: "ready",
      freshnessCheckedAt: "2026-05-15",
      sourceCount: 2,
      missingDataKeys: [],
      provenanceSummary: "Party identity and memberships reviewed.",
      reviewedBy: "moderator-1"
    });
    upsertPageReadiness({
      entityKind: "canonical_promise",
      entityId: canonicalPromiseId,
      readinessState: "not_ready",
      freshnessCheckedAt: null,
      sourceCount: 0,
      missingDataKeys: ["accepted_sources"],
      provenanceSummary: "Promise needs accepted-source review before broad discovery.",
      reviewedBy: "moderator-2"
    });

    const politicians = await request(app).get("/politicians").expect(200);
    expect(politicians.body.items[0].readiness).toMatchObject({
      entityKind: "politician",
      entityId: String(politicianId),
      readinessState: "thin_but_honest",
      freshnessCheckedAt: "2026-05-16",
      sourceCount: 1,
      missingDataKeys: ["promise_coverage"],
      provenanceSummary: "Politician identity reviewed; promise coverage still thin."
    });

    const parties = await request(app).get("/parties").expect(200);
    expect(parties.body.items[0].readiness).toMatchObject({
      entityKind: "party",
      entityId: "readiness-party",
      readinessState: "ready",
      missingDataKeys: []
    });

    const partyDetail = await request(app).get("/parties/readiness-party").expect(200);
    expect(partyDetail.body.party.readiness).toMatchObject({
      entityKind: "party",
      entityId: "readiness-party",
      readinessState: "ready"
    });

    const promises = await request(app).get("/canonical-promises").expect(200);
    expect(promises.body.items[0].readiness).toMatchObject({
      entityKind: "canonical_promise",
      entityId: String(canonicalPromiseId),
      readinessState: "not_ready",
      freshnessCheckedAt: null,
      sourceCount: 0,
      missingDataKeys: ["accepted_sources"]
    });

    const promiseDetail = await request(app).get(`/canonical-promises/${canonicalPromiseId}`).expect(200);
    expect(promiseDetail.body.promise.readiness).toMatchObject({
      entityKind: "canonical_promise",
      entityId: String(canonicalPromiseId),
      readinessState: "not_ready"
    });
  });

  it("uses a not-ready default when no reviewed readiness record exists", async () => {
    const politicians = await request(app).get("/politicians").expect(200);

    expect(politicians.body.items[0].readiness).toMatchObject({
      entityKind: "politician",
      entityId: String(politicianId),
      readinessState: "not_ready",
      freshnessCheckedAt: null,
      sourceCount: 0,
      missingDataKeys: ["readiness_review"],
      provenanceSummary: "No reviewed page readiness record yet.",
      reviewedAt: null
    });
  });

  it("lets moderators review page readiness and rejects ordinary users", async () => {
    const user = await authHeaders("readiness-user", "user");
    await request(app)
      .put("/ops/page-readiness")
      .set(user)
      .send({
        entityKind: "politician",
        entityId: politicianId,
        readinessState: "ready",
        freshnessCheckedAt: "2026-05-16",
        sourceCount: 4,
        missingDataKeys: [],
        provenanceSummary: "Reviewed through ops."
      })
      .expect(403);

    const moderator = await authHeaders("readiness-mod", "moderator");
    await request(app)
      .put("/ops/page-readiness")
      .set(moderator)
      .send({
        entityKind: "politician",
        entityId: politicianId,
        readinessState: "ready",
        freshnessCheckedAt: "2026-05-16",
        sourceCount: 4,
        missingDataKeys: [],
        provenanceSummary: "Reviewed through ops."
      })
      .expect(200);

    const politicians = await request(app).get("/politicians").expect(200);
    expect(politicians.body.items[0].readiness).toMatchObject({
      entityKind: "politician",
      entityId: String(politicianId),
      readinessState: "ready",
      freshnessCheckedAt: "2026-05-16",
      sourceCount: 4,
      missingDataKeys: [],
      provenanceSummary: "Reviewed through ops."
    });
  });
});

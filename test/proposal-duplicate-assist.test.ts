// WHAT IT DO? S2-T06 proof: duplicate-assist returns deterministic exact-match hints without auto-merge.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("proposal duplicate assist", () => {
  beforeEach(() => {
    db.exec("DELETE FROM politician_proposal_audits");
    db.exec("DELETE FROM politician_proposals");
    db.exec("DELETE FROM politicians");
  });

  it("returns canonical and pending exact-match hints", async () => {
    const admin = await authHeaders("assist-admin", "admin");

    const canonicalRes = await request(app)
      .post("/politicians")
      .set(admin)
      .send({ name: "Assist Canonical", region: "CA", office: "Governor", externalId: "assist-ext-1" })
      .expect(201);

    const target = db
      .prepare(
        "INSERT INTO politician_proposals (submitted_by, name, region, office, external_id, source_note, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')"
      )
      .run("assist-user", "Assist Canonical", "CA", "Governor", "assist-ext-1", "target proposal");

    db.prepare(
      "INSERT INTO politician_proposals (submitted_by, name, region, office, external_id, source_note, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')"
    ).run("assist-user-2", "Assist Canonical", "CA", "Governor", null, "normalized pending match");

    const res = await request(app)
      .get(`/politician-proposals/${target.lastInsertRowid}/duplicate-assist`)
      .set(admin)
      .expect(200);

    expect(res.body.canonicalMatches).toHaveLength(1);
    expect(res.body.canonicalMatches[0]).toMatchObject({
      id: canonicalRes.body.id,
      matchOn: expect.arrayContaining(["externalId", "normalizedKey"])
    });
    expect(res.body.pendingProposalMatches).toHaveLength(1);
    expect(res.body.pendingProposalMatches[0].matchOn).toContain("normalizedKey");
  });

  it("denies duplicate-assist access to plain users", async () => {
    const proposal = db
      .prepare(
        "INSERT INTO politician_proposals (submitted_by, name, region, office, external_id, source_note, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')"
      )
      .run("assist-user-3", "Assist Access", "CA", "Mayor", null, null);

    const userHeaders = await authHeaders("assist-user-3", "user");
    await request(app)
      .get(`/politician-proposals/${proposal.lastInsertRowid}/duplicate-assist`)
      .set(userHeaders)
      .expect(403);
  });
});

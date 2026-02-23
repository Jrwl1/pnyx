// WHAT IT DO? S0-T05 proof: verification lifecycle transitions, downgrade reasons, and audit recording.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("verification transitions", () => {
  let statementId: number;

  beforeEach(async () => {
    db.exec("DELETE FROM revision_audits");
    db.exec("DELETE FROM votes");
    db.exec("DELETE FROM statements");
    db.exec("DELETE FROM politicians");

    const politician = db
      .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 0, ?)")
      .run("Verifier", "ZZ", "Tester", "system");

    const userHeaders = await authHeaders("author-verify", "user");
    const createRes = await request(app)
      .post("/statements")
      .set(userHeaders)
      .send({
        politicianId: politician.lastInsertRowid,
        sourceUrl: "https://example.com/verify",
        body: "Verification target",
        dateSaid: "2025-01-01"
      })
      .expect(201);

    statementId = createRes.body.id as number;
  });

  it("only moderator/admin can change verification status", async () => {
    const userHeaders = await authHeaders("plain-user", "user");
    await request(app)
      .patch(`/statements/${statementId}/verification`)
      .set(userHeaders)
      .send({ newStatus: "verified" })
      .expect(403);

    const modHeaders = await authHeaders("mod-1", "moderator");
    await request(app)
      .patch(`/statements/${statementId}/verification`)
      .set(modHeaders)
      .send({ newStatus: "verified" })
      .expect(200);
  });

  it("enforces allowed transitions and returns 409 for invalid or no-op transitions", async () => {
    const modHeaders = await authHeaders("mod-2", "moderator");

    await request(app)
      .patch(`/statements/${statementId}/verification`)
      .set(modHeaders)
      .send({ newStatus: "pending" })
      .expect(409);

    await request(app)
      .patch(`/statements/${statementId}/verification`)
      .set(modHeaders)
      .send({ newStatus: "verified" })
      .expect(200);

    await request(app)
      .patch(`/statements/${statementId}/verification`)
      .set(modHeaders)
      .send({ newStatus: "pending" })
      .expect(409);

    await request(app)
      .patch(`/statements/${statementId}/verification`)
      .set(modHeaders)
      .send({ newStatus: "bogus" })
      .expect(409);
  });

  it("requires reason for downgrade transitions", async () => {
    const modHeaders = await authHeaders("mod-3", "moderator");

    await request(app)
      .patch(`/statements/${statementId}/verification`)
      .set(modHeaders)
      .send({ newStatus: "verified" })
      .expect(200);

    await request(app)
      .patch(`/statements/${statementId}/verification`)
      .set(modHeaders)
      .send({ newStatus: "disputed" })
      .expect(400);

    await request(app)
      .patch(`/statements/${statementId}/verification`)
      .set(modHeaders)
      .send({ newStatus: "disputed", reason: "conflicting source" })
      .expect(200);
  });

  it("records transition audit rows", async () => {
    const adminHeaders = await authHeaders("admin-1", "admin");

    await request(app)
      .patch(`/statements/${statementId}/verification`)
      .set(adminHeaders)
      .send({ newStatus: "verified" })
      .expect(200);

    await request(app)
      .patch(`/statements/${statementId}/verification`)
      .set(adminHeaders)
      .send({ newStatus: "rejected", reason: "source misquoted" })
      .expect(200);

    const audits = db
      .prepare(
        "SELECT change_type AS changeType, from_value AS fromValue, to_value AS toValue, reason FROM revision_audits WHERE statement_id = ? ORDER BY id"
      )
      .all(statementId) as {
      changeType: string;
      fromValue: string | null;
      toValue: string | null;
      reason: string | null;
    }[];

    const verificationAudits = audits.filter((audit) => audit.changeType === "verification_status");
    expect(verificationAudits).toHaveLength(2);
    expect(verificationAudits[0]).toMatchObject({ fromValue: "pending", toValue: "verified", reason: null });
    expect(verificationAudits[1]).toMatchObject({ fromValue: "verified", toValue: "rejected", reason: "source misquoted" });
  });

  it("returns 404 when statement does not exist", async () => {
    const modHeaders = await authHeaders("mod-4", "moderator");
    await request(app)
      .patch("/statements/999999/verification")
      .set(modHeaders)
      .send({ newStatus: "verified" })
      .expect(404);
  });
});

// WHAT IT DO? S0-T04 proof: statement edit policy (author 30min window, moderator/admin override, RevisionAudit per edit).
import { describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("edit window and audit", () => {
  let politicianId: number;

  beforeEach(() => {
    db.exec("DELETE FROM revision_audits");
    db.exec("DELETE FROM statements");
    db.exec("DELETE FROM politicians");
    const r = db
      .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 0, ?)")
      .run("Test Politician", "XX", "Tester", "system");
    politicianId = r.lastInsertRowid as number;
  });

  it("author edits within 30 minutes succeed", async () => {
    const headers = await authHeaders("author-1", "user");
    const createRes = await request(app)
      .post("/statements")
      .set(headers)
      .send({
        politicianId,
        sourceUrl: "https://example.com/1",
        body: "Original body",
        dateSaid: "2025-01-01"
      })
      .expect(201);
    const statementId = createRes.body.id;

    const patchRes = await request(app)
      .patch(`/statements/${statementId}`)
      .set(headers)
      .send({ body: "Updated body" })
      .expect(200);

    expect(patchRes.body).toMatchObject({ ok: true, updatedAt: expect.any(String) });

    const listRes = await request(app).get("/statements").expect(200);
    expect(listRes.body.items[0].body).toBe("Updated body");
  });

  it("author edits after 30 minutes are denied with 403", async () => {
    const hash = "a".repeat(64);
    const fp = "b".repeat(64);
    db.prepare(
      `INSERT INTO statements (politician_id, source_url, body, date_said, normalized_body_hash, statement_fingerprint, verification_status, author_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now', '-31 minutes'), datetime('now', '-31 minutes'))`
    ).run(politicianId, "https://example.com/old", "Old body", "2025-01-01", hash, fp, "author-1");
    const statementId = db.prepare("SELECT id FROM statements WHERE author_id = 'author-1' LIMIT 1").get() as { id: number };
    const id = statementId.id;

    const headers = await authHeaders("author-1", "user");
    await request(app)
      .patch(`/statements/${id}`)
      .set(headers)
      .send({ body: "Too late edit" })
      .expect(403);
  });

  it("moderator can edit any non-deleted statement", async () => {
    const hash = "c".repeat(64);
    const fp = "d".repeat(64);
    db.prepare(
      `INSERT INTO statements (politician_id, source_url, body, date_said, normalized_body_hash, statement_fingerprint, verification_status, author_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now', '-31 minutes'), datetime('now', '-31 minutes'))`
    ).run(politicianId, "https://example.com/m", "Mod target", "2025-01-01", hash, fp, "other-user");
    const row = db.prepare("SELECT id FROM statements WHERE author_id = 'other-user' LIMIT 1").get() as { id: number };
    const id = row.id;

    const modHeaders = await authHeaders("mod-1", "moderator");
    const res = await request(app)
      .patch(`/statements/${id}`)
      .set(modHeaders)
      .send({ body: "Moderator edit" })
      .expect(200);
    expect(res.body).toMatchObject({ ok: true });
  });

  it("admin can edit any non-deleted statement", async () => {
    const hash = "e".repeat(64);
    const fp = "f".repeat(64);
    db.prepare(
      `INSERT INTO statements (politician_id, source_url, body, date_said, normalized_body_hash, statement_fingerprint, verification_status, author_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now', '-31 minutes'), datetime('now', '-31 minutes'))`
    ).run(politicianId, "https://example.com/a", "Admin target", "2025-01-01", hash, fp, "other-user");
    const row = db.prepare("SELECT id FROM statements WHERE author_id = 'other-user' LIMIT 1").get() as { id: number };
    const id = row.id;

    const adminHeaders = await authHeaders("admin-1", "admin");
    const res = await request(app)
      .patch(`/statements/${id}`)
      .set(adminHeaders)
      .send({ body: "Admin edit" })
      .expect(200);
    expect(res.body).toMatchObject({ ok: true });
  });

  it("non-author user cannot edit within window (only author has window)", async () => {
    const headers = await authHeaders("author-2", "user");
    const createRes = await request(app)
      .post("/statements")
      .set(headers)
      .send({
        politicianId,
        sourceUrl: "https://example.com/x",
        body: "Author two statement",
        dateSaid: "2025-01-01"
      })
      .expect(201);
    const statementId = createRes.body.id;

    const otherHeaders = await authHeaders("other-user", "user");
    await request(app)
      .patch(`/statements/${statementId}`)
      .set(otherHeaders)
      .send({ body: "Hijack" })
      .expect(403);
  });

  it("statement not found returns 404", async () => {
    const headers = await authHeaders();
    await request(app).patch("/statements/99999").set(headers).send({ body: "No" }).expect(404);
  });

  it("each edit writes a RevisionAudit row with changeType editStatement", async () => {
    const headers = await authHeaders("audit-user", "user");
    const createRes = await request(app)
      .post("/statements")
      .set(headers)
      .send({
        politicianId,
        sourceUrl: "https://example.com/audit",
        body: "Before",
        dateSaid: "2025-01-01"
      })
      .expect(201);
    const statementId = createRes.body.id;

    await request(app)
      .patch(`/statements/${statementId}`)
      .set(headers)
      .send({ body: "After" })
      .expect(200);

    const audits = db
      .prepare("SELECT change_type AS changeType, from_value AS fromValue, to_value AS toValue FROM revision_audits WHERE statement_id = ? ORDER BY id")
      .all(statementId) as { changeType: string; fromValue: string | null; toValue: string | null }[];

    expect(audits).toHaveLength(2);
    expect(audits[0].changeType).toBe("createStatement");
    expect(audits[1].changeType).toBe("editStatement");
    expect(audits[1].fromValue).toContain("Before");
    expect(audits[1].toValue).toContain("After");
  });
});

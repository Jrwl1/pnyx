// WHAT IT DO? S0-T07 proof: withdraw/pending-delete/approve-delete lifecycle and role-aware list visibility.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("delete lifecycle visibility", () => {
  let politicianId: number;

  beforeEach(() => {
    db.exec("DELETE FROM revision_audits");
    db.exec("DELETE FROM votes");
    db.exec("DELETE FROM statements");
    db.exec("DELETE FROM politicians");
    const row = db
      .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 0, ?)")
      .run("Lifecycle", "ZZ", "Tester", "system");
    politicianId = row.lastInsertRowid as number;
  });

  const createStatement = async (authorId: string): Promise<number> => {
    const headers = await authHeaders(authorId, "user");
    const res = await request(app)
      .post("/statements")
      .set(headers)
      .send({
        politicianId,
        sourceUrl: `https://example.com/${authorId}`,
        body: `statement-${authorId}`,
        dateSaid: "2025-01-01"
      })
      .expect(201);
    return res.body.id as number;
  };

  it("author withdraw soft-deletes statement", async () => {
    const statementId = await createStatement("author-withdraw");
    const headers = await authHeaders("author-withdraw", "user");

    await request(app)
      .post(`/statements/${statementId}/withdraw`)
      .set(headers)
      .expect(200);

    const row = db
      .prepare("SELECT withdrawn_at AS withdrawnAt, deleted_at AS deletedAt FROM statements WHERE id = ?")
      .get(statementId) as { withdrawnAt: string | null; deletedAt: string | null };
    expect(row.withdrawnAt).not.toBeNull();
    expect(row.deletedAt).not.toBeNull();

    const auditRows = db
      .prepare(
        "SELECT actor_id AS actorId, change_type AS changeType, to_value AS toValue FROM revision_audits WHERE statement_id = ? ORDER BY id ASC"
      )
      .all(statementId) as { actorId: string; changeType: string; toValue: string | null }[];
    expect(auditRows.at(-1)).toMatchObject({
      actorId: "author-withdraw",
      changeType: "withdrawStatement",
      toValue: "withdrawn_deleted"
    });
  });

  it("non-author cannot withdraw", async () => {
    const statementId = await createStatement("owner-1");
    const otherUser = await authHeaders("intruder", "user");

    await request(app)
      .post(`/statements/${statementId}/withdraw`)
      .set(otherUser)
      .expect(403);
  });

  it("moderator/admin can propose delete and only admin can approve delete", async () => {
    const statementId = await createStatement("owner-2");
    const modHeaders = await authHeaders("mod-1", "moderator");

    await request(app)
      .post(`/statements/${statementId}/pending-delete`)
      .set(modHeaders)
      .expect(200);

    await request(app)
      .post(`/statements/${statementId}/approve-delete`)
      .set(modHeaders)
      .expect(403);

    const adminHeaders = await authHeaders("admin-1", "admin");
    await request(app)
      .post(`/statements/${statementId}/approve-delete`)
      .set(adminHeaders)
      .expect(200);

    const row = db
      .prepare("SELECT deleted_at AS deletedAt, pending_delete AS pendingDelete FROM statements WHERE id = ?")
      .get(statementId) as { deletedAt: string | null; pendingDelete: number };
    expect(row.deletedAt).not.toBeNull();
    expect(row.pendingDelete).toBe(0);

    const auditRows = db
      .prepare(
        "SELECT actor_id AS actorId, change_type AS changeType, to_value AS toValue FROM revision_audits WHERE statement_id = ? ORDER BY id ASC"
      )
      .all(statementId) as { actorId: string; changeType: string; toValue: string | null }[];
    expect(
      auditRows.some(
        (auditRow) =>
          auditRow.actorId === "mod-1" &&
          auditRow.changeType === "pendingDeleteStatement" &&
          auditRow.toValue === "pending_delete"
      )
    ).toBe(true);
    expect(
      auditRows.some(
        (auditRow) =>
          auditRow.actorId === "admin-1" &&
          auditRow.changeType === "approveDeleteStatement" &&
          auditRow.toValue === "deleted"
      )
    ).toBe(true);
  });

  it("public/user exclude pending+deleted by default; mod/admin include pending by default", async () => {
    const activeId = await createStatement("author-active");
    const pendingId = await createStatement("author-pending");
    const deletedId = await createStatement("author-deleted");

    const modHeaders = await authHeaders("mod-2", "moderator");
    await request(app)
      .post(`/statements/${pendingId}/pending-delete`)
      .set(modHeaders)
      .expect(200);

    const deletedAuthorHeaders = await authHeaders("author-deleted", "user");
    await request(app)
      .post(`/statements/${deletedId}/withdraw`)
      .set(deletedAuthorHeaders)
      .expect(200);

    const publicList = await request(app).get("/statements").expect(200);
    expect(publicList.body.items.map((item: { id: number }) => item.id)).toEqual([activeId]);

    const userHeaders = await authHeaders("viewer-user", "user");
    const userList = await request(app).get("/statements").set(userHeaders).expect(200);
    expect(userList.body.items.map((item: { id: number }) => item.id)).toEqual([activeId]);

    const modList = await request(app).get("/statements").set(modHeaders).expect(200);
    expect(modList.body.items.map((item: { id: number }) => item.id).sort((a: number, b: number) => a - b)).toEqual([
      activeId,
      pendingId
    ]);

    const adminHeaders = await authHeaders("admin-2", "admin");
    const adminList = await request(app).get("/statements").set(adminHeaders).expect(200);
    expect(adminList.body.items.map((item: { id: number }) => item.id).sort((a: number, b: number) => a - b)).toEqual([
      activeId,
      pendingId
    ]);
  });
});

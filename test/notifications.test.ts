// WHAT IT DO? Proves notification preferences and role/review notifications work through the new `/me` APIs.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

const clearAllTables = (): void => {
  db.exec("DELETE FROM notification_deliveries");
  db.exec("DELETE FROM notifications");
  db.exec("DELETE FROM notification_preferences");
  db.exec("DELETE FROM product_events");
  db.exec("DELETE FROM promise_claim_audits");
  db.exec("DELETE FROM promise_claims");
  db.exec("DELETE FROM politician_proposal_audits");
  db.exec("DELETE FROM politician_proposals");
  db.exec("DELETE FROM revision_audits");
  db.exec("DELETE FROM statements");
  db.exec("DELETE FROM auth_login_codes");
  db.exec("DELETE FROM politicians");
  db.exec("DELETE FROM users");
};

describe("notifications", () => {
  beforeEach(() => {
    clearAllTables();
  });

  it("stores preferences and creates role and review notifications with delivery rows", async () => {
    const targetRegister = await request(app)
      .post("/auth/register")
      .send({ email: "notify-target@example.fi", captchaToken: "test-captcha-pass" })
      .expect(201);
    const submitterRegister = await request(app)
      .post("/auth/register")
      .send({ email: "notify-submitter@example.fi", captchaToken: "test-captcha-pass" })
      .expect(201);

    const targetHeaders = await authHeaders(targetRegister.body.id, "user");
    const submitterHeaders = await authHeaders(submitterRegister.body.id, "user");
    const adminHeaders = await authHeaders("notify-admin", "admin");
    const moderatorHeaders = await authHeaders("notify-mod", "moderator");

    const defaultPreferences = await request(app).get("/me/notification-preferences").set(targetHeaders).expect(200);
    expect(defaultPreferences.body).toMatchObject({
      userId: targetRegister.body.id,
      inAppEnabled: 1,
      emailEnabled: 0,
      reviewUpdatesEnabled: 1,
      roleUpdatesEnabled: 1
    });

    const updatedPreferences = await request(app)
      .patch("/me/notification-preferences")
      .set(targetHeaders)
      .send({ emailEnabled: true })
      .expect(200);
    expect(updatedPreferences.body).toMatchObject({
      userId: targetRegister.body.id,
      emailEnabled: 1
    });

    await request(app)
      .post("/auth/role-grants")
      .set(adminHeaders)
      .send({ email: "notify-target@example.fi", role: "moderator" })
      .expect(200);

    const targetNotifications = await request(app).get("/me/notifications").set(targetHeaders).expect(200);
    expect(targetNotifications.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          notificationType: "role_granted",
          title: "Your PNYX role changed"
        })
      ])
    );

    const roleNotificationId = targetNotifications.body.items.find(
      (item: { notificationType: string }) => item.notificationType === "role_granted"
    ).id as number;
    const deliveries = db
      .prepare(
        "SELECT channel, delivery_state AS deliveryState FROM notification_deliveries WHERE notification_id = ? ORDER BY channel"
      )
      .all(roleNotificationId) as Array<{ channel: string; deliveryState: string }>;
    expect(deliveries).toEqual([
      { channel: "email", deliveryState: "pending" },
      { channel: "inapp", deliveryState: "delivered" }
    ]);

    const politicianId = db
      .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 0, ?)")
      .run("Notify Politician", "Espoo", "MP", "system").lastInsertRowid as number;

    const proposalRes = await request(app)
      .post("/politician-proposals")
      .set(submitterHeaders)
      .send({ name: "Notify Proposal", captchaToken: "test-captcha-pass" })
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

    const statementRes = await request(app)
      .post("/statements")
      .set(submitterHeaders)
      .send({
        politicianId,
        sourceUrl: "https://example.fi/notify-statement",
        body: "Notify statement promise",
        dateSaid: "2026-03-18"
      })
      .expect(201);

    const claimRes = await request(app)
      .post("/promise-claims")
      .set(submitterHeaders)
      .send({
        politicianId,
        claimText: "Notify promise claim",
        sourceUrl: "https://example.fi/notify-claim",
        dateSaid: "2026-03-18"
      })
      .expect(201);

    await request(app)
      .post(`/promise-claims/${claimRes.body.id}/claim`)
      .set(moderatorHeaders)
      .send({ expectedVersion: 0 })
      .expect(200);

    const canonicalPromiseRes = await request(app)
      .post("/canonical-promises")
      .set(moderatorHeaders)
      .send({
        politicianId,
        promiseText: "Notify canonical promise",
        publicStatus: "public",
        primaryStatementId: statementRes.body.id
      })
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

    const submitterNotifications = await request(app).get("/me/notifications").set(submitterHeaders).expect(200);
    expect(submitterNotifications.body.items.map((item: { notificationType: string }) => item.notificationType)).toEqual(
      expect.arrayContaining(["politician_proposal_reviewed", "promise_claim_reviewed"])
    );

    const unreadNotifications = await request(app).get("/me/notifications?status=unread").set(submitterHeaders).expect(200);
    expect(unreadNotifications.body.total).toBeGreaterThanOrEqual(2);

    const notificationToMarkRead = submitterNotifications.body.items[0].id as number;
    await request(app).post(`/me/notifications/${notificationToMarkRead}/read`).set(submitterHeaders).expect(200);

    const notificationRow = db
      .prepare("SELECT read_at AS readAt FROM notifications WHERE id = ?")
      .get(notificationToMarkRead) as { readAt: string | null };
    expect(notificationRow.readAt).not.toBeNull();
  });
});

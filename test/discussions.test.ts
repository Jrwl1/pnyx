// WHAT IT DO? M9 proof: bounded discussion and reports stay separate from canonical truth.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("bounded discussions", () => {
  let politicianId: number;
  let canonicalPromiseId: number;

  beforeEach(() => {
    db.exec("DELETE FROM discussion_moderation_actions");
    db.exec("DELETE FROM discussion_reports");
    db.exec("DELETE FROM discussion_comments");
    db.exec("DELETE FROM discussion_threads");
    db.exec("DELETE FROM canonical_promise_sources");
    db.exec("DELETE FROM canonical_promises");
    db.exec("DELETE FROM politicians");

    politicianId = db
      .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 1, ?)")
      .run("Discussion Politician", "Uusimaa", "MP", "system").lastInsertRowid as number;

    canonicalPromiseId = db
      .prepare(
        `INSERT INTO canonical_promises (politician_id, promise_text, public_status, created_by)
         VALUES (?, ?, 'public', ?)`
      )
      .run(politicianId, "Discussion promise text", "system").lastInsertRowid as number;
  });

  it("creates politician discussion, reports a comment, and moderates it without changing canonical facts", async () => {
    const user = await authHeaders("discussion-user", "user");
    const moderator = await authHeaders("discussion-mod", "moderator");

    const createdThread = await request(app)
      .post("/discussions")
      .set(user)
      .send({
        entityKind: "politician",
        entityId: politicianId,
        title: "Source context question",
        body: "Can someone add the source for this promise context?"
      })
      .expect(201);

    expect(createdThread.body.thread).toMatchObject({
      entityKind: "politician",
      entityId: String(politicianId),
      title: "Source context question",
      status: "open"
    });
    expect(createdThread.body.comments[0]).toMatchObject({
      body: "Can someone add the source for this promise context?",
      status: "visible"
    });

    const comment = await request(app)
      .post(`/discussions/${createdThread.body.thread.id}/comments`)
      .set(user)
      .send({ body: "This comment needs moderator review." })
      .expect(201);

    await request(app)
      .post(`/discussion-comments/${comment.body.comment.id}/reports`)
      .set(user)
      .send({ reason: "source_problem" })
      .expect(201);

    const reports = await request(app).get("/ops/discussion-reports").set(moderator).expect(200);
    expect(reports.body.items[0]).toMatchObject({
      targetKind: "comment",
      targetId: comment.body.comment.id,
      reason: "source_problem",
      status: "pending"
    });

    await request(app)
      .patch(`/ops/discussion-comments/${comment.body.comment.id}/moderation`)
      .set(moderator)
      .send({ action: "hide", reason: "Needs source review" })
      .expect(200);

    await request(app)
      .patch(`/ops/discussions/${createdThread.body.thread.id}/moderation`)
      .set(moderator)
      .send({ action: "lock", reason: "Paused during source review" })
      .expect(200);

    const publicThreads = await request(app)
      .get(`/discussions?entityKind=politician&entityId=${politicianId}`)
      .expect(200);
    expect(publicThreads.body.items[0].thread.status).toBe("locked");
    expect(publicThreads.body.items[0].comments.some((entry: { id: number }) => entry.id === comment.body.comment.id)).toBe(false);

    await request(app)
      .patch(`/ops/discussion-comments/${comment.body.comment.id}/moderation`)
      .set(moderator)
      .send({ action: "restore", reason: "Reviewed and restored" })
      .expect(200);

    await request(app)
      .patch(`/ops/discussions/${createdThread.body.thread.id}/moderation`)
      .set(moderator)
      .send({ action: "escalate", reason: "Needs editorial decision" })
      .expect(200);

    const canonicalPromise = db
      .prepare("SELECT promise_text AS promiseText FROM canonical_promises WHERE id = ?")
      .get(canonicalPromiseId) as { promiseText: string };
    expect(canonicalPromise.promiseText).toBe("Discussion promise text");
  });

  it("supports canonical promise discussion and rejects detached global threads", async () => {
    const user = await authHeaders("promise-discussion-user", "user");

    await request(app)
      .post("/discussions")
      .set(user)
      .send({
        entityKind: "canonical_promise",
        entityId: canonicalPromiseId,
        title: "Fulfillment evidence",
        body: "This promise needs a newer fulfillment source."
      })
      .expect(201);

    const promiseThreads = await request(app)
      .get(`/discussions?entityKind=canonical_promise&entityId=${canonicalPromiseId}`)
      .expect(200);
    expect(promiseThreads.body.items[0].thread).toMatchObject({
      entityKind: "canonical_promise",
      entityId: String(canonicalPromiseId),
      title: "Fulfillment evidence"
    });

    await request(app)
      .post("/discussions")
      .set(user)
      .send({
        entityKind: "global",
        entityId: "front-page",
        title: "Global forum",
        body: "This should not exist."
      })
      .expect(400);
  });
});

// WHAT IT DO? S2-T09 proof: dedicated rate limits for proposal moderation operations and create paths.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app, resetRateLimitState } from "../src/server.js";
import { db } from "../src/db/client.js";

const rateLimitHeaders = (scope: string): Record<string, string> => ({
  "x-enable-rate-limit-test": "1",
  "x-rate-limit-test-key": scope
});

describe("proposal rate limit", () => {
  beforeEach(() => {
    resetRateLimitState();
    db.exec("DELETE FROM politician_proposal_audits");
    db.exec("DELETE FROM politician_proposals");
    db.exec("DELETE FROM politicians");
  });

  it("limits proposal submit endpoint with clear 429", async () => {
    const userHeaders = await authHeaders("proposal-rate-user", "user");
    const headers = { ...userHeaders, ...rateLimitHeaders("proposal-submit") };

    await request(app).post("/politician-proposals").set(headers).send({ name: "Proposal RL 1" }).expect(201);
    await request(app).post("/politician-proposals").set(headers).send({ name: "Proposal RL 2" }).expect(201);

    const limited = await request(app)
      .post("/politician-proposals")
      .set(headers)
      .send({ name: "Proposal RL 3" })
      .expect(429);
    expect(String(limited.body.message)).toContain("politician-proposal");
  });

  it("limits moderated politician create endpoint with clear 429", async () => {
    const modHeaders = await authHeaders("proposal-rate-mod", "moderator");
    const headers = { ...modHeaders, ...rateLimitHeaders("politician-create") };

    await request(app).post("/politicians").set(headers).send({ name: "Create RL 1" }).expect(201);
    await request(app).post("/politicians").set(headers).send({ name: "Create RL 2" }).expect(201);

    const limited = await request(app)
      .post("/politicians")
      .set(headers)
      .send({ name: "Create RL 3" })
      .expect(429);
    expect(String(limited.body.message)).toContain("politician-create");
  });

  it("limits claim/release moderation operations", async () => {
    const user = await authHeaders("proposal-rate-user-ops", "user");
    const submit = await request(app)
      .post("/politician-proposals")
      .set(user)
      .send({ name: "Rate Ops Target" })
      .expect(201);

    const mod = await authHeaders("proposal-rate-mod-ops", "moderator");
    const headers = { ...mod, ...rateLimitHeaders("proposal-claim") };

    const claim = await request(app)
      .post(`/politician-proposals/${submit.body.id}/claim`)
      .set(headers)
      .send({ expectedVersion: 0 })
      .expect(200);

    await request(app)
      .post(`/politician-proposals/${submit.body.id}/release`)
      .set(headers)
      .send({ expectedVersion: claim.body.reviewVersion })
      .expect(200);

    const limited = await request(app)
      .post(`/politician-proposals/${submit.body.id}/claim`)
      .set(headers)
      .send({ expectedVersion: claim.body.reviewVersion + 1 })
      .expect(429);
    expect(String(limited.body.message)).toContain("proposal-claim");
  });

  it("limits review and duplicate-assist moderation operations", async () => {
    const user = await authHeaders("proposal-rate-user-review", "user");
    const p1 = await request(app).post("/politician-proposals").set(user).send({ name: "Review RL 1" }).expect(201);
    const p2 = await request(app).post("/politician-proposals").set(user).send({ name: "Review RL 2" }).expect(201);
    const p3 = await request(app).post("/politician-proposals").set(user).send({ name: "Review RL 3" }).expect(201);

    const mod = await authHeaders("proposal-rate-mod-review", "moderator");
    const reviewHeaders = { ...mod, ...rateLimitHeaders("proposal-review") };

    await request(app)
      .patch(`/politician-proposals/${p1.body.id}/review`)
      .set(reviewHeaders)
      .send({ decision: "reject", reasonCode: "out_of_scope", reason: "r1", expectedVersion: 0 })
      .expect(200);
    await request(app)
      .patch(`/politician-proposals/${p2.body.id}/review`)
      .set(reviewHeaders)
      .send({ decision: "reject", reasonCode: "out_of_scope", reason: "r2", expectedVersion: 0 })
      .expect(200);

    const limitedReview = await request(app)
      .patch(`/politician-proposals/${p3.body.id}/review`)
      .set(reviewHeaders)
      .send({ decision: "reject", reasonCode: "out_of_scope", reason: "r3", expectedVersion: 0 })
      .expect(429);
    expect(String(limitedReview.body.message)).toContain("proposal-review");

    const assistHeaders = { ...mod, ...rateLimitHeaders("proposal-assist") };
    await request(app)
      .get(`/politician-proposals/${p3.body.id}/duplicate-assist`)
      .set(assistHeaders)
      .expect(200);
    await request(app)
      .get(`/politician-proposals/${p3.body.id}/duplicate-assist`)
      .set(assistHeaders)
      .expect(200);

    const limitedAssist = await request(app)
      .get(`/politician-proposals/${p3.body.id}/duplicate-assist`)
      .set(assistHeaders)
      .expect(429);
    expect(String(limitedAssist.body.message)).toContain("proposal-assist");
  });
});

// WHAT IT DO? S1-T09 proof: dedicated rate limits for proposal submit and moderated canonical politician create.
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
});

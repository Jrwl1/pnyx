// WHAT IT DO? S0-T10 proof: rate limits for login/register/add-statement/vote plus global fallback return clear 429 responses.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app, resetRateLimitState } from "../src/server.js";
import { db } from "../src/db/client.js";

const rateLimitHeaders = (scope: string): Record<string, string> => ({
  "x-enable-rate-limit-test": "1",
  "x-rate-limit-test-key": scope
});

describe("rate limit 429", () => {
  beforeEach(() => {
    resetRateLimitState();
    db.exec("DELETE FROM revision_audits");
    db.exec("DELETE FROM votes");
    db.exec("DELETE FROM statements");
    db.exec("DELETE FROM politicians");
    db.exec("DELETE FROM users");
  });

  it("limits login and returns 429 with clear message", async () => {
    const headers = rateLimitHeaders("login");
    for (let i = 0; i < 3; i += 1) {
      await request(app)
        .post("/auth/request-code")
        .set(headers)
        .send({ email: "rate-login-user@example.fi" })
        .expect(202);
    }

    const limited = await request(app)
      .post("/auth/request-code")
      .set(headers)
      .send({ email: "rate-login-user@example.fi" })
      .expect(429);

    expect(limited.body).toMatchObject({ error: "rate_limited" });
    expect(String(limited.body.message)).toContain("login");
  });

  it("limits register endpoint and returns 429", async () => {
    const headers = rateLimitHeaders("register");
    await request(app)
      .post("/auth/register")
      .set(headers)
      .send({ email: "r1@example.com" })
      .expect(201);
    await request(app)
      .post("/auth/register")
      .set(headers)
      .send({ email: "r2@example.com" })
      .expect(201);

    const limited = await request(app)
      .post("/auth/register")
      .set(headers)
      .send({ email: "r3@example.com" })
      .expect(429);
    expect(String(limited.body.message)).toContain("register");
  });

  it("limits add-statement and vote write paths", async () => {
    const userHeaders = await authHeaders("rate-writer", "user");
    const createHeaders = { ...userHeaders, ...rateLimitHeaders("add-statement") };

    const politician = db
      .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 0, ?)")
      .run("Rate Limit", "ZZ", "Tester", "system");
    const politicianId = politician.lastInsertRowid as number;

    await request(app)
      .post("/statements")
      .set(createHeaders)
      .send({ politicianId, sourceUrl: "https://example.com/rate-1", body: "one", dateSaid: "2025-01-01" })
      .expect(201);
    const second = await request(app)
      .post("/statements")
      .set(createHeaders)
      .send({ politicianId, sourceUrl: "https://example.com/rate-2", body: "two", dateSaid: "2025-01-01" })
      .expect(201);
    await request(app)
      .post("/statements")
      .set(createHeaders)
      .send({ politicianId, sourceUrl: "https://example.com/rate-3", body: "three", dateSaid: "2025-01-01" })
      .expect(429);

    const statementId = second.body.id as number;
    const voterHeaders = await authHeaders("rate-voter", "user");
    const voteHeaders = { ...voterHeaders, ...rateLimitHeaders("vote") };

    await request(app)
      .post(`/statements/${statementId}/votes`)
      .set(voteHeaders)
      .send({ value: "support" })
      .expect(200);
    await request(app)
      .post(`/statements/${statementId}/votes`)
      .set(voteHeaders)
      .send({ value: "oppose" })
      .expect(200);

    const limitedVote = await request(app)
      .post(`/statements/${statementId}/votes`)
      .set(voteHeaders)
      .send({ value: "support" })
      .expect(429);
    expect(String(limitedVote.body.message)).toContain("vote");
  });

  it("applies global fallback limit with 429", async () => {
    const headers = rateLimitHeaders("global");
    for (let i = 0; i < 8; i += 1) {
      await request(app).get("/health").set(headers).expect(200);
    }

    const limited = await request(app).get("/health").set(headers).expect(429);
    expect(String(limited.body.message)).toContain("global");
  });
});

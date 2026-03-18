// WHAT IT DO? S5-T05 proof: abuse telemetry surfaces expose captcha and rate-limit outcomes.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app, resetAbuseTelemetryState, resetRateLimitState } from "../src/server.js";
import { db } from "../src/db/client.js";

const rateLimitHeaders = (scope: string): Record<string, string> => ({
  "x-enable-rate-limit-test": "1",
  "x-rate-limit-test-key": scope
});

const captchaHeaders = (): Record<string, string> => ({
  "x-enable-captcha-test": "1"
});

describe("abuse telemetry", () => {
  beforeEach(() => {
    resetRateLimitState();
    resetAbuseTelemetryState();
    db.exec("DELETE FROM users");
    db.exec("DELETE FROM politician_proposal_audits");
    db.exec("DELETE FROM politician_proposals");
    db.exec("DELETE FROM politicians");
  });

  it("reports captcha and rate-limit outcomes", async () => {
    const loginHeaders = rateLimitHeaders("telemetry-login");
    for (let index = 0; index < 3; index += 1) {
      await request(app)
        .post("/auth/request-code")
        .set(loginHeaders)
        .send({ email: "telemetry-user@example.fi" })
        .expect(202);
    }
    await request(app)
      .post("/auth/request-code")
      .set(loginHeaders)
      .send({ email: "telemetry-user@example.fi" })
      .expect(429);

    await request(app)
      .post("/auth/register")
      .set(captchaHeaders())
      .send({ email: "telemetry-missing@example.com" })
      .expect(400);
    await request(app)
      .post("/auth/register")
      .set(captchaHeaders())
      .send({ email: "telemetry-invalid@example.com", captchaToken: "wrong-token" })
      .expect(403);
    await request(app)
      .post("/auth/register")
      .set(captchaHeaders())
      .send({ email: "telemetry-valid@example.com", captchaToken: "test-captcha-pass" })
      .expect(201);

    const user = await authHeaders("telemetry-proposal-user", "user");
    await request(app)
      .post("/politician-proposals")
      .set({ ...user, ...captchaHeaders() })
      .send({ name: "Telemetry Proposal Missing" })
      .expect(400);
    await request(app)
      .post("/politician-proposals")
      .set({ ...user, ...captchaHeaders() })
      .send({ name: "Telemetry Proposal Valid", captchaToken: "test-captcha-pass" })
      .expect(201);

    const mod = await authHeaders("telemetry-mod", "moderator");
    const metrics = await request(app).get("/abuse/metrics").set(mod).expect(200);

    expect(metrics.body.captcha.register).toMatchObject({
      checked: 3,
      passed: 1,
      failed: 1,
      missing: 1
    });
    expect(metrics.body.captcha.proposalSubmit).toMatchObject({
      checked: 2,
      passed: 1,
      failed: 0,
      missing: 1
    });
    expect(metrics.body.rateLimit.login).toMatchObject({
      allowed: 3,
      blocked: 1
    });
  });

  it("denies abuse metrics access to plain users", async () => {
    const user = await authHeaders("telemetry-plain-user", "user");
    await request(app).get("/abuse/metrics").set(user).expect(403);
  });
});

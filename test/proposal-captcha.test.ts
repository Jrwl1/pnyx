// WHAT IT DO? S5-T03/T06 proof: proposal submit CAPTCHA policy enforcement and bypass resistance.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app, resetAbuseTelemetryState } from "../src/server.js";
import { db } from "../src/db/client.js";

const captchaHeaders = (): Record<string, string> => ({
  "x-enable-captcha-test": "1"
});

describe("proposal captcha", () => {
  beforeEach(() => {
    resetAbuseTelemetryState();
    db.exec("DELETE FROM politician_proposal_audits");
    db.exec("DELETE FROM politician_proposals");
    db.exec("DELETE FROM politicians");
  });

  it("requires valid captcha for user proposal submit when enforcement is enabled", async () => {
    const user = await authHeaders("captcha-proposal-user", "user");

    await request(app)
      .post("/politician-proposals")
      .set({ ...user, ...captchaHeaders() })
      .send({ name: "Captcha Missing" })
      .expect(400);

    await request(app)
      .post("/politician-proposals")
      .set({ ...user, ...captchaHeaders() })
      .send({ name: "Captcha Invalid", captchaToken: "wrong-token" })
      .expect(403);

    const valid = await request(app)
      .post("/politician-proposals")
      .set({ ...user, ...captchaHeaders() })
      .send({ name: "Captcha Valid", captchaToken: "test-captcha-pass" })
      .expect(201);

    expect(valid.body).toMatchObject({ status: "pending" });
  });

  it("applies captcha policy only to eligible caller role and keeps moderator flow available", async () => {
    const mod = await authHeaders("captcha-proposal-mod", "moderator");

    const res = await request(app)
      .post("/politician-proposals")
      .set({ ...mod, ...captchaHeaders() })
      .send({ name: "Moderator Proposal Without Captcha" })
      .expect(201);

    expect(res.body).toMatchObject({ status: "pending" });
  });

  it("does not allow user bypass header without valid captcha token", async () => {
    const user = await authHeaders("captcha-proposal-bypass", "user");

    const res = await request(app)
      .post("/politician-proposals")
      .set({ ...user, ...captchaHeaders(), "x-captcha-test-bypass": "1" })
      .send({ name: "Bypass Attempt" })
      .expect(400);

    expect(res.body).toMatchObject({ error: "captcha_required" });
  });
});

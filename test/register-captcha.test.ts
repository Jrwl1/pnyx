// WHAT IT DO? S5-T02/T06 proof: register CAPTCHA enforcement and bypass resistance.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { app, resetAbuseTelemetryState } from "../src/server.js";
import { db } from "../src/db/client.js";

const captchaHeaders = (): Record<string, string> => ({
  "x-enable-captcha-test": "1"
});

describe("register captcha", () => {
  beforeEach(() => {
    resetAbuseTelemetryState();
    db.exec("DELETE FROM users");
  });

  it("requires captchaToken when captcha enforcement is enabled", async () => {
    const res = await request(app)
      .post("/auth/register")
      .set(captchaHeaders())
      .send({ email: "captcha-missing@example.com" })
      .expect(400);

    expect(res.body).toMatchObject({
      error: "captcha_required"
    });
  });

  it("rejects invalid captcha tokens", async () => {
    const res = await request(app)
      .post("/auth/register")
      .set(captchaHeaders())
      .send({ email: "captcha-invalid@example.com", captchaToken: "wrong-token" })
      .expect(403);

    expect(res.body).toMatchObject({ error: "captcha_invalid" });
  });

  it("accepts valid captcha token and preserves user role assignment", async () => {
    const res = await request(app)
      .post("/auth/register")
      .set(captchaHeaders())
      .send({ email: "captcha-valid@example.com", captchaToken: "test-captcha-pass" })
      .expect(201);

    expect(res.body).toMatchObject({ email: "captcha-valid@example.com", role: "user" });
  });

  it("preserves privileged role self-assignment denial even with valid captcha", async () => {
    await request(app)
      .post("/auth/register")
      .set(captchaHeaders())
      .send({ email: "captcha-mod-denied@example.com", role: "moderator", captchaToken: "test-captcha-pass" })
      .expect(403);
  });

  it("does not allow bypass header without valid captcha token", async () => {
    const res = await request(app)
      .post("/auth/register")
      .set({ ...captchaHeaders(), "x-captcha-test-bypass": "1" })
      .send({ email: "captcha-bypass-attempt@example.com" })
      .expect(400);

    expect(res.body).toMatchObject({ error: "captcha_required" });
  });
});

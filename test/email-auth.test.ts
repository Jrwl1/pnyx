// WHAT IT DO? Proves launch-safe email login codes and admin-only role grants work without the public shared-secret sign-in flow.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { verifyToken } from "../src/auth/jwt.js";
import { db } from "../src/db/client.js";
import { bootstrapLocalAdmin } from "../src/dev/bootstrap-local-admin.js";
import { app } from "../src/server.js";

describe("email auth", () => {
  beforeEach(() => {
    db.exec("DELETE FROM auth_login_codes");
    db.exec("DELETE FROM users");
  });

  it("issues and verifies a one-time email code for a registered user", async () => {
    const register = await request(app)
      .post("/auth/register")
      .send({ email: "user@example.fi" })
      .expect(201);
    expect(register.body).toMatchObject({ email: "user@example.fi", role: "user" });

    const requestCode = await request(app)
      .post("/auth/request-code")
      .send({ email: "user@example.fi" })
      .expect(202);
    expect(requestCode.body).toMatchObject({
      ok: true,
      deliveryMode: "inline",
      expiresInMinutes: expect.any(Number),
      codePreview: expect.any(String)
    });

    const verify = await request(app)
      .post("/auth/verify-code")
      .send({ email: "user@example.fi", code: requestCode.body.codePreview })
      .expect(200);

    expect(verify.body).toMatchObject({
      ok: true,
      email: "user@example.fi",
      role: "user",
      userId: register.body.id
    });

    const payload = verifyToken(verify.body.token as string);
    expect(payload).toMatchObject({
      email: "user@example.fi",
      role: "user",
      userId: register.body.id
    });
  });

  it("returns a generic request response for unknown emails and rejects invalid codes", async () => {
    const requestCode = await request(app)
      .post("/auth/request-code")
      .send({ email: "missing@example.fi" })
      .expect(202);
    expect(requestCode.body).toMatchObject({
      ok: true,
      codePreview: null
    });

    await request(app)
      .post("/auth/verify-code")
      .send({ email: "missing@example.fi", code: "123456" })
      .expect(401);
  });

  it("allows an admin to provision a moderator role outside the public sign-in flow", async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: "moderator@example.fi" })
      .expect(201);

    const admin = bootstrapLocalAdmin();

    await request(app)
      .post("/auth/role-grants")
      .set({ authorization: `Bearer ${admin.token}` })
      .send({ email: "moderator@example.fi", role: "moderator" })
      .expect(200);

    const requestCode = await request(app)
      .post("/auth/request-code")
      .send({ email: "moderator@example.fi" })
      .expect(202);

    const verify = await request(app)
      .post("/auth/verify-code")
      .send({ email: "moderator@example.fi", code: requestCode.body.codePreview })
      .expect(200);

    await request(app)
      .get("/abuse/metrics")
      .set({ authorization: `Bearer ${verify.body.token}` })
      .expect(200);
  });
});

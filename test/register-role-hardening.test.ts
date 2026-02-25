// WHAT IT DO? S1-T07 proof: public registration cannot self-assign privileged roles.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("register role hardening", () => {
  beforeEach(() => {
    db.exec("DELETE FROM users");
  });

  it("registers as user when role is omitted", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "plain-user@example.com" })
      .expect(201);

    expect(res.body).toMatchObject({ email: "plain-user@example.com", role: "user" });
  });

  it("registers as user when role=user is provided", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "explicit-user@example.com", role: "user" })
      .expect(201);

    expect(res.body).toMatchObject({ email: "explicit-user@example.com", role: "user" });
  });

  it("rejects moderator/admin role self-assignment", async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: "mod-attempt@example.com", role: "moderator" })
      .expect(403);

    await request(app)
      .post("/auth/register")
      .send({ email: "admin-attempt@example.com", role: "admin" })
      .expect(403);

    const rows = db.prepare("SELECT role FROM users WHERE email IN (?, ?) ORDER BY email").all(
      "mod-attempt@example.com",
      "admin-attempt@example.com"
    ) as { role: string }[];
    expect(rows).toHaveLength(0);
  });

  it("rejects invalid role values", async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: "bad-role@example.com", role: "owner" })
      .expect(400);
  });
});

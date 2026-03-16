// WHAT IT DO? S0-T02 proof: politician create/list with canonical dedupe (externalId first, else name/region/office).
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("politician dedupe", () => {
  beforeEach(() => {
    db.exec("DELETE FROM politicians");
  });

  it("admin create works and list returns created records", async () => {
    const headers = await authHeaders("admin-create-list", "admin");
    const res = await request(app)
      .post("/politicians")
      .set(headers)
      .send({ name: "Alice Smith", region: "CA", office: "Senator" })
      .expect(201);

    expect(res.body).toHaveProperty("id");
    expect(typeof res.body.id).toBe("number");

    const listRes = await request(app).get("/politicians").expect(200);
    expect(listRes.body.items).toHaveLength(1);
    expect(listRes.body.items[0]).toMatchObject({
      name: "Alice Smith",
      region: "CA",
      office: "Senator",
    });
  });

  it("admin create works", async () => {
    const adminHeaders = await authHeaders("admin-create", "admin");
    await request(app)
      .post("/politicians")
      .set(adminHeaders)
      .send({ name: "Admin Add", region: "CA", office: "Senator" })
      .expect(201);
  });

  it("anonymous create denied with 403", async () => {
    await request(app)
      .post("/politicians")
      .send({ name: "Bob Jones" })
      .expect(403);
  });

  it("user create denied with 403", async () => {
    const headers = await authHeaders("plain-user", "user");
    await request(app)
      .post("/politicians")
      .set(headers)
      .send({ name: "User denied" })
      .expect(403);
  });

  it("spoofed x-role header ignored without valid JWT", async () => {
    await request(app)
      .post("/politicians")
      .set({ "x-role": "admin", "x-user-id": "attacker" })
      .send({ name: "Spoofed" })
      .expect(403);
  });

  it("duplicate (name,region,office) returns 409", async () => {
    const headers = await authHeaders("admin-dup-1", "admin");
    await request(app)
      .post("/politicians")
      .set(headers)
      .send({ name: "Carol White", region: "NY", office: "Governor" })
      .expect(201);

    await request(app)
      .post("/politicians")
      .set(headers)
      .send({
        name: "  carol white  ",
        region: "ny",
        office: "governor",
      })
      .expect(409);
  });

  it("duplicate externalId returns 409", async () => {
    const headers = await authHeaders("admin-dup-2", "admin");
    await request(app)
      .post("/politicians")
      .set(headers)
      .send({ name: "Dave Lee", externalId: "ext-123" })
      .expect(201);

    await request(app)
      .post("/politicians")
      .set(headers)
      .send({ name: "Other", externalId: "ext-123" })
      .expect(409);
  });

  it("create without externalId when matching normalized record has externalId returns 409", async () => {
    const headers = await authHeaders("admin-dup-3", "admin");
    await request(app)
      .post("/politicians")
      .set(headers)
      .send({ name: "Eve Brown", region: "TX", office: "Mayor", externalId: "ext-456" })
      .expect(201);

    await request(app)
      .post("/politicians")
      .set(headers)
      .send({ name: "eve brown", region: "tx", office: "mayor" })
      .expect(409);
  });
});

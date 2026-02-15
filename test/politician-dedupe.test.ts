// WHAT IT DO? S0-T02 proof: politician create/list with canonical dedupe (externalId first, else name/region/office).
import { describe, expect, it } from "vitest";

import request from "supertest";

import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

const userHeaders = { "x-role": "user", "x-user-id": "test-user-1" };
const anonHeaders = { "x-role": "anonymous" };

describe("politician dedupe", () => {
  beforeEach(() => {
    db.exec("DELETE FROM politicians");
  });

  it("authenticated create works and list returns created records", async () => {
    const res = await request(app)
      .post("/politicians")
      .set(userHeaders)
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

  it("anonymous create denied with 403", async () => {
    await request(app)
      .post("/politicians")
      .set(anonHeaders)
      .send({ name: "Bob Jones" })
      .expect(403);
  });

  it("duplicate (name,region,office) returns 409", async () => {
    await request(app)
      .post("/politicians")
      .set(userHeaders)
      .send({ name: "Carol White", region: "NY", office: "Governor" })
      .expect(201);

    await request(app)
      .post("/politicians")
      .set(userHeaders)
      .send({
        name: "  carol white  ",
        region: "ny",
        office: "governor",
      })
      .expect(409);
  });

  it("duplicate externalId returns 409", async () => {
    await request(app)
      .post("/politicians")
      .set(userHeaders)
      .send({ name: "Dave Lee", externalId: "ext-123" })
      .expect(201);

    await request(app)
      .post("/politicians")
      .set(userHeaders)
      .send({ name: "Other", externalId: "ext-123" })
      .expect(409);
  });
});

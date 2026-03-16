// WHAT IT DO? Proves the local admin bootstrap script seeds an admin user and returns a token that can create canonical politicians.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { app } from "../src/server.js";
import { db } from "../src/db/client.js";
import { LOCAL_ADMIN_EMAIL, LOCAL_ADMIN_ID, bootstrapLocalAdmin } from "../src/dev/bootstrap-local-admin.js";

describe("local admin bootstrap", () => {
  beforeEach(() => {
    db.exec("DELETE FROM politicians");
    db.exec("DELETE FROM users");
  });

  it("seeds a predictable local admin and issues a usable token", async () => {
    const result = bootstrapLocalAdmin();

    expect(result).toMatchObject({
      id: LOCAL_ADMIN_ID,
      email: LOCAL_ADMIN_EMAIL,
      role: "admin",
      created: true
    });

    const row = db.prepare("SELECT id, email, role FROM users WHERE id = ?").get(LOCAL_ADMIN_ID) as
      | { id: string; email: string; role: string }
      | undefined;
    expect(row).toMatchObject({
      id: LOCAL_ADMIN_ID,
      email: LOCAL_ADMIN_EMAIL,
      role: "admin"
    });

    await request(app)
      .post("/politicians")
      .set({ authorization: `Bearer ${result.token}` })
      .send({ name: "Bootstrapped Admin Canonical", region: "FI", office: "Minister" })
      .expect(201);
  });
});

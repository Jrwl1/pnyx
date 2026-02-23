// WHAT IT DO? E2E smoke: verifies the service health endpoint for sprint proof command coverage.
import { describe, expect, it } from "vitest";

import request from "supertest";

import { app } from "../src/server.js";

describe("e2e health", () => {
  it("returns ok from /health", async () => {
    const res = await request(app).get("/health").expect(200);
    expect(res.body).toEqual({ ok: true });
  });
});

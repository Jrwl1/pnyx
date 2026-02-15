// WHAT IT DO? Test helper: obtain JWT for authenticated requests.
import request from "supertest";

import { app } from "../../src/server.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret";

export async function getUserToken(userId = "test-user-1", role = "user"): Promise<string> {
  const res = await request(app)
    .post("/auth/token")
    .send({ userId, role, secret: JWT_SECRET })
    .expect(200);
  return res.body.token as string;
}

export async function authHeaders(userId = "test-user-1", role = "user"): Promise<Record<string, string>> {
  const token = await getUserToken(userId, role);
  return { authorization: `Bearer ${token}` };
}

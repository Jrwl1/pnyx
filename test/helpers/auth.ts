// WHAT IT DO? Test helper: mint JWTs directly for authenticated requests.
import { signToken } from "../../src/auth/jwt.js";

export async function getUserToken(
  userId = "test-user-1",
  role: "user" | "moderator" | "admin" = "user"
): Promise<string> {
  return signToken({ userId, role });
}

export async function authHeaders(
  userId = "test-user-1",
  role: "user" | "moderator" | "admin" = "user"
): Promise<Record<string, string>> {
  const token = await getUserToken(userId, role);
  return { authorization: `Bearer ${token}` };
}

// WHAT IT DO? Signs and verifies JWTs for auth; role/userId from verified token only.
import jwt from "jsonwebtoken";

import { isKnownRole, type Role } from "../types/roles.js";

const secret = process.env.JWT_SECRET ?? "dev-secret-do-not-use-in-production";

export type JwtPayload = {
  userId: string;
  role: Role;
  email?: string;
  iat?: number;
  exp?: number;
};

const DEFAULT_EXPIRY = "7d";

export function signToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, secret, { expiresIn: DEFAULT_EXPIRY });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    if (!decoded.userId || !decoded.role || !isKnownRole(decoded.role)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

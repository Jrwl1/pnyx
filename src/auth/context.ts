// WHAT IT DO? Extracts auth context from verified JWT; no token or invalid = anonymous.
import type { Request, Response, NextFunction } from "express";

import { type Role } from "../types/roles.js";

import { verifyToken } from "./jwt.js";

export type AuthContext = {
  role: Role;
  userId?: string;
  email?: string;
};

// Express type augmentation requires global namespace; no ES module equivalent.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth: AuthContext;
    }
  }
}

export const authContext = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.header("authorization");
  const match = authHeader?.match(/^Bearer\s+(\S+)$/i);
  const token = match?.[1];

  if (!token) {
    req.auth = { role: "anonymous" };
    next();
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    req.auth = { role: "anonymous" };
    next();
    return;
  }

  req.auth = {
    role: payload.role,
    userId: payload.userId,
    email: payload.email
  };
  next();
};

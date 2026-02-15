// WHAT IT DO? Extracts lightweight auth context from headers for role-based guards.
import type { Request, Response, NextFunction } from "express";

import { isKnownRole, type Role } from "../types/roles.js";

export type AuthContext = {
  role: Role;
  userId?: string;
};

declare global {
  namespace Express {
    interface Request {
      auth: AuthContext;
    }
  }
}

export const authContext = (req: Request, _res: Response, next: NextFunction): void => {
  const rawRole = req.header("x-role");
  const rawUserId = req.header("x-user-id");

  const role = rawRole && isKnownRole(rawRole) ? rawRole : "anonymous";
  req.auth = {
    role,
    userId: rawUserId ?? undefined
  };

  next();
};

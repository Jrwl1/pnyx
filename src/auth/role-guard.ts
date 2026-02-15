// WHAT IT DO? Enforces minimum role checks for protected operations.
import type { NextFunction, Request, Response } from "express";

import { roleOrder, type Role } from "../types/roles.js";

export const requireRole = (minimumRole: Role) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestRole = req.auth.role;
    if (roleOrder[requestRole] < roleOrder[minimumRole]) {
      res.status(403).json({
        error: "forbidden",
        message: `Requires role ${minimumRole}`
      });
      return;
    }

    next();
  };
};

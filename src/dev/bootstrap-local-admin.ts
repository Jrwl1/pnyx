// WHAT IT DO? Seeds a predictable local admin user and prints a ready-to-use JWT for local development.
import { pathToFileURL } from "node:url";

import { signToken } from "../auth/jwt.js";
import { db } from "../db/client.js";

export const LOCAL_ADMIN_ID = process.env.LOCAL_BOOTSTRAP_ADMIN_ID ?? "local-admin";
export const LOCAL_ADMIN_EMAIL = process.env.LOCAL_BOOTSTRAP_ADMIN_EMAIL ?? "admin@local.test";

export type LocalAdminBootstrapResult = {
  id: string;
  email: string;
  role: "admin";
  created: boolean;
  token: string;
};

export const bootstrapLocalAdmin = (): LocalAdminBootstrapResult => {
  const byId = db
    .prepare("SELECT id, email FROM users WHERE id = ? LIMIT 1")
    .get(LOCAL_ADMIN_ID) as { id: string; email: string } | undefined;

  if (byId) {
    db.prepare("UPDATE users SET email = ?, role = 'admin', updated_at = datetime('now') WHERE id = ?").run(LOCAL_ADMIN_EMAIL, LOCAL_ADMIN_ID);
  } else {
    const byEmail = db
      .prepare("SELECT id FROM users WHERE email = ? LIMIT 1")
      .get(LOCAL_ADMIN_EMAIL) as { id: string } | undefined;

    if (byEmail) {
      db.prepare("UPDATE users SET role = 'admin', updated_at = datetime('now') WHERE id = ?").run(byEmail.id);
      const token = signToken({ userId: byEmail.id, role: "admin" });
      return {
        id: byEmail.id,
        email: LOCAL_ADMIN_EMAIL,
        role: "admin",
        created: false,
        token
      };
    }

    db.prepare("INSERT INTO users (id, email, role) VALUES (?, ?, 'admin')").run(LOCAL_ADMIN_ID, LOCAL_ADMIN_EMAIL);
  }

  const token = signToken({ userId: LOCAL_ADMIN_ID, role: "admin" });
  const created = !byId;

  return {
    id: LOCAL_ADMIN_ID,
    email: LOCAL_ADMIN_EMAIL,
    role: "admin",
    created,
    token
  };
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = bootstrapLocalAdmin();
  console.log(
    JSON.stringify(
      {
        ...result,
        authorizationHeader: `Bearer ${result.token}`
      },
      null,
      2
    )
  );
}

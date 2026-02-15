// WHAT IT DO? Applies SQL migrations exactly once in filename order.
import fs from "node:fs";
import path from "node:path";

import { db } from "./client.js";

const migrationsDir = path.resolve(process.cwd(), "migrations");

const ensureMigrationsTable = (): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
};

export const applyMigrations = (): void => {
  ensureMigrationsTable();

  const files = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();

  const appliedRows = db.prepare("SELECT name FROM schema_migrations").all() as Array<{ name: string }>;
  const applied = new Set(appliedRows.map((row) => row.name));

  const insertMigration = db.prepare("INSERT INTO schema_migrations(name) VALUES (?)");

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const tx = db.transaction(() => {
      db.exec(sql);
      insertMigration.run(file);
    });
    tx();
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  applyMigrations();
  console.log("Migrations applied.");
}

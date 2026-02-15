// WHAT IT DO? Starts the HTTP service and wires role guards for protected operations.
import crypto from "node:crypto";

import express from "express";

import { authContext } from "./auth/context.js";
import { requireRole } from "./auth/role-guard.js";
import { db } from "./db/client.js";

export const app = express();
app.use(express.json());
app.use(authContext);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/politicians", (_req, res) => {
  const rows = db
    .prepare(
      "SELECT id, name, region, office, external_id AS externalId, verified, created_at AS createdAt FROM politicians WHERE deleted_at IS NULL ORDER BY created_at DESC"
    )
    .all();
  res.json({ items: rows });
});

app.post("/politicians", requireRole("user"), (req, res) => {
  const { name, region, office, externalId } = req.body as {
    name?: string;
    region?: string;
    office?: string;
    externalId?: string;
  };

  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const trimmedName = name.trim();
  const trimmedRegion = (region ?? "").toString().trim();
  const trimmedOffice = (office ?? "").toString().trim();
  const normalizedKey = `${trimmedName.toLowerCase()}|${trimmedRegion.toLowerCase()}|${trimmedOffice.toLowerCase()}`;

  // Canonical dedupe: reject if same (name,region,office) exists (including rows with externalId).
  const existing = db.prepare(
    "SELECT 1 FROM politicians WHERE deleted_at IS NULL AND normalized_key = ? LIMIT 1"
  ).get(normalizedKey) as { "1"?: number } | undefined;
  if (existing) {
    res.status(409).json({ error: "duplicate politician identity" });
    return;
  }

  try {
    const stmt = db.prepare(
      "INSERT INTO politicians (name, region, office, external_id, verified, created_by) VALUES (?, ?, ?, ?, 0, ?)"
    );
    const result = stmt.run(
      trimmedName,
      trimmedRegion || null,
      trimmedOffice || null,
      externalId ?? null,
      req.auth.userId ?? "system"
    );
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const isUniqueness = code === "SQLITE_CONSTRAINT_UNIQUE" || (err as Error).message?.includes("UNIQUE constraint");
    res.status(isUniqueness ? 409 : 500).json({
      error: isUniqueness ? "duplicate politician identity" : "internal server error"
    });
  }
});

app.post("/statements", requireRole("user"), (req, res) => {
  const { politicianId, sourceUrl, body, dateSaid } = req.body as {
    politicianId?: number;
    sourceUrl?: string;
    body?: string;
    dateSaid?: string;
  };

  if (!politicianId || !sourceUrl || !body || !dateSaid) {
    res.status(400).json({ error: "politicianId, sourceUrl, body, dateSaid are required" });
    return;
  }

  const normalizedBodyHash = crypto.createHash("sha256").update(body.trim().toLowerCase()).digest("hex");
  const statementFingerprint = crypto.createHash("sha256").update(`${politicianId}|${normalizedBodyHash}|${sourceUrl}`).digest("hex");

  try {
    const result = db
      .prepare(
        "INSERT INTO statements (politician_id, source_url, body, date_said, normalized_body_hash, statement_fingerprint, verification_status, author_id) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)"
      )
      .run(politicianId, sourceUrl, body, dateSaid, normalizedBodyHash, statementFingerprint, req.auth.userId ?? "system");

    res.status(201).json({ id: result.lastInsertRowid });
  } catch {
    res.status(409).json({ error: "duplicate statement or invalid politician" });
  }
});

app.patch("/statements/:id/verification", requireRole("moderator"), (req, res) => {
  const statementId = Number(req.params.id);
  const { newStatus, reason } = req.body as { newStatus?: string; reason?: string };
  const allowed = new Set(["pending", "verified", "disputed", "rejected"]);

  if (!allowed.has(newStatus ?? "")) {
    res.status(400).json({ error: "invalid status" });
    return;
  }

  const row = db
    .prepare("SELECT verification_status AS status FROM statements WHERE id = ? AND deleted_at IS NULL")
    .get(statementId) as { status: string } | undefined;

  if (!row) {
    res.status(404).json({ error: "statement not found" });
    return;
  }

  const requiresReason = (row.status === "verified" && (newStatus === "disputed" || newStatus === "rejected")) || (row.status === "pending" && newStatus === "rejected");
  if (requiresReason && !reason) {
    res.status(400).json({ error: "reason required for downgrade transition" });
    return;
  }

  db.prepare("UPDATE statements SET verification_status = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, statementId);
  db.prepare("INSERT INTO revision_audits (statement_id, actor_id, change_type, from_value, to_value, reason) VALUES (?, ?, 'verification_status', ?, ?, ?)")
    .run(statementId, req.auth.userId ?? "moderation", row.status, newStatus, reason ?? null);

  res.json({ ok: true });
});

app.post("/statements/:id/votes", requireRole("user"), (req, res) => {
  const statementId = Number(req.params.id);
  const { value } = req.body as { value?: string };
  if (value !== "support" && value !== "oppose") {
    res.status(400).json({ error: "value must be support or oppose" });
    return;
  }

  db.prepare(
    "INSERT INTO votes (statement_id, user_id, value) VALUES (?, ?, ?) ON CONFLICT(statement_id, user_id) DO UPDATE SET value=excluded.value, updated_at=datetime('now')"
  ).run(statementId, req.auth.userId ?? "unknown", value);

  const agg = db
    .prepare(
      "SELECT sum(CASE WHEN value='support' THEN 1 ELSE 0 END) AS support, sum(CASE WHEN value='oppose' THEN 1 ELSE 0 END) AS oppose FROM votes WHERE statement_id = ?"
    )
    .get(statementId);

  res.json({ ok: true, aggregate: agg });
});

app.post("/statements/:id/pending-delete", requireRole("moderator"), (req, res) => {
  const statementId = Number(req.params.id);
  const result = db
    .prepare("UPDATE statements SET pending_delete = 1, updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL")
    .run(statementId);

  if (result.changes === 0) {
    res.status(404).json({ error: "statement not found" });
    return;
  }

  res.json({ ok: true });
});

app.post("/statements/:id/approve-delete", requireRole("admin"), (req, res) => {
  const statementId = Number(req.params.id);
  const result = db
    .prepare("UPDATE statements SET deleted_at = datetime('now'), pending_delete = 0, updated_at = datetime('now') WHERE id = ? AND pending_delete = 1")
    .run(statementId);

  if (result.changes === 0) {
    res.status(409).json({ error: "statement is not pending delete" });
    return;
  }

  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 3000);

export const startServer = (): void => {
  app.listen(port, () => {
    console.log(`Pnyx service listening on port ${port}`);
  });
};

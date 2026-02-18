// WHAT IT DO? Starts the HTTP service and wires role guards for protected operations.
import crypto from "node:crypto";

import express from "express";

import { authContext } from "./auth/context.js";
import { signToken } from "./auth/jwt.js";
import { requireRole } from "./auth/role-guard.js";
import { db } from "./db/client.js";

export const app = express();
app.use(express.json());
app.use(authContext);

app.post("/auth/token", (req, res) => {
  const { userId, role, secret } = req.body as { userId?: string; role?: string; secret?: string };
  const expectedSecret = process.env.JWT_SECRET ?? "dev-secret-do-not-use-in-production";
  if (!userId || !role || secret !== expectedSecret) {
    res.status(401).json({ error: "invalid or missing userId, role, or secret" });
    return;
  }
  const knownRoles = ["user", "moderator", "admin"];
  if (!knownRoles.includes(role)) {
    res.status(400).json({ error: "role must be user, moderator, or admin" });
    return;
  }
  const token = signToken({ userId, role: role as "user" | "moderator" | "admin" });
  res.json({ token });
});

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

app.get("/statements", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT s.id, s.politician_id AS politicianId, s.source_url AS sourceUrl, s.body, s.date_said AS dateSaid,
       s.verification_status AS verificationStatus, s.author_id AS authorId, s.created_at AS createdAt
       FROM statements s WHERE s.deleted_at IS NULL AND s.pending_delete = 0
       ORDER BY s.created_at DESC`
    )
    .all();
  res.json({ items: rows });
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

  const politician = db.prepare("SELECT 1 FROM politicians WHERE id = ? AND deleted_at IS NULL LIMIT 1").get(politicianId) as { "1"?: number } | undefined;
  if (!politician) {
    res.status(404).json({ error: "politician not found" });
    return;
  }

  const trimmedBody = body.trim().toLowerCase();
  const normalizedBodyHash = crypto.createHash("sha256").update(trimmedBody).digest("hex");
  const statementFingerprint = crypto.createHash("sha256").update(`${politicianId}|${normalizedBodyHash}|${sourceUrl}`).digest("hex");

  const duplicate = db.prepare("SELECT 1 FROM statements WHERE statement_fingerprint = ? AND deleted_at IS NULL LIMIT 1").get(statementFingerprint) as { "1"?: number } | undefined;
  if (duplicate) {
    res.status(409).json({ error: "duplicate statement" });
    return;
  }

  try {
    const result = db
      .prepare(
        "INSERT INTO statements (politician_id, source_url, body, date_said, normalized_body_hash, statement_fingerprint, verification_status, author_id) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)"
      )
      .run(politicianId, sourceUrl, body.trim(), dateSaid, normalizedBodyHash, statementFingerprint, req.auth.userId ?? "system");

    const statementId = result.lastInsertRowid as number;
    db.prepare(
      "INSERT INTO revision_audits (statement_id, actor_id, change_type, from_value, to_value) VALUES (?, ?, 'createStatement', NULL, ?)"
    ).run(statementId, req.auth.userId ?? "system", body.trim());

    res.status(201).json({ id: statementId, verificationStatus: "pending" });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const isUniqueness = code === "SQLITE_CONSTRAINT_UNIQUE" || (err as Error).message?.includes("UNIQUE constraint");
    res.status(isUniqueness ? 409 : 500).json({
      error: isUniqueness ? "duplicate statement" : "internal server error"
    });
  }
});

app.patch("/statements/:id", requireRole("user"), (req, res) => {
  const statementId = Number(req.params.id);
  const { body: bodyPatch, sourceUrl: sourceUrlPatch, dateSaid: dateSaidPatch } = req.body as {
    body?: string;
    sourceUrl?: string;
    dateSaid?: string;
  };

  if (bodyPatch === undefined && sourceUrlPatch === undefined && dateSaidPatch === undefined) {
    res.status(400).json({ error: "at least one of body, sourceUrl, dateSaid is required" });
    return;
  }

  const row = db
    .prepare(
      "SELECT id, politician_id, author_id, created_at, body, source_url, date_said, deleted_at FROM statements WHERE id = ?"
    )
    .get(statementId) as
    | {
        id: number;
        politician_id: number;
        author_id: string;
        created_at: string;
        body: string;
        source_url: string;
        date_said: string;
        deleted_at: string | null;
      }
    | undefined;

  if (!row || row.deleted_at) {
    res.status(404).json({ error: "statement not found" });
    return;
  }

  const isAuthor =
    req.auth.userId != null && String(req.auth.userId) === String((row as Record<string, unknown>).author_id);
  const createdStr = row.created_at;
  // SQLite datetime('now') is UTC; parse as UTC so 30min window is correct across envs
  const createdAtMs = Number.isNaN(Date.parse(createdStr))
    ? 0
    : new Date(createdStr.replace(" ", "T") + (createdStr.endsWith("Z") ? "" : "Z")).getTime();
  const withinWindow = createdAtMs > 0 && createdAtMs + 30 * 60 * 1000 >= Date.now();
  const isModOrAdmin = req.auth.role === "moderator" || req.auth.role === "admin";
  const allowed = (isAuthor && withinWindow) || isModOrAdmin;
  if (!allowed) {
    res.status(403).json({ error: "forbidden", message: "edit not allowed: outside window or unauthorized" });
    return;
  }

  const newBody = (bodyPatch !== undefined ? bodyPatch : row.body).trim();
  const newSourceUrl = sourceUrlPatch !== undefined ? sourceUrlPatch : row.source_url;
  const newDateSaid = dateSaidPatch !== undefined ? dateSaidPatch : row.date_said;

  if (!newBody || !newSourceUrl || !newDateSaid) {
    res.status(400).json({ error: "body, sourceUrl, and dateSaid must be non-empty" });
    return;
  }

  const trimmedBody = newBody.toLowerCase();
  const normalizedBodyHash = crypto.createHash("sha256").update(trimmedBody).digest("hex");
  const statementFingerprint = crypto
    .createHash("sha256")
    .update(`${row.politician_id}|${normalizedBodyHash}|${newSourceUrl}`)
    .digest("hex");

  const duplicate = db
    .prepare("SELECT 1 FROM statements WHERE statement_fingerprint = ? AND id != ? AND deleted_at IS NULL LIMIT 1")
    .get(statementFingerprint, statementId) as { "1"?: number } | undefined;
  if (duplicate) {
    res.status(409).json({ error: "duplicate statement" });
    return;
  }

  db.prepare(
    "UPDATE statements SET body = ?, source_url = ?, date_said = ?, normalized_body_hash = ?, statement_fingerprint = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(newBody, newSourceUrl, newDateSaid, normalizedBodyHash, statementFingerprint, statementId);

  const fromValue = JSON.stringify({ body: row.body, sourceUrl: row.source_url, dateSaid: row.date_said });
  const toValue = JSON.stringify({ body: newBody, sourceUrl: newSourceUrl, dateSaid: newDateSaid });
  db.prepare(
    "INSERT INTO revision_audits (statement_id, actor_id, change_type, from_value, to_value) VALUES (?, ?, 'editStatement', ?, ?)"
  ).run(statementId, req.auth.userId ?? "system", fromValue, toValue);

  const updated = db.prepare("SELECT updated_at AS updatedAt FROM statements WHERE id = ?").get(statementId) as { updatedAt: string };
  res.json({ ok: true, updatedAt: updated.updatedAt });
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

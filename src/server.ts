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

type RateLimitRule = {
  name: string;
  max: number;
  windowMs: number;
};

type RateLimitKeyResolver = (req: express.Request) => string;

const readPositiveIntEnv = (name: string, fallback: number): number => {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export const resetRateLimitState = (): void => {
  rateLimitStore.clear();
};

const shouldEnforceRateLimit = (req: express.Request): boolean => {
  if (process.env.NODE_ENV !== "test") {
    return true;
  }
  return req.header("x-enable-rate-limit-test") === "1";
};

const createRateLimiter = (rule: RateLimitRule, resolveKey?: RateLimitKeyResolver): express.RequestHandler => {
  return (req, res, next) => {
    if (!shouldEnforceRateLimit(req)) {
      next();
      return;
    }

    const now = Date.now();
    const baseKey = resolveKey ? resolveKey(req) : req.auth.userId ?? req.ip ?? "anonymous";
    const testScope = process.env.NODE_ENV === "test" ? req.header("x-rate-limit-test-key") ?? "" : "";
    const key = `${rule.name}:${baseKey}:${testScope}`;
    const existing = rateLimitStore.get(key);

    if (!existing || now > existing.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + rule.windowMs });
      next();
      return;
    }

    if (existing.count >= rule.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.status(429).json({
        error: "rate_limited",
        message: `Too many requests for ${rule.name}. Retry in ${retryAfterSeconds}s.`,
        retryAfterSeconds
      });
      return;
    }

    existing.count += 1;
    rateLimitStore.set(key, existing);
    next();
  };
};

const RATE_LIMIT_WINDOW_MS = readPositiveIntEnv("RATE_LIMIT_WINDOW_MS", 60_000);
const globalLimiter = createRateLimiter({
  name: "global",
  max: readPositiveIntEnv("RATE_LIMIT_GLOBAL_MAX", 500),
  windowMs: RATE_LIMIT_WINDOW_MS
});
const loginLimiter = createRateLimiter(
  {
    name: "login",
    max: readPositiveIntEnv("RATE_LIMIT_LOGIN_MAX", 30),
    windowMs: RATE_LIMIT_WINDOW_MS
  },
  (req) => (req.body as { userId?: string }).userId ?? req.ip ?? "anonymous"
);
const registerLimiter = createRateLimiter({
  name: "register",
  max: readPositiveIntEnv("RATE_LIMIT_REGISTER_MAX", 20),
  windowMs: RATE_LIMIT_WINDOW_MS
});
const addStatementLimiter = createRateLimiter({
  name: "add-statement",
  max: readPositiveIntEnv("RATE_LIMIT_ADD_STATEMENT_MAX", 60),
  windowMs: RATE_LIMIT_WINDOW_MS
});
const proposalSubmitLimiter = createRateLimiter({
  name: "politician-proposal",
  max: readPositiveIntEnv("RATE_LIMIT_POLITICIAN_PROPOSAL_MAX", 20),
  windowMs: RATE_LIMIT_WINDOW_MS
});
const politicianCreateLimiter = createRateLimiter({
  name: "politician-create",
  max: readPositiveIntEnv("RATE_LIMIT_POLITICIAN_CREATE_MAX", 40),
  windowMs: RATE_LIMIT_WINDOW_MS
});
const voteLimiter = createRateLimiter({
  name: "vote",
  max: readPositiveIntEnv("RATE_LIMIT_VOTE_MAX", 120),
  windowMs: RATE_LIMIT_WINDOW_MS
});

app.use(globalLimiter);

type CanonicalPoliticianInput = {
  name: string;
  region?: string;
  office?: string;
  externalId?: string;
};

type CanonicalPoliticianResult =
  | { ok: true; id: number }
  | { ok: false; status: 400 | 409 | 500; error: string };

const createCanonicalPolitician = (input: CanonicalPoliticianInput, actorId: string): CanonicalPoliticianResult => {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    return { ok: false, status: 400, error: "name is required" };
  }

  const trimmedRegion = (input.region ?? "").toString().trim();
  const trimmedOffice = (input.office ?? "").toString().trim();
  const trimmedExternalId = input.externalId?.trim() || null;
  const normalizedKey = `${trimmedName.toLowerCase()}|${trimmedRegion.toLowerCase()}|${trimmedOffice.toLowerCase()}`;

  const existing = db.prepare(
    "SELECT 1 FROM politicians WHERE deleted_at IS NULL AND normalized_key = ? LIMIT 1"
  ).get(normalizedKey) as { "1"?: number } | undefined;
  if (existing) {
    return { ok: false, status: 409, error: "duplicate politician identity" };
  }

  try {
    const stmt = db.prepare(
      "INSERT INTO politicians (name, region, office, external_id, verified, created_by) VALUES (?, ?, ?, ?, 0, ?)"
    );
    const result = stmt.run(trimmedName, trimmedRegion || null, trimmedOffice || null, trimmedExternalId, actorId);
    return { ok: true, id: result.lastInsertRowid as number };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const isUniqueness = code === "SQLITE_CONSTRAINT_UNIQUE" || (err as Error).message?.includes("UNIQUE constraint");
    return { ok: false, status: isUniqueness ? 409 : 500, error: isUniqueness ? "duplicate politician identity" : "internal server error" };
  }
};

app.post("/auth/token", loginLimiter, (req, res) => {
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

app.post("/auth/register", registerLimiter, (req, res) => {
  const { email, role } = req.body as { email?: string; role?: string };
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const requestedRole = role?.trim().toLowerCase();
  if (requestedRole && !["user", "moderator", "admin"].includes(requestedRole)) {
    res.status(400).json({ error: "role must be user, moderator, or admin" });
    return;
  }
  if (requestedRole === "moderator" || requestedRole === "admin") {
    res.status(403).json({
      error: "forbidden",
      message: "public registration cannot assign privileged roles"
    });
    return;
  }

  const effectiveRole = "user";

  try {
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO users (id, email, role) VALUES (?, ?, ?)").run(id, normalizedEmail, effectiveRole);
    res.status(201).json({ id, email: normalizedEmail, role: effectiveRole });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const isUniqueness = code === "SQLITE_CONSTRAINT_UNIQUE" || (err as Error).message?.includes("UNIQUE constraint");
    res.status(isUniqueness ? 409 : 500).json({
      error: isUniqueness ? "email already registered" : "internal server error"
    });
  }
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

app.post("/politicians", politicianCreateLimiter, requireRole("moderator"), (req, res) => {
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

  const created = createCanonicalPolitician({ name, region, office, externalId }, req.auth.userId ?? "moderation");
  if (!created.ok) {
    res.status(created.status).json({ error: created.error });
    return;
  }

  res.status(201).json({ id: created.id });
});

type ProposalStatus = "pending" | "approved" | "rejected" | "duplicate";
const isProposalStatus = (value: string): value is ProposalStatus => {
  return ["pending", "approved", "rejected", "duplicate"].includes(value);
};

app.post("/politician-proposals", proposalSubmitLimiter, requireRole("user"), (req, res) => {
  const { name, region, office, externalId, sourceNote } = req.body as {
    name?: string;
    region?: string;
    office?: string;
    externalId?: string;
    sourceNote?: string;
  };

  if (!name || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const trimmedName = name.trim();
  const trimmedRegion = (region ?? "").toString().trim();
  const trimmedOffice = (office ?? "").toString().trim();
  const trimmedExternalId = externalId?.trim() || null;
  const normalizedKey = `${trimmedName.toLowerCase()}|${trimmedRegion.toLowerCase()}|${trimmedOffice.toLowerCase()}`;

  if (trimmedExternalId) {
    const dupCanonicalExternal = db
      .prepare("SELECT 1 FROM politicians WHERE deleted_at IS NULL AND external_id = ? LIMIT 1")
      .get(trimmedExternalId) as { "1"?: number } | undefined;
    if (dupCanonicalExternal) {
      res.status(409).json({ error: "duplicate politician identity" });
      return;
    }
  }

  const dupCanonicalNormalized = db
    .prepare("SELECT 1 FROM politicians WHERE deleted_at IS NULL AND normalized_key = ? LIMIT 1")
    .get(normalizedKey) as { "1"?: number } | undefined;
  if (dupCanonicalNormalized) {
    res.status(409).json({ error: "duplicate politician identity" });
    return;
  }

  try {
    const result = db
      .prepare(
        "INSERT INTO politician_proposals (submitted_by, name, region, office, external_id, source_note, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')"
      )
      .run(req.auth.userId ?? "unknown", trimmedName, trimmedRegion || null, trimmedOffice || null, trimmedExternalId, sourceNote?.trim() || null);

    const proposalId = result.lastInsertRowid as number;
    db.prepare(
      "INSERT INTO politician_proposal_audits (proposal_id, actor_id, action, from_status, to_status, reason) VALUES (?, ?, 'submitted', NULL, 'pending', NULL)"
    ).run(proposalId, req.auth.userId ?? "unknown");

    res.status(201).json({ id: proposalId, status: "pending" });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const isUniqueness = code === "SQLITE_CONSTRAINT_UNIQUE" || (err as Error).message?.includes("UNIQUE constraint");
    res.status(isUniqueness ? 409 : 500).json({
      error: isUniqueness ? "duplicate pending proposal" : "internal server error"
    });
  }
});

app.get("/politician-proposals", requireRole("user"), (req, res) => {
  const statusRaw = (req.query.status as string | undefined)?.trim().toLowerCase();
  const statusFilter = statusRaw && statusRaw !== "all" ? statusRaw : null;
  if (statusFilter && !isProposalStatus(statusFilter)) {
    res.status(400).json({ error: "invalid status filter" });
    return;
  }

  const isModerator = req.auth.role === "moderator" || req.auth.role === "admin";
  const items = isModerator
    ? db
        .prepare(
          `SELECT id, submitted_by AS submittedBy, name, region, office, external_id AS externalId,
            source_note AS sourceNote, status, decision_by AS decisionBy, decision_reason AS decisionReason,
            linked_politician_id AS linkedPoliticianId, created_at AS createdAt, decided_at AS decidedAt
           FROM politician_proposals
           WHERE (? IS NULL OR status = ?)
           ORDER BY created_at DESC`
        )
        .all(statusFilter, statusFilter)
    : db
        .prepare(
          `SELECT id, submitted_by AS submittedBy, name, region, office, external_id AS externalId,
            source_note AS sourceNote, status, decision_by AS decisionBy, decision_reason AS decisionReason,
            linked_politician_id AS linkedPoliticianId, created_at AS createdAt, decided_at AS decidedAt
           FROM politician_proposals
           WHERE submitted_by = ? AND (? IS NULL OR status = ?)
           ORDER BY created_at DESC`
        )
        .all(req.auth.userId ?? "unknown", statusFilter, statusFilter);

  res.json({ items });
});

app.patch("/politician-proposals/:id/review", requireRole("moderator"), (req, res) => {
  const proposalId = Number(req.params.id);
  const { decision, reason, linkedPoliticianId } = req.body as {
    decision?: string;
    reason?: string;
    linkedPoliticianId?: number;
  };

  if (decision !== "approve" && decision !== "reject" && decision !== "duplicate") {
    res.status(400).json({ error: "decision must be approve, reject, or duplicate" });
    return;
  }

  if ((decision === "reject" || decision === "duplicate") && !reason?.trim()) {
    res.status(400).json({ error: "reason is required for reject or duplicate" });
    return;
  }

  const actorId = req.auth.userId ?? "moderation";
  const reviewTx = db.transaction(() => {
    const proposal = db
      .prepare(
        `SELECT id, submitted_by AS submittedBy, name, region, office, external_id AS externalId,
         status, linked_politician_id AS linkedPoliticianId
         FROM politician_proposals WHERE id = ?`
      )
      .get(proposalId) as
      | {
          id: number;
          submittedBy: string;
          name: string;
          region: string | null;
          office: string | null;
          externalId: string | null;
          status: ProposalStatus;
          linkedPoliticianId: number | null;
        }
      | undefined;

    if (!proposal) {
      return { ok: false as const, status: 404 as const, error: "proposal not found" };
    }
    if (proposal.status !== "pending") {
      return { ok: false as const, status: 409 as const, error: "proposal is not pending" };
    }

    if (decision === "approve") {
      const created = createCanonicalPolitician(
        {
          name: proposal.name,
          region: proposal.region ?? undefined,
          office: proposal.office ?? undefined,
          externalId: proposal.externalId ?? undefined
        },
        actorId
      );

      if (!created.ok) {
        return { ok: false as const, status: created.status, error: created.error };
      }

      db.prepare(
        "UPDATE politician_proposals SET status = 'approved', decision_by = ?, decision_reason = ?, linked_politician_id = ?, updated_at = datetime('now'), decided_at = datetime('now') WHERE id = ?"
      ).run(actorId, reason?.trim() || null, created.id, proposalId);
      db.prepare(
        "INSERT INTO politician_proposal_audits (proposal_id, actor_id, action, from_status, to_status, reason, linked_politician_id) VALUES (?, ?, 'approved', 'pending', 'approved', ?, ?)"
      ).run(proposalId, actorId, reason?.trim() || null, created.id);

      return { ok: true as const, status: "approved" as const, politicianId: created.id };
    }

    let linkedId: number | null = null;
    if (decision === "duplicate") {
      linkedId = linkedPoliticianId ?? null;
      if (linkedId != null) {
        const linked = db
          .prepare("SELECT 1 FROM politicians WHERE id = ? AND deleted_at IS NULL LIMIT 1")
          .get(linkedId) as { "1"?: number } | undefined;
        if (!linked) {
          return { ok: false as const, status: 404 as const, error: "linked politician not found" };
        }
      }
    }

    const nextStatus = decision === "reject" ? "rejected" : "duplicate";
    const action = decision === "reject" ? "rejected" : "duplicate";
    db.prepare(
      "UPDATE politician_proposals SET status = ?, decision_by = ?, decision_reason = ?, linked_politician_id = ?, updated_at = datetime('now'), decided_at = datetime('now') WHERE id = ?"
    ).run(nextStatus, actorId, reason?.trim() || null, linkedId, proposalId);
    db.prepare(
      "INSERT INTO politician_proposal_audits (proposal_id, actor_id, action, from_status, to_status, reason, linked_politician_id) VALUES (?, ?, ?, 'pending', ?, ?, ?)"
    ).run(proposalId, actorId, action, nextStatus, reason?.trim() || null, linkedId);

    return { ok: true as const, status: nextStatus, politicianId: linkedId };
  });

  const result = reviewTx();
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json({ ok: true, status: result.status, politicianId: result.politicianId });
});

app.get("/politician-proposals/:id/audits", requireRole("moderator"), (req, res) => {
  const proposalId = Number(req.params.id);
  const proposal = db.prepare("SELECT id FROM politician_proposals WHERE id = ?").get(proposalId) as { id: number } | undefined;
  if (!proposal) {
    res.status(404).json({ error: "proposal not found" });
    return;
  }

  const items = db
    .prepare(
      `SELECT id, proposal_id AS proposalId, actor_id AS actorId, action, from_status AS fromStatus,
       to_status AS toStatus, reason, linked_politician_id AS linkedPoliticianId, created_at AS createdAt
       FROM politician_proposal_audits
       WHERE proposal_id = ?
       ORDER BY id ASC`
    )
    .all(proposalId);

  res.json({ items });
});

app.get("/statements", (_req, res) => {
  const includePending = _req.auth.role === "moderator" || _req.auth.role === "admin";
  const rows = db
    .prepare(
      `SELECT s.id, s.politician_id AS politicianId, s.source_url AS sourceUrl, s.body, s.date_said AS dateSaid,
        s.verification_status AS verificationStatus, s.author_id AS authorId, s.created_at AS createdAt
       FROM statements s WHERE s.deleted_at IS NULL AND (s.pending_delete = 0 OR ? = 1)
       ORDER BY s.created_at DESC`
    )
    .all(includePending ? 1 : 0);
  res.json({ items: rows });
});

app.get("/statements/:id", (req, res) => {
  const statementId = Number(req.params.id);
  const includePending = req.auth.role === "moderator" || req.auth.role === "admin";
  const row = db
    .prepare(
      `SELECT s.id, s.politician_id AS politicianId, s.source_url AS sourceUrl, s.body, s.date_said AS dateSaid,
       s.verification_status AS verificationStatus, s.author_id AS authorId, s.created_at AS createdAt, s.updated_at AS updatedAt
       FROM statements s
       WHERE s.id = ? AND s.deleted_at IS NULL AND (s.pending_delete = 0 OR ? = 1)
       LIMIT 1`
    )
    .get(statementId, includePending ? 1 : 0) as
    | {
        id: number;
        politicianId: number;
        sourceUrl: string;
        body: string;
        dateSaid: string;
        verificationStatus: string;
        authorId: string;
        createdAt: string;
        updatedAt: string;
      }
    | undefined;

  if (!row) {
    res.status(404).json({ error: "statement not found" });
    return;
  }

  const aggregate = db
    .prepare(
      "SELECT COALESCE(sum(CASE WHEN value='support' THEN 1 ELSE 0 END), 0) AS support, COALESCE(sum(CASE WHEN value='oppose' THEN 1 ELSE 0 END), 0) AS oppose FROM votes WHERE statement_id = ?"
    )
    .get(statementId) as { support: number; oppose: number };
  const revisionMeta = db
    .prepare("SELECT COUNT(*) AS revisionCount FROM revision_audits WHERE statement_id = ?")
    .get(statementId) as { revisionCount: number };

  res.json({
    ...row,
    aggregate,
    revisionCount: revisionMeta.revisionCount,
    revisionHistoryUrl: `/statements/${statementId}/revisions`
  });
});

app.post("/statements", addStatementLimiter, requireRole("user"), (req, res) => {
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
  const statuses = ["pending", "verified", "disputed", "rejected"] as const;
  type VerificationStatus = (typeof statuses)[number];
  const isVerificationStatus = (value: string): value is VerificationStatus => {
    return statuses.includes(value as VerificationStatus);
  };
  const transitionMap: Record<VerificationStatus, VerificationStatus[]> = {
    pending: ["verified", "disputed", "rejected"],
    verified: ["disputed", "rejected"],
    disputed: ["verified", "rejected"],
    rejected: ["pending"]
  };
  const statusRank: Record<VerificationStatus, number> = {
    verified: 3,
    disputed: 2,
    pending: 1,
    rejected: 0
  };

  if (!newStatus || !isVerificationStatus(newStatus)) {
    res.status(409).json({ error: "invalid transition", message: "newStatus is invalid" });
    return;
  }

  const row = db
    .prepare("SELECT verification_status AS status FROM statements WHERE id = ? AND deleted_at IS NULL")
    .get(statementId) as { status: VerificationStatus } | undefined;

  if (!row) {
    res.status(404).json({ error: "statement not found" });
    return;
  }

  if (row.status === newStatus) {
    res.status(409).json({ error: "invalid transition", message: "no-op transition is not allowed" });
    return;
  }

  if (!transitionMap[row.status].includes(newStatus)) {
    res.status(409).json({
      error: "invalid transition",
      message: `transition ${row.status} -> ${newStatus} is not allowed`
    });
    return;
  }

  const requiresReason = statusRank[newStatus] < statusRank[row.status];
  if (requiresReason && !reason?.trim()) {
    res.status(400).json({ error: "reason required for downgrade transition" });
    return;
  }

  db.prepare("UPDATE statements SET verification_status = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, statementId);
  db.prepare("INSERT INTO revision_audits (statement_id, actor_id, change_type, from_value, to_value, reason) VALUES (?, ?, 'verification_status', ?, ?, ?)")
    .run(statementId, req.auth.userId ?? "moderation", row.status, newStatus, reason?.trim() || null);

  res.json({ ok: true });
});

app.post("/statements/:id/votes", voteLimiter, requireRole("user"), (req, res) => {
  const statementId = Number(req.params.id);
  const { value } = req.body as { value?: string };
  if (value !== "support" && value !== "oppose") {
    res.status(400).json({ error: "value must be support or oppose" });
    return;
  }

  const statement = db
    .prepare("SELECT 1 FROM statements WHERE id = ? AND deleted_at IS NULL LIMIT 1")
    .get(statementId) as { "1"?: number } | undefined;
  if (!statement) {
    res.status(404).json({ error: "statement not found" });
    return;
  }

  db.prepare(
    "INSERT INTO votes (statement_id, user_id, value) VALUES (?, ?, ?) ON CONFLICT(statement_id, user_id) DO UPDATE SET value=excluded.value, updated_at=datetime('now')"
  ).run(statementId, req.auth.userId ?? "unknown", value);

  const agg = db
    .prepare(
      "SELECT COALESCE(sum(CASE WHEN value='support' THEN 1 ELSE 0 END), 0) AS support, COALESCE(sum(CASE WHEN value='oppose' THEN 1 ELSE 0 END), 0) AS oppose FROM votes WHERE statement_id = ?"
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

app.post("/statements/:id/withdraw", requireRole("user"), (req, res) => {
  const statementId = Number(req.params.id);
  const statement = db
    .prepare("SELECT id, author_id AS authorId, deleted_at AS deletedAt FROM statements WHERE id = ?")
    .get(statementId) as { id: number; authorId: string; deletedAt: string | null } | undefined;

  if (!statement || statement.deletedAt) {
    res.status(404).json({ error: "statement not found" });
    return;
  }

  if (String(statement.authorId) !== String(req.auth.userId)) {
    res.status(403).json({ error: "forbidden", message: "only the author can withdraw" });
    return;
  }

  db.prepare(
    "UPDATE statements SET withdrawn_at = datetime('now'), deleted_at = datetime('now'), pending_delete = 0, updated_at = datetime('now') WHERE id = ?"
  ).run(statementId);

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

app.get("/statements/:id/revisions", (req, res) => {
  const statementId = Number(req.params.id);
  const statement = db
    .prepare("SELECT 1 FROM statements WHERE id = ? AND deleted_at IS NULL LIMIT 1")
    .get(statementId) as { "1"?: number } | undefined;
  if (!statement) {
    res.status(404).json({ error: "statement not found" });
    return;
  }

  const items = db
    .prepare(
      `SELECT id, statement_id AS statementId, actor_id AS actorId, change_type AS changeType,
       from_value AS fromValue, to_value AS toValue, reason, created_at AS createdAt
       FROM revision_audits
       WHERE statement_id = ?
       ORDER BY id ASC`
    )
    .all(statementId);

  res.json({ items });
});

const port = Number(process.env.PORT ?? 3000);

export const startServer = (): void => {
  app.listen(port, () => {
    console.log(`Pnyx service listening on port ${port}`);
  });
};

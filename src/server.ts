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

const readUnitFloatEnv = (name: string, fallback: number): number => {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
};

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const rateLimitTelemetry = new Map<string, { allowed: number; blocked: number }>();

type CaptchaContext = "register" | "proposalSubmit";
type CaptchaCounters = {
  checked: number;
  passed: number;
  failed: number;
  missing: number;
  skipped: number;
};

const createCaptchaCounters = (): CaptchaCounters => ({
  checked: 0,
  passed: 0,
  failed: 0,
  missing: 0,
  skipped: 0
});

const captchaTelemetry: Record<CaptchaContext, CaptchaCounters> = {
  register: createCaptchaCounters(),
  proposalSubmit: createCaptchaCounters()
};

const recordRateLimitAllowed = (ruleName: string): void => {
  const counters = rateLimitTelemetry.get(ruleName) ?? { allowed: 0, blocked: 0 };
  counters.allowed += 1;
  rateLimitTelemetry.set(ruleName, counters);
};

const recordRateLimitBlocked = (ruleName: string): void => {
  const counters = rateLimitTelemetry.get(ruleName) ?? { allowed: 0, blocked: 0 };
  counters.blocked += 1;
  rateLimitTelemetry.set(ruleName, counters);
};

const recordCaptchaResult = (context: CaptchaContext, result: "passed" | "failed" | "missing" | "skipped"): void => {
  const counters = captchaTelemetry[context];
  if (result === "skipped") {
    counters.skipped += 1;
    return;
  }
  counters.checked += 1;
  if (result === "passed") {
    counters.passed += 1;
  } else if (result === "failed") {
    counters.failed += 1;
  } else {
    counters.missing += 1;
  }
};

export const resetRateLimitState = (): void => {
  rateLimitStore.clear();
  rateLimitTelemetry.clear();
};

export const resetAbuseTelemetryState = (): void => {
  captchaTelemetry.register = createCaptchaCounters();
  captchaTelemetry.proposalSubmit = createCaptchaCounters();
  rateLimitTelemetry.clear();
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
      recordRateLimitAllowed(rule.name);
      next();
      return;
    }

    if (existing.count >= rule.max) {
      recordRateLimitBlocked(rule.name);
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
    recordRateLimitAllowed(rule.name);
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
const proposalClaimLimiter = createRateLimiter({
  name: "proposal-claim",
  max: readPositiveIntEnv("RATE_LIMIT_PROPOSAL_CLAIM_MAX", 60),
  windowMs: RATE_LIMIT_WINDOW_MS
});
const proposalReviewLimiter = createRateLimiter({
  name: "proposal-review",
  max: readPositiveIntEnv("RATE_LIMIT_PROPOSAL_REVIEW_MAX", 80),
  windowMs: RATE_LIMIT_WINDOW_MS
});
const proposalAssistLimiter = createRateLimiter({
  name: "proposal-assist",
  max: readPositiveIntEnv("RATE_LIMIT_PROPOSAL_ASSIST_MAX", 100),
  windowMs: RATE_LIMIT_WINDOW_MS
});
const voteLimiter = createRateLimiter({
  name: "vote",
  max: readPositiveIntEnv("RATE_LIMIT_VOTE_MAX", 120),
  windowMs: RATE_LIMIT_WINDOW_MS
});

const CAPTCHA_ENFORCE_REGISTER = process.env.CAPTCHA_ENFORCE_REGISTER === "1";
const CAPTCHA_ENFORCE_PROPOSAL_SUBMIT = process.env.CAPTCHA_ENFORCE_PROPOSAL_SUBMIT === "1";
const CAPTCHA_STATIC_TOKEN = process.env.CAPTCHA_STATIC_TOKEN ?? "dev-captcha-pass";

const DUPLICATE_ASSIST_FUZZY_LIMIT = readPositiveIntEnv("DUPLICATE_ASSIST_FUZZY_LIMIT", 5);
const DUPLICATE_ASSIST_FUZZY_MIN_SCORE = readUnitFloatEnv("DUPLICATE_ASSIST_FUZZY_MIN_SCORE", 0.72);

const shouldEnforceCaptcha = (req: express.Request, enabled: boolean): boolean => {
  if (!enabled) {
    return false;
  }
  if (process.env.NODE_ENV !== "test") {
    return true;
  }
  return req.header("x-enable-captcha-test") === "1";
};

const enforceCaptchaForRequest = (
  req: express.Request,
  res: express.Response,
  context: CaptchaContext,
  enabled: boolean
): boolean => {
  if (!shouldEnforceCaptcha(req, enabled)) {
    recordCaptchaResult(context, "skipped");
    return true;
  }

  const captchaToken = ((req.body as { captchaToken?: string }).captchaToken ?? "").trim();
  if (!captchaToken) {
    recordCaptchaResult(context, "missing");
    res.status(400).json({ error: "captcha_required", message: "captchaToken is required" });
    return false;
  }
  if (captchaToken !== CAPTCHA_STATIC_TOKEN) {
    recordCaptchaResult(context, "failed");
    res.status(403).json({ error: "captcha_invalid", message: "captcha verification failed" });
    return false;
  }

  recordCaptchaResult(context, "passed");
  return true;
};

const buildAbuseMetricsSnapshot = (): {
  captcha: Record<CaptchaContext, CaptchaCounters>;
  rateLimit: Record<string, { allowed: number; blocked: number }>;
} => {
  const rateLimitEntries = [...rateLimitTelemetry.entries()].sort(([left], [right]) => left.localeCompare(right));
  const rateLimit = Object.fromEntries(
    rateLimitEntries.map(([rule, counters]) => [rule, { allowed: counters.allowed, blocked: counters.blocked }])
  ) as Record<string, { allowed: number; blocked: number }>;

  return {
    captcha: {
      register: { ...captchaTelemetry.register },
      proposalSubmit: { ...captchaTelemetry.proposalSubmit }
    },
    rateLimit
  };
};

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

const proposalStatuses = ["pending", "approved", "rejected", "duplicate"] as const;
type ProposalStatus = (typeof proposalStatuses)[number];

const rejectReasonCodes = ["insufficient_evidence", "invalid_identity", "not_public_figure", "out_of_scope"] as const;
const duplicateReasonCodes = ["duplicate_canonical", "duplicate_pending", "already_tracked"] as const;
type RejectReasonCode = (typeof rejectReasonCodes)[number];
type DuplicateReasonCode = (typeof duplicateReasonCodes)[number];

const isProposalStatus = (value: string): value is ProposalStatus => {
  return proposalStatuses.includes(value as ProposalStatus);
};

const isRejectReasonCode = (value: string): value is RejectReasonCode => {
  return rejectReasonCodes.includes(value as RejectReasonCode);
};

const isDuplicateReasonCode = (value: string): value is DuplicateReasonCode => {
  return duplicateReasonCodes.includes(value as DuplicateReasonCode);
};

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

  if (!enforceCaptchaForRequest(req, res, "register", CAPTCHA_ENFORCE_REGISTER)) {
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

app.get("/abuse/metrics", requireRole("moderator"), (_req, res) => {
  res.json({
    ...buildAbuseMetricsSnapshot(),
    generatedAt: new Date().toISOString()
  });
});

app.get("/politicians", (_req, res) => {
  const rows = db
    .prepare(
      "SELECT id, name, region, office, external_id AS externalId, verified, created_at AS createdAt FROM politicians WHERE deleted_at IS NULL ORDER BY created_at DESC"
    )
    .all();
  res.json({ items: rows });
});

app.post("/politicians", politicianCreateLimiter, requireRole("admin"), (req, res) => {
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

app.post("/politician-proposals", proposalSubmitLimiter, requireRole("user"), (req, res) => {
  const { name, region, office, externalId, sourceNote } = req.body as {
    name?: string;
    region?: string;
    office?: string;
    externalId?: string;
    sourceNote?: string;
    captchaToken?: string;
  };

  if (!name || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const requiresProposalCaptcha = req.auth.role === "user";
  if (requiresProposalCaptcha && !enforceCaptchaForRequest(req, res, "proposalSubmit", CAPTCHA_ENFORCE_PROPOSAL_SUBMIT)) {
    return;
  }
  if (!requiresProposalCaptcha) {
    recordCaptchaResult("proposalSubmit", "skipped");
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

const parsePageValue = (value: string | undefined, fallback: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(Math.floor(parsed), max);
};

type IdentityCandidate = {
  id: number;
  name: string;
  region: string | null;
  office: string | null;
  externalId: string | null;
};

const normalizeFuzzyValue = (value: string | null | undefined): string => {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
};

const diceSimilarity = (leftRaw: string, rightRaw: string): number => {
  const left = normalizeFuzzyValue(leftRaw);
  const right = normalizeFuzzyValue(rightRaw);

  if (!left && !right) {
    return 1;
  }
  if (!left || !right) {
    return 0;
  }
  if (left === right) {
    return 1;
  }

  const toBigrams = (value: string): string[] => {
    if (value.length < 2) {
      return [value];
    }
    const grams: string[] = [];
    for (let index = 0; index < value.length - 1; index += 1) {
      grams.push(value.slice(index, index + 2));
    }
    return grams;
  };

  const leftBigrams = toBigrams(left);
  const rightCounts = new Map<string, number>();
  for (const gram of toBigrams(right)) {
    rightCounts.set(gram, (rightCounts.get(gram) ?? 0) + 1);
  }

  let intersection = 0;
  for (const gram of leftBigrams) {
    const count = rightCounts.get(gram) ?? 0;
    if (count > 0) {
      intersection += 1;
      rightCounts.set(gram, count - 1);
    }
  }

  return (2 * intersection) / (leftBigrams.length + toBigrams(right).length);
};

const buildFuzzyDuplicateHints = (
  rows: IdentityCandidate[],
  target: Pick<IdentityCandidate, "name" | "region" | "office">,
  exactMatchedIds: Set<number>
): Array<IdentityCandidate & { score: number }> => {
  const targetName = normalizeFuzzyValue(target.name);
  const targetRegion = normalizeFuzzyValue(target.region);
  const targetOffice = normalizeFuzzyValue(target.office);

  const scored = rows
    .filter((row) => !exactMatchedIds.has(row.id))
    .map((row) => {
      const nameScore = diceSimilarity(targetName, row.name);
      const candidateRegion = normalizeFuzzyValue(row.region);
      const candidateOffice = normalizeFuzzyValue(row.office);

      const weightedScores: Array<{ weight: number; score: number }> = [{ weight: 0.8, score: nameScore }];

      if (targetRegion || candidateRegion) {
        weightedScores.push({ weight: 0.1, score: targetRegion === candidateRegion ? 1 : 0 });
      }
      if (targetOffice || candidateOffice) {
        weightedScores.push({ weight: 0.1, score: targetOffice === candidateOffice ? 1 : 0 });
      }

      const totalWeight = weightedScores.reduce((acc, part) => acc + part.weight, 0);
      const weightedScore = weightedScores.reduce((acc, part) => acc + part.score * part.weight, 0) / totalWeight;

      return {
        ...row,
        score: Number(weightedScore.toFixed(3))
      };
    })
    .filter((row) => row.score >= DUPLICATE_ASSIST_FUZZY_MIN_SCORE)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.id - right.id;
    });

  return scored.slice(0, DUPLICATE_ASSIST_FUZZY_LIMIT);
};

type ProposalTxError = {
  status: 400 | 403 | 404 | 409 | 500;
  error: string;
};

const throwProposalTxError = (status: ProposalTxError["status"], error: string): never => {
  throw { status, error } satisfies ProposalTxError;
};

const isProposalTxError = (value: unknown): value is ProposalTxError => {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    "error" in value &&
    typeof (value as { status: unknown }).status === "number" &&
    typeof (value as { error: unknown }).error === "string"
  );
};

app.get("/politician-proposals", requireRole("user"), (req, res) => {
  const statusRaw = (req.query.status as string | undefined)?.trim().toLowerCase();
  const statusFilter = statusRaw && statusRaw !== "all" ? statusRaw : null;
  if (statusFilter && !isProposalStatus(statusFilter)) {
    res.status(400).json({ error: "invalid status filter" });
    return;
  }

  const isModerator = req.auth.role === "moderator" || req.auth.role === "admin";
  const assigneeRaw = (req.query.assignee as string | undefined)?.trim();
  const ageBucket = (req.query.ageBucket as string | undefined)?.trim().toLowerCase();
  const sort = (req.query.sort as string | undefined)?.trim().toLowerCase();
  const page = parsePageValue(req.query.page as string | undefined, 1, 10_000);
  const pageSize = parsePageValue(req.query.pageSize as string | undefined, 20, 100);
  const offset = (page - 1) * pageSize;

  if (ageBucket && !["lt1h", "1to24h", "gt24h"].includes(ageBucket)) {
    res.status(400).json({ error: "invalid ageBucket filter" });
    return;
  }

  if (sort && sort !== "asc" && sort !== "desc") {
    res.status(400).json({ error: "sort must be asc or desc" });
    return;
  }

  const whereClauses: string[] = [];
  const params: Array<string | number> = [];

  if (!isModerator) {
    whereClauses.push("submitted_by = ?");
    params.push(req.auth.userId ?? "unknown");
  }

  if (statusFilter) {
    whereClauses.push("status = ?");
    params.push(statusFilter);
  }

  if (assigneeRaw) {
    if (!isModerator) {
      res.status(400).json({ error: "assignee filter requires moderator role" });
      return;
    }

    if (assigneeRaw.toLowerCase() === "unassigned") {
      whereClauses.push("assignee_id IS NULL");
    } else if (assigneeRaw.toLowerCase() === "me") {
      whereClauses.push("assignee_id = ?");
      params.push(req.auth.userId ?? "moderation");
    } else {
      whereClauses.push("assignee_id = ?");
      params.push(assigneeRaw);
    }
  }

  if (ageBucket === "lt1h") {
    whereClauses.push("created_at >= datetime('now', '-1 hour')");
  } else if (ageBucket === "1to24h") {
    whereClauses.push("created_at < datetime('now', '-1 hour') AND created_at >= datetime('now', '-24 hours')");
  } else if (ageBucket === "gt24h") {
    whereClauses.push("created_at < datetime('now', '-24 hours')");
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const sortDirection = sort === "asc" ? "ASC" : "DESC";

  const totalRow = db
    .prepare(`SELECT COUNT(*) AS total FROM politician_proposals ${whereSql}`)
    .get(...params) as { total: number };

  const items = db
    .prepare(
      `SELECT id, submitted_by AS submittedBy, assignee_id AS assigneeId, assigned_at AS assignedAt,
        name, region, office, external_id AS externalId, source_note AS sourceNote,
        status, decision_by AS decisionBy, decision_reason AS decisionReason,
        decision_code AS decisionCode, linked_politician_id AS linkedPoliticianId,
        review_version AS reviewVersion, created_at AS createdAt, decided_at AS decidedAt
       FROM politician_proposals
       ${whereSql}
       ORDER BY created_at ${sortDirection}, id ${sortDirection}
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset);

  res.json({ items, page, pageSize, total: totalRow.total });
});

app.get("/politician-proposals/metrics", requireRole("moderator"), (_req, res) => {
  const pending = db
    .prepare(
      `SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN assignee_id IS NULL THEN 1 ELSE 0 END), 0) AS unassigned,
        COALESCE(SUM(CASE WHEN assignee_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS assigned
       FROM politician_proposals
       WHERE status = 'pending'`
    )
    .get() as { total: number; unassigned: number; assigned: number };

  const buckets = db
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN created_at >= datetime('now', '-1 hour') THEN 1 ELSE 0 END), 0) AS lt1h,
        COALESCE(SUM(CASE WHEN created_at < datetime('now', '-1 hour') AND created_at >= datetime('now', '-24 hours') THEN 1 ELSE 0 END), 0) AS oneTo24h,
        COALESCE(SUM(CASE WHEN created_at < datetime('now', '-24 hours') THEN 1 ELSE 0 END), 0) AS gt24h
       FROM politician_proposals
       WHERE status = 'pending'`
    )
    .get() as { lt1h: number; oneTo24h: number; gt24h: number };

  res.json({
    pending: {
      total: Number(pending.total ?? 0),
      assigned: Number(pending.assigned ?? 0),
      unassigned: Number(pending.unassigned ?? 0)
    },
    ageBuckets: {
      lt1h: Number(buckets.lt1h ?? 0),
      oneTo24h: Number(buckets.oneTo24h ?? 0),
      gt24h: Number(buckets.gt24h ?? 0)
    }
  });
});

app.post("/politician-proposals/:id/claim", proposalClaimLimiter, requireRole("moderator"), (req, res) => {
  const proposalId = Number(req.params.id);
  const expectedVersion = (req.body as { expectedVersion?: number }).expectedVersion;

  if (!Number.isInteger(proposalId) || proposalId <= 0) {
    res.status(400).json({ error: "invalid proposal id" });
    return;
  }
  if (expectedVersion !== undefined && (!Number.isInteger(expectedVersion) || expectedVersion < 0)) {
    res.status(400).json({ error: "expectedVersion must be a non-negative integer" });
    return;
  }

  const actorId = req.auth.userId ?? "moderation";
  const claimTx = db.transaction(() => {
    const proposal = db
      .prepare("SELECT status, assignee_id AS assigneeId, review_version AS reviewVersion FROM politician_proposals WHERE id = ?")
      .get(proposalId) as { status: ProposalStatus; assigneeId: string | null; reviewVersion: number } | undefined;
    if (!proposal) {
      throwProposalTxError(404, "proposal not found");
    }
    const proposalRow = proposal!;
    if (proposalRow.status !== "pending") {
      throwProposalTxError(409, "proposal is not pending");
    }
    if (expectedVersion !== undefined && expectedVersion !== proposalRow.reviewVersion) {
      throwProposalTxError(409, "proposal version conflict");
    }
    if (proposalRow.assigneeId && proposalRow.assigneeId !== actorId) {
      throwProposalTxError(409, "proposal already claimed by another moderator");
    }
    if (proposalRow.assigneeId === actorId) {
      return { assigneeId: actorId, reviewVersion: proposalRow.reviewVersion };
    }

    const write = db
      .prepare(
        "UPDATE politician_proposals SET assignee_id = ?, assigned_at = datetime('now'), updated_at = datetime('now'), review_version = review_version + 1 WHERE id = ? AND status = 'pending' AND review_version = ?"
      )
      .run(actorId, proposalId, proposalRow.reviewVersion);
    if (write.changes === 0) {
      throwProposalTxError(409, "proposal version conflict");
    }

    return { assigneeId: actorId, reviewVersion: proposalRow.reviewVersion + 1 };
  });

  try {
    const result = claimTx();
    res.json({ ok: true, assigneeId: result.assigneeId, reviewVersion: result.reviewVersion });
  } catch (err) {
    if (isProposalTxError(err)) {
      res.status(err.status).json({ error: err.error });
      return;
    }
    res.status(500).json({ error: "internal server error" });
  }
});

app.post("/politician-proposals/:id/release", proposalClaimLimiter, requireRole("moderator"), (req, res) => {
  const proposalId = Number(req.params.id);
  const expectedVersion = (req.body as { expectedVersion?: number }).expectedVersion;

  if (!Number.isInteger(proposalId) || proposalId <= 0) {
    res.status(400).json({ error: "invalid proposal id" });
    return;
  }
  if (expectedVersion !== undefined && (!Number.isInteger(expectedVersion) || expectedVersion < 0)) {
    res.status(400).json({ error: "expectedVersion must be a non-negative integer" });
    return;
  }

  const actorId = req.auth.userId ?? "moderation";
  const isAdmin = req.auth.role === "admin";
  const releaseTx = db.transaction(() => {
    const proposal = db
      .prepare("SELECT status, assignee_id AS assigneeId, review_version AS reviewVersion FROM politician_proposals WHERE id = ?")
      .get(proposalId) as { status: ProposalStatus; assigneeId: string | null; reviewVersion: number } | undefined;
    if (!proposal) {
      throwProposalTxError(404, "proposal not found");
    }
    const proposalRow = proposal!;
    if (proposalRow.status !== "pending") {
      throwProposalTxError(409, "proposal is not pending");
    }
    if (!proposalRow.assigneeId) {
      throwProposalTxError(409, "proposal is not claimed");
    }
    if (!isAdmin && proposalRow.assigneeId !== actorId) {
      throwProposalTxError(403, "only assignee or admin can release this claim");
    }
    if (expectedVersion !== undefined && expectedVersion !== proposalRow.reviewVersion) {
      throwProposalTxError(409, "proposal version conflict");
    }

    const write = db
      .prepare(
        "UPDATE politician_proposals SET assignee_id = NULL, assigned_at = NULL, updated_at = datetime('now'), review_version = review_version + 1 WHERE id = ? AND status = 'pending' AND review_version = ?"
      )
      .run(proposalId, proposalRow.reviewVersion);
    if (write.changes === 0) {
      throwProposalTxError(409, "proposal version conflict");
    }

    return { reviewVersion: proposalRow.reviewVersion + 1 };
  });

  try {
    const result = releaseTx();
    res.json({ ok: true, reviewVersion: result.reviewVersion });
  } catch (err) {
    if (isProposalTxError(err)) {
      res.status(err.status).json({ error: err.error });
      return;
    }
    res.status(500).json({ error: "internal server error" });
  }
});

app.patch("/politician-proposals/:id/review", proposalReviewLimiter, requireRole("moderator"), (req, res) => {
  const proposalId = Number(req.params.id);
  const { decision, reason, reasonCode, linkedPoliticianId, expectedVersion } = req.body as {
    decision?: string;
    reason?: string;
    reasonCode?: string;
    linkedPoliticianId?: number;
    expectedVersion?: number;
  };

  if (decision !== "approve" && decision !== "reject" && decision !== "duplicate") {
    res.status(400).json({ error: "decision must be approve, reject, or duplicate" });
    return;
  }

  const normalizedReasonCode = reasonCode?.trim().toLowerCase();
  if (decision === "reject" && (!normalizedReasonCode || !isRejectReasonCode(normalizedReasonCode))) {
    res.status(400).json({ error: "invalid reasonCode for reject decision" });
    return;
  }
  if (decision === "duplicate" && (!normalizedReasonCode || !isDuplicateReasonCode(normalizedReasonCode))) {
    res.status(400).json({ error: "invalid reasonCode for duplicate decision" });
    return;
  }
  if (decision === "approve" && normalizedReasonCode) {
    res.status(400).json({ error: "reasonCode is not allowed for approve decision" });
    return;
  }

  if (expectedVersion !== undefined && (!Number.isInteger(expectedVersion) || expectedVersion < 0)) {
    res.status(400).json({ error: "expectedVersion must be a non-negative integer" });
    return;
  }

  const actorId = req.auth.userId ?? "moderation";
  const isAdmin = req.auth.role === "admin";
  const reasonNote = reason?.trim() || null;

  const reviewTx = db.transaction(() => {
    const proposal = db
      .prepare(
        `SELECT id, submitted_by AS submittedBy, name, region, office, external_id AS externalId,
         status, assignee_id AS assigneeId, linked_politician_id AS linkedPoliticianId, review_version AS reviewVersion
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
          assigneeId: string | null;
          linkedPoliticianId: number | null;
          reviewVersion: number;
        }
      | undefined;

    if (!proposal) {
      throwProposalTxError(404, "proposal not found");
    }
    const proposalRow = proposal!;
    if (proposalRow.status !== "pending") {
      throwProposalTxError(409, "proposal is not pending");
    }
    if (proposalRow.assigneeId && proposalRow.assigneeId !== actorId && !isAdmin) {
      throwProposalTxError(409, "proposal is claimed by another moderator");
    }
    if (expectedVersion !== undefined && expectedVersion !== proposalRow.reviewVersion) {
      throwProposalTxError(409, "proposal version conflict");
    }

    const currentVersion = proposalRow.reviewVersion;

    if (decision === "approve") {
      const created = createCanonicalPolitician(
        {
          name: proposalRow.name,
          region: proposalRow.region ?? undefined,
          office: proposalRow.office ?? undefined,
          externalId: proposalRow.externalId ?? undefined
        },
        actorId
      );
      if (!created.ok) {
        throwProposalTxError(created.status, created.error);
      }
      const createdId = (created as { ok: true; id: number }).id;

      const write = db
        .prepare(
          "UPDATE politician_proposals SET status = 'approved', decision_by = ?, decision_reason = ?, decision_code = NULL, linked_politician_id = ?, assignee_id = COALESCE(assignee_id, ?), assigned_at = COALESCE(assigned_at, datetime('now')), updated_at = datetime('now'), decided_at = datetime('now'), review_version = review_version + 1 WHERE id = ? AND status = 'pending' AND review_version = ?"
        )
        .run(actorId, reasonNote, createdId, actorId, proposalId, currentVersion);
      if (write.changes === 0) {
        throwProposalTxError(409, "proposal version conflict");
      }

      db.prepare(
        "INSERT INTO politician_proposal_audits (proposal_id, actor_id, action, from_status, to_status, reason, reason_code, linked_politician_id) VALUES (?, ?, 'approved', 'pending', 'approved', ?, NULL, ?)"
      ).run(proposalId, actorId, reasonNote, createdId);

      return { status: "approved" as const, politicianId: createdId, reviewVersion: currentVersion + 1 };
    }

    let linkedId: number | null = null;
    if (decision === "duplicate") {
      linkedId = linkedPoliticianId ?? null;
      if (linkedId != null) {
        const linked = db
          .prepare("SELECT 1 FROM politicians WHERE id = ? AND deleted_at IS NULL LIMIT 1")
          .get(linkedId) as { "1"?: number } | undefined;
        if (!linked) {
          throwProposalTxError(404, "linked politician not found");
        }
      }
    }

    const nextStatus = decision === "reject" ? "rejected" : "duplicate";
    const action = decision === "reject" ? "rejected" : "duplicate";
    const write = db
      .prepare(
        "UPDATE politician_proposals SET status = ?, decision_by = ?, decision_reason = ?, decision_code = ?, linked_politician_id = ?, assignee_id = COALESCE(assignee_id, ?), assigned_at = COALESCE(assigned_at, datetime('now')), updated_at = datetime('now'), decided_at = datetime('now'), review_version = review_version + 1 WHERE id = ? AND status = 'pending' AND review_version = ?"
      )
      .run(nextStatus, actorId, reasonNote, normalizedReasonCode ?? null, linkedId, actorId, proposalId, currentVersion);
    if (write.changes === 0) {
      throwProposalTxError(409, "proposal version conflict");
    }

    db.prepare(
      "INSERT INTO politician_proposal_audits (proposal_id, actor_id, action, from_status, to_status, reason, reason_code, linked_politician_id) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)"
    ).run(proposalId, actorId, action, nextStatus, reasonNote, normalizedReasonCode ?? null, linkedId);

    return { status: nextStatus, politicianId: linkedId, reviewVersion: currentVersion + 1 };
  });

  try {
    const result = reviewTx();
    res.json({ ok: true, status: result.status, politicianId: result.politicianId, reviewVersion: result.reviewVersion });
  } catch (err) {
    if (isProposalTxError(err)) {
      res.status(err.status).json({ error: err.error });
      return;
    }
    res.status(500).json({ error: "internal server error" });
  }
});

app.get("/politician-proposals/:id/duplicate-assist", proposalAssistLimiter, requireRole("moderator"), (req, res) => {
  const proposalId = Number(req.params.id);
  const proposal = db
    .prepare(
      `SELECT id, name, region, office, external_id AS externalId, normalized_submission_key AS normalizedKey
       FROM politician_proposals WHERE id = ?`
    )
    .get(proposalId) as
    | {
        id: number;
        name: string;
        region: string | null;
        office: string | null;
        externalId: string | null;
        normalizedKey: string;
      }
    | undefined;

  if (!proposal) {
    res.status(404).json({ error: "proposal not found" });
    return;
  }
  const proposalRow = proposal!;

  const canonicalMap = new Map<number, { id: number; name: string; region: string | null; office: string | null; externalId: string | null; matchOn: Set<string> }>();
  const pendingMap = new Map<number, { id: number; name: string; region: string | null; office: string | null; externalId: string | null; matchOn: Set<string> }>();

  const addCanonical = (
    rows: Array<{ id: number; name: string; region: string | null; office: string | null; externalId: string | null }>,
    matchOn: string
  ): void => {
    for (const row of rows) {
      const existing = canonicalMap.get(row.id);
      if (existing) {
        existing.matchOn.add(matchOn);
      } else {
        canonicalMap.set(row.id, { ...row, matchOn: new Set([matchOn]) });
      }
    }
  };

  const addPending = (
    rows: Array<{ id: number; name: string; region: string | null; office: string | null; externalId: string | null }>,
    matchOn: string
  ): void => {
    for (const row of rows) {
      const existing = pendingMap.get(row.id);
      if (existing) {
        existing.matchOn.add(matchOn);
      } else {
        pendingMap.set(row.id, { ...row, matchOn: new Set([matchOn]) });
      }
    }
  };

  if (proposalRow.externalId) {
    addCanonical(
      db
        .prepare(
          "SELECT id, name, region, office, external_id AS externalId FROM politicians WHERE deleted_at IS NULL AND external_id = ? ORDER BY id"
        )
        .all(proposalRow.externalId) as Array<{ id: number; name: string; region: string | null; office: string | null; externalId: string | null }>,
      "externalId"
    );

    addPending(
      db
        .prepare(
          "SELECT id, name, region, office, external_id AS externalId FROM politician_proposals WHERE id != ? AND status = 'pending' AND external_id = ? ORDER BY id"
        )
        .all(proposalId, proposalRow.externalId) as Array<{ id: number; name: string; region: string | null; office: string | null; externalId: string | null }>,
      "externalId"
    );
  }

  addCanonical(
    db
      .prepare(
        "SELECT id, name, region, office, external_id AS externalId FROM politicians WHERE deleted_at IS NULL AND normalized_key = ? ORDER BY id"
      )
      .all(proposalRow.normalizedKey) as Array<{ id: number; name: string; region: string | null; office: string | null; externalId: string | null }>,
    "normalizedKey"
  );

  addPending(
    db
      .prepare(
        "SELECT id, name, region, office, external_id AS externalId FROM politician_proposals WHERE id != ? AND status = 'pending' AND normalized_submission_key = ? ORDER BY id"
      )
      .all(proposalId, proposalRow.normalizedKey) as Array<{ id: number; name: string; region: string | null; office: string | null; externalId: string | null }>,
    "normalizedKey"
  );

  const fuzzyCanonicalHints = buildFuzzyDuplicateHints(
    db
      .prepare("SELECT id, name, region, office, external_id AS externalId FROM politicians WHERE deleted_at IS NULL ORDER BY id")
      .all() as IdentityCandidate[],
    {
      name: proposalRow.name,
      region: proposalRow.region,
      office: proposalRow.office
    },
    new Set(canonicalMap.keys())
  );

  const fuzzyPendingProposalHints = buildFuzzyDuplicateHints(
    db
      .prepare(
        "SELECT id, name, region, office, external_id AS externalId FROM politician_proposals WHERE id != ? AND status = 'pending' ORDER BY id"
      )
      .all(proposalId) as IdentityCandidate[],
    {
      name: proposalRow.name,
      region: proposalRow.region,
      office: proposalRow.office
    },
    new Set(pendingMap.keys())
  );

  const canonicalMatches = [...canonicalMap.values()].map((row) => ({
    id: row.id,
    name: row.name,
    region: row.region,
    office: row.office,
    externalId: row.externalId,
    matchOn: [...row.matchOn]
  }));
  const pendingProposalMatches = [...pendingMap.values()].map((row) => ({
    id: row.id,
    name: row.name,
    region: row.region,
    office: row.office,
    externalId: row.externalId,
    matchOn: [...row.matchOn]
  }));

  res.json({
    proposalId,
    canonicalMatches,
    pendingProposalMatches,
    fuzzyHints: {
      canonical: fuzzyCanonicalHints,
      pendingProposals: fuzzyPendingProposalHints
    }
  });
});

app.get("/politician-proposals/:id/audits", requireRole("moderator"), (req, res) => {
  const proposalId = Number(req.params.id);
  const proposal = db.prepare("SELECT id FROM politician_proposals WHERE id = ?").get(proposalId) as { id: number } | undefined;
  if (!proposal) {
    res.status(404).json({ error: "proposal not found" });
    return;
  }

  const actorIdFilter = (req.query.actorId as string | undefined)?.trim();
  const actionFilter = (req.query.action as string | undefined)?.trim().toLowerCase();
  const statusFilter = (req.query.status as string | undefined)?.trim().toLowerCase();
  const fromDate = (req.query.fromDate as string | undefined)?.trim();
  const toDate = (req.query.toDate as string | undefined)?.trim();
  const page = parsePageValue(req.query.page as string | undefined, 1, 10_000);
  const pageSize = parsePageValue(req.query.pageSize as string | undefined, 20, 100);
  const offset = (page - 1) * pageSize;

  if (actionFilter && !["submitted", "approved", "rejected", "duplicate", "linked"].includes(actionFilter)) {
    res.status(400).json({ error: "invalid action filter" });
    return;
  }
  if (statusFilter && !isProposalStatus(statusFilter)) {
    res.status(400).json({ error: "invalid status filter" });
    return;
  }

  const conditions = ["proposal_id = ?"];
  const params: Array<string | number> = [proposalId];

  if (actorIdFilter) {
    conditions.push("actor_id = ?");
    params.push(actorIdFilter);
  }
  if (actionFilter) {
    conditions.push("action = ?");
    params.push(actionFilter);
  }
  if (statusFilter) {
    conditions.push("to_status = ?");
    params.push(statusFilter);
  }
  if (fromDate) {
    conditions.push("created_at >= ?");
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push("created_at <= ?");
    params.push(toDate);
  }

  const whereSql = `WHERE ${conditions.join(" AND ")}`;
  const totalRow = db
    .prepare(`SELECT COUNT(*) AS total FROM politician_proposal_audits ${whereSql}`)
    .get(...params) as { total: number };

  const items = db
    .prepare(
      `SELECT id, proposal_id AS proposalId, actor_id AS actorId, action, from_status AS fromStatus,
       to_status AS toStatus, reason, reason_code AS reasonCode, linked_politician_id AS linkedPoliticianId, created_at AS createdAt
       FROM politician_proposal_audits
       ${whereSql}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset);

  res.json({ items, page, pageSize, total: totalRow.total });
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

  db.prepare(
    "INSERT INTO revision_audits (statement_id, actor_id, change_type, from_value, to_value) VALUES (?, ?, 'pendingDeleteStatement', NULL, ?)"
  ).run(statementId, req.auth.userId ?? "moderation", "pending_delete");

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

  db.prepare(
    "INSERT INTO revision_audits (statement_id, actor_id, change_type, from_value, to_value) VALUES (?, ?, 'withdrawStatement', NULL, ?)"
  ).run(statementId, req.auth.userId ?? "unknown", "withdrawn_deleted");

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

  db.prepare(
    "INSERT INTO revision_audits (statement_id, actor_id, change_type, from_value, to_value) VALUES (?, ?, 'approveDeleteStatement', ?, ?)"
  ).run(statementId, req.auth.userId ?? "moderation", "pending_delete", "deleted");

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

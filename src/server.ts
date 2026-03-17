// WHAT IT DO? Starts the HTTP service and wires role guards for protected operations.
import crypto from "node:crypto";

import express from "express";

import { authContext } from "./auth/context.js";
import { signToken } from "./auth/jwt.js";
import { requireRole } from "./auth/role-guard.js";
import {
  getCanonicalPromiseById,
  getStatementCanonicalMetadataMap,
  listCanonicalPromiseSources,
  listCanonicalPromises
} from "./db/canonical-promises.js";
import { db } from "./db/client.js";
import { getPartyById, listCurrentPartyContexts, listParties, listPartyAliases, listPartyMembers } from "./db/party-graph.js";
import {
  buildPromiseClaimDuplicateAssist,
  claimStatuses,
  getPromiseClaimById,
  listCanonicalHistory,
  listClaimEquivalenceSignals,
  listPromiseClaimAudits,
  listPromiseClaims
} from "./db/promise-claims.js";
import {
  getLatestPromiseFulfillmentAssessment,
  getPartyStanceById,
  getVoteEventById,
  listPartyStances,
  listPromiseFulfillmentAssessments,
  listPromisePartyAlignments,
  listPromiseVoteComparisons,
  listVoteEventRecords,
  listVoteEvents,
  politicianHasPartyMembership,
  summarizePromiseVoteAlignment
} from "./db/trust-records.js";

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
const canonicalPublicStatuses = ["draft", "public"] as const;
const promiseClaimRejectReasonCodes = ["insufficient_evidence", "unverifiable_source", "out_of_scope"] as const;
const promiseClaimSignalReasonCodes = ["same_claim", "same_promise", "different_subject", "different_scope"] as const;
const voteRecordValues = ["for", "against", "abstain", "absent"] as const;
const alignedVoteValues = ["for", "against", "abstain"] as const;
const fulfillmentStatuses = ["fulfilled", "broken", "in_progress", "unknown"] as const;
const partyAlignmentStatuses = ["aligned", "broke_party_line"] as const;
type RejectReasonCode = (typeof rejectReasonCodes)[number];
type DuplicateReasonCode = (typeof duplicateReasonCodes)[number];
type CanonicalPublicStatus = (typeof canonicalPublicStatuses)[number];
type PromiseClaimRejectReasonCode = (typeof promiseClaimRejectReasonCodes)[number];
type PromiseClaimSignalReasonCode = (typeof promiseClaimSignalReasonCodes)[number];
type VoteRecordValue = (typeof voteRecordValues)[number];
type AlignedVoteValue = (typeof alignedVoteValues)[number];
type FulfillmentStatus = (typeof fulfillmentStatuses)[number];
type PartyAlignmentStatus = (typeof partyAlignmentStatuses)[number];

const isProposalStatus = (value: string): value is ProposalStatus => {
  return proposalStatuses.includes(value as ProposalStatus);
};

const isRejectReasonCode = (value: string): value is RejectReasonCode => {
  return rejectReasonCodes.includes(value as RejectReasonCode);
};

const isDuplicateReasonCode = (value: string): value is DuplicateReasonCode => {
  return duplicateReasonCodes.includes(value as DuplicateReasonCode);
};

const isCanonicalPublicStatus = (value: string): value is CanonicalPublicStatus => {
  return canonicalPublicStatuses.includes(value as CanonicalPublicStatus);
};

const isPromiseClaimStatus = (value: string): value is (typeof claimStatuses)[number] => {
  return claimStatuses.includes(value as (typeof claimStatuses)[number]);
};

const isPromiseClaimRejectReasonCode = (value: string): value is PromiseClaimRejectReasonCode => {
  return promiseClaimRejectReasonCodes.includes(value as PromiseClaimRejectReasonCode);
};

const isPromiseClaimSignalReasonCode = (value: string): value is PromiseClaimSignalReasonCode => {
  return promiseClaimSignalReasonCodes.includes(value as PromiseClaimSignalReasonCode);
};

const isVoteRecordValue = (value: string): value is VoteRecordValue => {
  return voteRecordValues.includes(value as VoteRecordValue);
};

const isAlignedVoteValue = (value: string): value is AlignedVoteValue => {
  return alignedVoteValues.includes(value as AlignedVoteValue);
};

const isFulfillmentStatus = (value: string): value is FulfillmentStatus => {
  return fulfillmentStatuses.includes(value as FulfillmentStatus);
};

const isPartyAlignmentStatus = (value: string): value is PartyAlignmentStatus => {
  return partyAlignmentStatuses.includes(value as PartyAlignmentStatus);
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

app.get("/search", (req, res) => {
  const query = (req.query.q as string | undefined)?.trim() ?? "";
  if (query.length < 2) {
    res.json({ items: [] });
    return;
  }

  const includeNonPublic = req.auth.role === "moderator" || req.auth.role === "admin";
  res.json({
    items: buildSearchItems(query, includeNonPublic)
  });
});

app.get("/abuse/metrics", requireRole("moderator"), (_req, res) => {
  res.json({
    ...buildAbuseMetricsSnapshot(),
    generatedAt: new Date().toISOString()
  });
});

app.get("/politicians", (_req, res) => {
  const includeNonPublic = _req.auth.role === "moderator" || _req.auth.role === "admin";
  const rows = db
    .prepare(
      "SELECT id, name, region, office, external_id AS externalId, verified, created_at AS createdAt FROM politicians WHERE deleted_at IS NULL ORDER BY created_at DESC"
    )
    .all() as Array<{
      id: number;
      name: string;
      region: string | null;
      office: string | null;
      externalId: string | null;
      verified: number;
      createdAt: string;
    }>;
  const currentParties = new Map(listCurrentPartyContexts().map((entry) => [entry.politicianId, entry]));
  res.json({
    items: rows.map((row) => {
      const party = currentParties.get(row.id);
      return {
        ...row,
        partyId: party?.partyId ?? null,
        partyName: party?.partyName ?? null,
        partyShortName: party?.partyShortName ?? null,
        trustSummary: getPoliticianTrustSummary(row.id, includeNonPublic)
      };
    })
  });
});

app.get("/politicians/:id/trust-summary", (req, res) => {
  const politicianId = Number(req.params.id);
  if (!Number.isInteger(politicianId) || politicianId <= 0) {
    res.status(400).json({ error: "invalid politician id" });
    return;
  }

  const politician = db
    .prepare(
      `SELECT id, name, region, office, external_id AS externalId, verified, created_at AS createdAt
       FROM politicians
       WHERE id = ? AND deleted_at IS NULL
       LIMIT 1`
    )
    .get(politicianId) as
    | {
        id: number;
        name: string;
        region: string | null;
        office: string | null;
        externalId: string | null;
        verified: number;
        createdAt: string;
      }
    | undefined;
  if (!politician) {
    res.status(404).json({ error: "politician not found" });
    return;
  }

  const includeNonPublic = req.auth.role === "moderator" || req.auth.role === "admin";
  res.json({
    politician,
    trustSummary: getPoliticianTrustSummary(politicianId, includeNonPublic)
  });
});

app.get("/parties", (_req, res) => {
  const includeNonPublic = _req.auth.role === "moderator" || _req.auth.role === "admin";
  res.json({
    items: listParties().map((row) => {
      const trustSummary = getPartyTrustSummary(row.id, includeNonPublic);
      return {
        ...serializePartySummary(row),
        officialStanceCount: trustSummary.officialStanceCount,
        trustSummary
      };
    })
  });
});

app.get("/parties/:id", (req, res) => {
  const partyId = req.params.id.trim();
  const party = getPartyById(partyId);
  if (!party) {
    res.status(404).json({ error: "party not found" });
    return;
  }

  const includeNonPublic = req.auth.role === "moderator" || req.auth.role === "admin";
  const trustSummary = getPartyTrustSummary(partyId, includeNonPublic);
  res.json({
    party: {
      ...serializePartySummary(party),
      officialStanceCount: trustSummary.officialStanceCount,
      trustSummary
    },
    aliases: listPartyAliases(partyId),
    membersUrl: `/parties/${partyId}/members`
  });
});

app.get("/parties/:id/members", (req, res) => {
  const partyId = req.params.id.trim();
  const party = getPartyById(partyId);
  if (!party) {
    res.status(404).json({ error: "party not found" });
    return;
  }

  const includeHistorical = String(req.query.includeHistorical ?? "") === "1";
  const includeNonPublic = req.auth.role === "moderator" || req.auth.role === "admin";
  const trustMembers = new Map(
    listCurrentPartyTrustMembers(partyId, includeNonPublic).map((member) => [member.politicianId, member])
  );
  res.json({
    partyId,
    includeHistorical,
    items: listPartyMembers(partyId, includeHistorical).map((row) => ({
      ...row,
      current: Number(row.current ?? 0),
      trustSummary: trustMembers.get(row.politicianId) ?? null
    }))
  });
});

app.post("/parties", requireRole("moderator"), (req, res) => {
  const { id, name, shortName, countryCode, description, websiteUrl } = req.body as {
    id?: string;
    name?: string;
    shortName?: string;
    countryCode?: string;
    description?: string;
    websiteUrl?: string;
  };

  const normalizedId = id?.trim().toLowerCase() ?? "";
  const normalizedName = name?.trim() ?? "";
  const normalizedShortName = shortName?.trim() ?? "";
  const normalizedCountryCode = (countryCode?.trim().toUpperCase() || "FI");

  if (!partyIdPattern.test(normalizedId)) {
    res.status(400).json({ error: "party id must be lowercase letters, digits, or hyphens" });
    return;
  }
  if (!normalizedName) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (!normalizedShortName) {
    res.status(400).json({ error: "shortName is required" });
    return;
  }
  if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
    res.status(400).json({ error: "countryCode must be a two-letter uppercase code" });
    return;
  }

  try {
    db.prepare(
      `INSERT INTO parties (id, name, short_name, country_code, description, website_url, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      normalizedId,
      normalizedName,
      normalizedShortName,
      normalizedCountryCode,
      normalizeOptionalText(description),
      normalizeOptionalText(websiteUrl),
      req.auth.userId ?? "moderation"
    );
    res.status(201).json({ id: normalizedId });
  } catch (err) {
    const code = (err as { code?: string }).code;
    const isUniqueness = code === "SQLITE_CONSTRAINT_UNIQUE" || String((err as Error).message).includes("UNIQUE constraint");
    res.status(isUniqueness ? 409 : 500).json({
      error: isUniqueness ? "party already exists" : "internal server error"
    });
  }
});

app.post("/parties/:id/aliases", requireRole("moderator"), (req, res) => {
  const partyId = req.params.id.trim();
  const { alias, sourceNote } = req.body as { alias?: string; sourceNote?: string };

  if (!getPartyById(partyId)) {
    res.status(404).json({ error: "party not found" });
    return;
  }
  const normalizedAlias = alias?.trim() ?? "";
  if (!normalizedAlias) {
    res.status(400).json({ error: "alias is required" });
    return;
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO party_aliases (party_id, alias, source_note, created_by, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      )
      .run(partyId, normalizedAlias, normalizeOptionalText(sourceNote), req.auth.userId ?? "moderation");
    res.status(201).json({ id: result.lastInsertRowid as number, partyId });
  } catch (err) {
    const code = (err as { code?: string }).code;
    const isUniqueness = code === "SQLITE_CONSTRAINT_UNIQUE" || String((err as Error).message).includes("UNIQUE constraint");
    res.status(isUniqueness ? 409 : 500).json({
      error: isUniqueness ? "party alias already exists" : "internal server error"
    });
  }
});

app.post("/party-memberships", requireRole("moderator"), (req, res) => {
  const { politicianId, partyId, roleTitle, startDate, endDate, sourceNote } = req.body as {
    politicianId?: number;
    partyId?: string;
    roleTitle?: string;
    startDate?: string | null;
    endDate?: string | null;
    sourceNote?: string;
  };

  if (!Number.isInteger(politicianId) || (politicianId ?? 0) <= 0) {
    res.status(400).json({ error: "politicianId must be a positive integer" });
    return;
  }
  const normalizedPartyId = partyId?.trim().toLowerCase() ?? "";
  if (!normalizedPartyId) {
    res.status(400).json({ error: "partyId is required" });
    return;
  }
  const normalizedStartDate = normalizeOptionalDate(startDate);
  const normalizedEndDate = normalizeOptionalDate(endDate);
  if (normalizedStartDate === "__INVALID_DATE__" || normalizedEndDate === "__INVALID_DATE__") {
    res.status(400).json({ error: "startDate and endDate must use YYYY-MM-DD format" });
    return;
  }
  if (normalizedStartDate && normalizedEndDate && normalizedEndDate < normalizedStartDate) {
    res.status(400).json({ error: "endDate cannot be earlier than startDate" });
    return;
  }

  const politician = db.prepare("SELECT 1 FROM politicians WHERE id = ? AND deleted_at IS NULL LIMIT 1").get(politicianId) as { "1"?: number } | undefined;
  if (!politician) {
    res.status(404).json({ error: "politician not found" });
    return;
  }
  if (!getPartyById(normalizedPartyId)) {
    res.status(404).json({ error: "party not found" });
    return;
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO party_memberships (politician_id, party_id, role_title, start_date, end_date, source_note, created_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(
        politicianId,
        normalizedPartyId,
        normalizeOptionalText(roleTitle),
        normalizedStartDate,
        normalizedEndDate,
        normalizeOptionalText(sourceNote),
        req.auth.userId ?? "moderation"
      );
    res.status(201).json({ id: result.lastInsertRowid as number });
  } catch (err) {
    const code = (err as { code?: string }).code;
    const isUniqueness = code === "SQLITE_CONSTRAINT_UNIQUE" || String((err as Error).message).includes("UNIQUE constraint");
    res.status(isUniqueness ? 409 : 500).json({
      error: isUniqueness ? "politician already has an active party membership" : "internal server error"
    });
  }
});

app.patch("/party-memberships/:id", requireRole("moderator"), (req, res) => {
  const membershipId = Number(req.params.id);
  if (!Number.isInteger(membershipId) || membershipId <= 0) {
    res.status(400).json({ error: "invalid membership id" });
    return;
  }

  const existing = db
    .prepare(
      `SELECT id, politician_id AS politicianId, party_id AS partyId, role_title AS roleTitle, start_date AS startDate,
       end_date AS endDate, source_note AS sourceNote
       FROM party_memberships WHERE id = ?`
    )
    .get(membershipId) as
    | {
        id: number;
        politicianId: number;
        partyId: string;
        roleTitle: string | null;
        startDate: string | null;
        endDate: string | null;
        sourceNote: string | null;
      }
    | undefined;

  if (!existing) {
    res.status(404).json({ error: "party membership not found" });
    return;
  }

  const hasPartyId = Object.prototype.hasOwnProperty.call(req.body, "partyId");
  const hasRoleTitle = Object.prototype.hasOwnProperty.call(req.body, "roleTitle");
  const hasStartDate = Object.prototype.hasOwnProperty.call(req.body, "startDate");
  const hasEndDate = Object.prototype.hasOwnProperty.call(req.body, "endDate");
  const hasSourceNote = Object.prototype.hasOwnProperty.call(req.body, "sourceNote");

  const nextPartyId = hasPartyId ? String((req.body as { partyId?: string }).partyId ?? "").trim().toLowerCase() : existing.partyId;
  if (!nextPartyId) {
    res.status(400).json({ error: "partyId cannot be empty" });
    return;
  }
  if (!getPartyById(nextPartyId)) {
    res.status(404).json({ error: "party not found" });
    return;
  }

  const nextStartDate = hasStartDate ? normalizeOptionalDate((req.body as { startDate?: string | null }).startDate) : existing.startDate;
  const nextEndDate = hasEndDate ? normalizeOptionalDate((req.body as { endDate?: string | null }).endDate) : existing.endDate;
  if (nextStartDate === "__INVALID_DATE__" || nextEndDate === "__INVALID_DATE__") {
    res.status(400).json({ error: "startDate and endDate must use YYYY-MM-DD format" });
    return;
  }
  if (nextStartDate && nextEndDate && nextEndDate < nextStartDate) {
    res.status(400).json({ error: "endDate cannot be earlier than startDate" });
    return;
  }

  try {
    db.prepare(
      `UPDATE party_memberships
       SET party_id = ?, role_title = ?, start_date = ?, end_date = ?, source_note = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      nextPartyId,
      hasRoleTitle ? normalizeOptionalText((req.body as { roleTitle?: string | null }).roleTitle) : existing.roleTitle,
      nextStartDate,
      nextEndDate,
      hasSourceNote ? normalizeOptionalText((req.body as { sourceNote?: string | null }).sourceNote) : existing.sourceNote,
      membershipId
    );
    res.json({ ok: true });
  } catch (err) {
    const code = (err as { code?: string }).code;
    const isUniqueness = code === "SQLITE_CONSTRAINT_UNIQUE" || String((err as Error).message).includes("UNIQUE constraint");
    res.status(isUniqueness ? 409 : 500).json({
      error: isUniqueness ? "politician already has an active party membership" : "internal server error"
    });
  }
});

app.get("/parties/:id/stances", (req, res) => {
  const partyId = req.params.id.trim();
  if (!getPartyById(partyId)) {
    res.status(404).json({ error: "party not found" });
    return;
  }

  res.json({ items: listPartyStances(partyId) });
});

app.post("/party-stances", requireRole("moderator"), (req, res) => {
  const { partyId, issue, stanceText, sourceUrl, sourceNote, dateSaid } = req.body as {
    partyId?: string;
    issue?: string;
    stanceText?: string;
    sourceUrl?: string;
    sourceNote?: string;
    dateSaid?: string;
  };

  const normalizedPartyId = partyId?.trim().toLowerCase() ?? "";
  const normalizedStanceText = stanceText?.trim() ?? "";
  const normalizedSourceUrl = sourceUrl?.trim() ?? "";
  const normalizedDateSaid = normalizeOptionalDate(dateSaid);

  if (!normalizedPartyId || !normalizedStanceText || !normalizedSourceUrl || !normalizedDateSaid) {
    res.status(400).json({ error: "partyId, stanceText, sourceUrl, and dateSaid are required" });
    return;
  }
  if (normalizedDateSaid === INVALID_DATE_TOKEN) {
    res.status(400).json({ error: "dateSaid must use YYYY-MM-DD format" });
    return;
  }
  if (!getPartyById(normalizedPartyId)) {
    res.status(404).json({ error: "party not found" });
    return;
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO party_stances (party_id, issue, stance_text, source_url, source_note, date_said, created_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(
        normalizedPartyId,
        normalizeOptionalText(issue),
        normalizedStanceText,
        normalizedSourceUrl,
        normalizeOptionalText(sourceNote),
        normalizedDateSaid,
        req.auth.userId ?? "moderation"
      );
    res.status(201).json({ id: result.lastInsertRowid as number, partyId: normalizedPartyId });
  } catch (err) {
    const code = (err as { code?: string }).code;
    const isUniqueness = code === "SQLITE_CONSTRAINT_UNIQUE" || String((err as Error).message).includes("UNIQUE constraint");
    res.status(isUniqueness ? 409 : 500).json({
      error: isUniqueness ? "party stance already exists" : "internal server error"
    });
  }
});

app.get("/vote-events", (req, res) => {
  const politicianIdRaw = req.query.politicianId as string | undefined;
  const politicianId = politicianIdRaw ? Number(politicianIdRaw) : undefined;
  if (politicianIdRaw !== undefined && (!Number.isInteger(politicianId) || (politicianId ?? 0) <= 0)) {
    res.status(400).json({ error: "politicianId must be a positive integer" });
    return;
  }

  res.json({
    items: listVoteEvents({ politicianId }).map(serializeVoteEventSummary)
  });
});

app.get("/vote-events/:id", (req, res) => {
  const voteEventId = Number(req.params.id);
  if (!Number.isInteger(voteEventId) || voteEventId <= 0) {
    res.status(400).json({ error: "invalid vote event id" });
    return;
  }

  const event = getVoteEventById(voteEventId);
  if (!event) {
    res.status(404).json({ error: "vote event not found" });
    return;
  }

  res.json({
    event: serializeVoteEventSummary(event),
    records: listVoteEventRecords(voteEventId)
  });
});

app.post("/vote-events", requireRole("moderator"), (req, res) => {
  const { externalKey, countryCode, institutionName, issue, title, sourceUrl, sourceNote, eventDate } = req.body as {
    externalKey?: string;
    countryCode?: string;
    institutionName?: string;
    issue?: string;
    title?: string;
    sourceUrl?: string;
    sourceNote?: string;
    eventDate?: string;
  };

  const normalizedTitle = title?.trim() ?? "";
  const normalizedSourceUrl = sourceUrl?.trim() ?? "";
  const normalizedCountryCode = (countryCode?.trim().toUpperCase() || "FI");
  const normalizedEventDate = normalizeOptionalDate(eventDate);

  if (!normalizedTitle || !normalizedSourceUrl || !normalizedEventDate) {
    res.status(400).json({ error: "title, sourceUrl, and eventDate are required" });
    return;
  }
  if (normalizedEventDate === INVALID_DATE_TOKEN) {
    res.status(400).json({ error: "eventDate must use YYYY-MM-DD format" });
    return;
  }
  if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
    res.status(400).json({ error: "countryCode must be a two-letter uppercase code" });
    return;
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO vote_events
         (external_key, country_code, institution_name, issue, title, source_url, source_note, event_date, created_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(
        normalizeOptionalText(externalKey),
        normalizedCountryCode,
        normalizeOptionalText(institutionName) ?? "Eduskunta",
        normalizeOptionalText(issue),
        normalizedTitle,
        normalizedSourceUrl,
        normalizeOptionalText(sourceNote),
        normalizedEventDate,
        req.auth.userId ?? "moderation"
      );
    res.status(201).json({ id: result.lastInsertRowid as number });
  } catch (err) {
    const code = (err as { code?: string }).code;
    const isUniqueness = code === "SQLITE_CONSTRAINT_UNIQUE" || String((err as Error).message).includes("UNIQUE constraint");
    res.status(isUniqueness ? 409 : 500).json({
      error: isUniqueness ? "vote event already exists" : "internal server error"
    });
  }
});

app.post("/vote-events/:id/records", requireRole("moderator"), (req, res) => {
  const voteEventId = Number(req.params.id);
  const { politicianId, voteValue, sourceNote } = req.body as {
    politicianId?: number;
    voteValue?: string;
    sourceNote?: string;
  };

  if (!Number.isInteger(voteEventId) || voteEventId <= 0) {
    res.status(400).json({ error: "invalid vote event id" });
    return;
  }
  if (!Number.isInteger(politicianId) || (politicianId ?? 0) <= 0) {
    res.status(400).json({ error: "politicianId must be a positive integer" });
    return;
  }
  const normalizedVoteValue = voteValue?.trim().toLowerCase() ?? "";
  if (!isVoteRecordValue(normalizedVoteValue)) {
    res.status(400).json({ error: "voteValue must be for, against, abstain, or absent" });
    return;
  }
  if (!getVoteEventById(voteEventId)) {
    res.status(404).json({ error: "vote event not found" });
    return;
  }
  const politician = db.prepare("SELECT 1 FROM politicians WHERE id = ? AND deleted_at IS NULL LIMIT 1").get(politicianId) as { "1"?: number } | undefined;
  if (!politician) {
    res.status(404).json({ error: "politician not found" });
    return;
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO politician_vote_records (vote_event_id, politician_id, vote_value, source_note, created_by, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(voteEventId, politicianId, normalizedVoteValue, normalizeOptionalText(sourceNote), req.auth.userId ?? "moderation");
    res.status(201).json({ id: result.lastInsertRowid as number, voteEventId, politicianId });
  } catch (err) {
    const code = (err as { code?: string }).code;
    const isUniqueness = code === "SQLITE_CONSTRAINT_UNIQUE" || String((err as Error).message).includes("UNIQUE constraint");
    res.status(isUniqueness ? 409 : 500).json({
      error: isUniqueness ? "politician vote record already exists for this event" : "internal server error"
    });
  }
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

const partyIdPattern = /^[a-z0-9-]{2,40}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const INVALID_DATE_TOKEN = "__INVALID_DATE__";

const normalizeOptionalText = (value: unknown): string | null => {
  if (value == null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
};

const normalizeOptionalDate = (value: unknown): string | null => {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  return datePattern.test(normalized) ? normalized : INVALID_DATE_TOKEN;
};

const serializePartySummary = (row: ReturnType<typeof listParties>[number]) => ({
  ...row,
  aliasCount: Number(row.aliasCount ?? 0),
  memberCount: Number(row.memberCount ?? 0),
  currentMemberCount: Number(row.currentMemberCount ?? 0)
});

const serializeVoteEventSummary = (row: ReturnType<typeof listVoteEvents>[number]) => ({
  ...row,
  recordCount: Number(row.recordCount ?? 0),
  linkedPromiseCount: Number(row.linkedPromiseCount ?? 0)
});

type PromiseStatsSummary = {
  total: number;
  fulfilled: number;
  broken: number;
  inProgress: number;
  unknown: number;
};

type VoteAlignmentStatsSummary = {
  aligned: number;
  contradicted: number;
  mixed: number;
  unknown: number;
};

type PartyLineStatsSummary = {
  aligned: number;
  brokePartyLine: number;
  unknown: number;
};

type FulfillmentPercentagesSummary = {
  fulfilled: number;
  broken: number;
  inProgress: number;
  unknown: number;
};

type VoteAlignmentPercentagesSummary = {
  aligned: number;
  contradicted: number;
  mixed: number;
  unknown: number;
};

type PartyLinePercentagesSummary = {
  aligned: number;
  brokePartyLine: number;
  unknown: number;
};

type PoliticianPromiseTrustSummary = {
  canonicalPromiseId: number;
  statementId: number | null;
  promiseText: string;
  datePromised: string;
  acceptedSourceCount: number;
  fulfillmentStatus: FulfillmentStatus;
  fulfillmentSummary: string;
  voteAlignment: ReturnType<typeof summarizePromiseVoteAlignment>;
  voteComparisonCount: number;
  partyLineStatus: PartyAlignmentStatus | "unknown";
  latestEvidenceDate: string | null;
};

type CanonicalPromiseTrustContext = {
  latestFulfillment: ReturnType<typeof getLatestPromiseFulfillmentAssessment> | null;
  voteAlignmentSummary: ReturnType<typeof summarizePromiseVoteAlignment>;
  voteComparisons: ReturnType<typeof listPromiseVoteComparisons>;
  latestPartyAlignment: ReturnType<typeof listPromisePartyAlignments>[number] | null;
  partyAlignments: ReturnType<typeof listPromisePartyAlignments>;
};

type PoliticianTrustSummary = {
  politicianId: number;
  fulfillmentCounts: PromiseStatsSummary;
  fulfillmentPercentages: FulfillmentPercentagesSummary | null;
  voteAlignmentCounts: VoteAlignmentStatsSummary;
  voteAlignmentPercentages: VoteAlignmentPercentagesSummary | null;
  partyLineCounts: PartyLineStatsSummary;
  partyLinePercentages: PartyLinePercentagesSummary | null;
  promises: PoliticianPromiseTrustSummary[];
};

type PartyTrustMemberSummary = {
  politicianId: number;
  name: string;
  region: string | null;
  office: string | null;
  promiseCount: number;
  fulfillmentCounts: PromiseStatsSummary;
  voteAlignmentCounts: VoteAlignmentStatsSummary;
  partyLineCounts: PartyLineStatsSummary;
  lastUpdatedAt: string | null;
};

type PartyTrustSummary = {
  partyId: string;
  officialStanceCount: number;
  memberCount: number;
  promiseCount: number;
  fulfillmentCounts: PromiseStatsSummary;
  fulfillmentPercentages: FulfillmentPercentagesSummary | null;
  voteAlignmentCounts: VoteAlignmentStatsSummary;
  voteAlignmentPercentages: VoteAlignmentPercentagesSummary | null;
  partyLineCounts: PartyLineStatsSummary;
  partyLinePercentages: PartyLinePercentagesSummary | null;
  members: PartyTrustMemberSummary[];
};

type CanonicalPromiseTrustBase = {
  canonicalPromiseId: number;
  promiseText: string;
  statementId: number | null;
  datePromised: string;
  acceptedSourceCount: number;
};

const roundPercent = (count: number, total: number): number => {
  return total > 0 ? Math.round((count / total) * 100) : 0;
};

const buildPromiseStats = (promises: PoliticianPromiseTrustSummary[]): PromiseStatsSummary => {
  return promises.reduce<PromiseStatsSummary>(
    (stats, promise) => {
      stats.total += 1;
      if (promise.fulfillmentStatus === "fulfilled") {
        stats.fulfilled += 1;
      } else if (promise.fulfillmentStatus === "broken") {
        stats.broken += 1;
      } else if (promise.fulfillmentStatus === "in_progress") {
        stats.inProgress += 1;
      } else {
        stats.unknown += 1;
      }
      return stats;
    },
    {
      total: 0,
      fulfilled: 0,
      broken: 0,
      inProgress: 0,
      unknown: 0
    }
  );
};

const buildVoteAlignmentStats = (promises: PoliticianPromiseTrustSummary[]): VoteAlignmentStatsSummary => {
  return promises.reduce<VoteAlignmentStatsSummary>(
    (stats, promise) => {
      if (promise.voteAlignment === "aligned") {
        stats.aligned += 1;
      } else if (promise.voteAlignment === "contradicted") {
        stats.contradicted += 1;
      } else if (promise.voteAlignment === "mixed") {
        stats.mixed += 1;
      } else {
        stats.unknown += 1;
      }
      return stats;
    },
    {
      aligned: 0,
      contradicted: 0,
      mixed: 0,
      unknown: 0
    }
  );
};

const buildPartyLineStats = (promises: PoliticianPromiseTrustSummary[]): PartyLineStatsSummary => {
  return promises.reduce<PartyLineStatsSummary>(
    (stats, promise) => {
      if (promise.partyLineStatus === "aligned") {
        stats.aligned += 1;
      } else if (promise.partyLineStatus === "broke_party_line") {
        stats.brokePartyLine += 1;
      } else {
        stats.unknown += 1;
      }
      return stats;
    },
    {
      aligned: 0,
      brokePartyLine: 0,
      unknown: 0
    }
  );
};

const buildFulfillmentPercentages = (counts: PromiseStatsSummary): FulfillmentPercentagesSummary | null => {
  if (counts.total === 0) {
    return null;
  }
  return {
    fulfilled: roundPercent(counts.fulfilled, counts.total),
    broken: roundPercent(counts.broken, counts.total),
    inProgress: roundPercent(counts.inProgress, counts.total),
    unknown: roundPercent(counts.unknown, counts.total)
  };
};

const buildVoteAlignmentPercentages = (counts: VoteAlignmentStatsSummary): VoteAlignmentPercentagesSummary | null => {
  const total = counts.aligned + counts.contradicted + counts.mixed + counts.unknown;
  if (total === 0) {
    return null;
  }
  return {
    aligned: roundPercent(counts.aligned, total),
    contradicted: roundPercent(counts.contradicted, total),
    mixed: roundPercent(counts.mixed, total),
    unknown: roundPercent(counts.unknown, total)
  };
};

const buildPartyLinePercentages = (counts: PartyLineStatsSummary): PartyLinePercentagesSummary | null => {
  const total = counts.aligned + counts.brokePartyLine + counts.unknown;
  if (total === 0) {
    return null;
  }
  return {
    aligned: roundPercent(counts.aligned, total),
    brokePartyLine: roundPercent(counts.brokePartyLine, total),
    unknown: roundPercent(counts.unknown, total)
  };
};

const listCanonicalPromiseTrustBases = (politicianId: number, includeNonPublic: boolean): CanonicalPromiseTrustBase[] => {
  const visibilityClause = includeNonPublic ? "" : " AND cp.public_status = 'public'";
  return db
    .prepare(
      `SELECT cp.id AS canonicalPromiseId,
        cp.promise_text AS promiseText,
        cp.primary_statement_id AS statementId,
        COALESCE(st.date_said, cp.created_at) AS datePromised,
        (
          SELECT COUNT(*)
          FROM canonical_promise_sources cps
          WHERE cps.canonical_promise_id = cp.id
        ) AS acceptedSourceCount
       FROM canonical_promises cp
       LEFT JOIN statements st ON st.id = cp.primary_statement_id
       WHERE cp.deleted_at IS NULL AND cp.politician_id = ?${visibilityClause}
       ORDER BY COALESCE(st.date_said, cp.created_at) DESC, cp.id DESC`
    )
    .all(politicianId) as CanonicalPromiseTrustBase[];
};

const buildLatestEvidenceDate = ({
  datePromised,
  latestFulfillment,
  voteComparisons,
  partyAlignments
}: {
  datePromised: string;
  latestFulfillment: ReturnType<typeof getLatestPromiseFulfillmentAssessment> | null;
  voteComparisons: ReturnType<typeof listPromiseVoteComparisons>;
  partyAlignments: ReturnType<typeof listPromisePartyAlignments>;
}): string | null => {
  const candidates = [
    datePromised,
    latestFulfillment?.evidenceDate ?? null,
    voteComparisons[0]?.eventDate ?? null,
    partyAlignments[0]?.dateSaid ?? null
  ].filter(Boolean) as string[];
  if (candidates.length === 0) {
    return null;
  }
  return candidates.reduce((latest, current) => {
    return new Date(current).getTime() > new Date(latest).getTime() ? current : latest;
  });
};

const getCanonicalPromiseTrustContext = (canonicalPromiseId: number): CanonicalPromiseTrustContext => {
  const latestFulfillment = getLatestPromiseFulfillmentAssessment(canonicalPromiseId) ?? null;
  const voteComparisons = listPromiseVoteComparisons(canonicalPromiseId);
  const partyAlignments = listPromisePartyAlignments(canonicalPromiseId);
  return {
    latestFulfillment,
    voteAlignmentSummary: summarizePromiseVoteAlignment(voteComparisons),
    voteComparisons,
    latestPartyAlignment: partyAlignments[0] ?? null,
    partyAlignments
  };
};

const listPoliticianPromiseTrust = (politicianId: number, includeNonPublic: boolean): PoliticianPromiseTrustSummary[] => {
  return listCanonicalPromiseTrustBases(politicianId, includeNonPublic).map((base) => {
    const trustContext = getCanonicalPromiseTrustContext(base.canonicalPromiseId);
    return {
      canonicalPromiseId: base.canonicalPromiseId,
      statementId: base.statementId,
      promiseText: base.promiseText,
      datePromised: base.datePromised,
      acceptedSourceCount: Number(base.acceptedSourceCount ?? 0),
      fulfillmentStatus: trustContext.latestFulfillment?.status ?? "unknown",
      fulfillmentSummary: trustContext.latestFulfillment?.summary ?? "Data not yet available",
      voteAlignment: trustContext.voteAlignmentSummary,
      voteComparisonCount: trustContext.voteComparisons.length,
      partyLineStatus: trustContext.latestPartyAlignment?.status ?? "unknown",
      latestEvidenceDate: buildLatestEvidenceDate({
        datePromised: base.datePromised,
        latestFulfillment: trustContext.latestFulfillment,
        voteComparisons: trustContext.voteComparisons,
        partyAlignments: trustContext.partyAlignments
      })
    };
  });
};

const getPoliticianTrustSummary = (politicianId: number, includeNonPublic: boolean): PoliticianTrustSummary => {
  const promises = listPoliticianPromiseTrust(politicianId, includeNonPublic);
  const fulfillmentCounts = buildPromiseStats(promises);
  const voteAlignmentCounts = buildVoteAlignmentStats(promises);
  const partyLineCounts = buildPartyLineStats(promises);
  return {
    politicianId,
    promises,
    fulfillmentCounts,
    fulfillmentPercentages: buildFulfillmentPercentages(fulfillmentCounts),
    voteAlignmentCounts,
    voteAlignmentPercentages: buildVoteAlignmentPercentages(voteAlignmentCounts),
    partyLineCounts,
    partyLinePercentages: buildPartyLinePercentages(partyLineCounts)
  };
};

const countPartyStances = (partyId: string): number => {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM party_stances
       WHERE party_id = ?`
    )
    .get(partyId) as { total: number };
  return Number(row.total ?? 0);
};

const listCurrentPartyTrustMembers = (partyId: string, includeNonPublic: boolean): PartyTrustMemberSummary[] => {
  const rows = db
    .prepare(
      `SELECT pol.id AS politicianId,
        pol.name,
        pol.region,
        pol.office
       FROM party_memberships pm
       JOIN politicians pol ON pol.id = pm.politician_id
       WHERE pm.party_id = ? AND pm.end_date IS NULL AND pol.deleted_at IS NULL
       ORDER BY lower(pol.name), pol.id`
    )
    .all(partyId) as Array<{ politicianId: number; name: string; region: string | null; office: string | null }>;

  return rows
    .map((row) => {
      const trustSummary = getPoliticianTrustSummary(row.politicianId, includeNonPublic);
      const lastUpdatedAt = trustSummary.promises.reduce<string | null>((latest, promise) => {
        if (!promise.latestEvidenceDate) {
          return latest;
        }
        if (!latest) {
          return promise.latestEvidenceDate;
        }
        return new Date(promise.latestEvidenceDate).getTime() > new Date(latest).getTime() ? promise.latestEvidenceDate : latest;
      }, null);

      return {
        politicianId: row.politicianId,
        name: row.name,
        region: row.region,
        office: row.office,
        promiseCount: trustSummary.fulfillmentCounts.total,
        fulfillmentCounts: trustSummary.fulfillmentCounts,
        voteAlignmentCounts: trustSummary.voteAlignmentCounts,
        partyLineCounts: trustSummary.partyLineCounts,
        lastUpdatedAt
      };
    })
    .sort((left, right) => {
      if (right.promiseCount !== left.promiseCount) {
        return right.promiseCount - left.promiseCount;
      }
      return left.name.localeCompare(right.name);
    });
};

const getPartyTrustSummary = (partyId: string, includeNonPublic: boolean): PartyTrustSummary => {
  const members = listCurrentPartyTrustMembers(partyId, includeNonPublic);
  const promises = members.flatMap((member) => listPoliticianPromiseTrust(member.politicianId, includeNonPublic));
  const fulfillmentCounts = buildPromiseStats(promises);
  const voteAlignmentCounts = buildVoteAlignmentStats(promises);
  const partyLineCounts = buildPartyLineStats(promises);

  return {
    partyId,
    officialStanceCount: countPartyStances(partyId),
    memberCount: members.length,
    promiseCount: fulfillmentCounts.total,
    fulfillmentCounts,
    fulfillmentPercentages: buildFulfillmentPercentages(fulfillmentCounts),
    voteAlignmentCounts,
    voteAlignmentPercentages: buildVoteAlignmentPercentages(voteAlignmentCounts),
    partyLineCounts,
    partyLinePercentages: buildPartyLinePercentages(partyLineCounts),
    members
  };
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

type SearchItem = {
  kind: "politician" | "party" | "promise" | "topic";
  key: string;
  label: string;
  description: string;
  target: string;
};

const buildSearchItems = (query: string, includeNonPublic: boolean): SearchItem[] => {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) {
    return [];
  }

  const like = `%${normalized}%`;
  const politicians = db
    .prepare(
      `SELECT pol.id,
        pol.name,
        pol.region,
        pol.office,
        p.short_name AS partyShortName
       FROM politicians pol
       LEFT JOIN party_memberships pm ON pm.politician_id = pol.id AND pm.end_date IS NULL
       LEFT JOIN parties p ON p.id = pm.party_id AND p.deleted_at IS NULL
       WHERE pol.deleted_at IS NULL
         AND (
           lower(pol.name) LIKE ?
           OR lower(COALESCE(pol.region, '')) LIKE ?
           OR lower(COALESCE(pol.office, '')) LIKE ?
           OR lower(COALESCE(p.name, '')) LIKE ?
           OR lower(COALESCE(p.short_name, '')) LIKE ?
         )
       ORDER BY lower(pol.name), pol.id
       LIMIT 5`
    )
    .all(like, like, like, like, like) as Array<{
    id: number;
    name: string;
    region: string | null;
    office: string | null;
    partyShortName: string | null;
  }>;

  const parties = db
    .prepare(
      `SELECT DISTINCT p.id,
        p.name,
        p.short_name AS shortName
       FROM parties p
       LEFT JOIN party_aliases pa ON pa.party_id = p.id
       WHERE p.deleted_at IS NULL
         AND (
           lower(p.name) LIKE ?
           OR lower(p.short_name) LIKE ?
           OR lower(COALESCE(pa.alias, '')) LIKE ?
         )
       ORDER BY lower(p.short_name), lower(p.name)
       LIMIT 5`
    )
    .all(like, like, like) as Array<{ id: string; name: string; shortName: string }>;

  const promiseVisibilityClause = includeNonPublic ? "" : " AND cp.public_status = 'public'";
  const promises = db
    .prepare(
      `SELECT cp.id,
        cp.promise_text AS promiseText,
        cp.primary_statement_id AS statementId,
        cp.politician_id AS politicianId,
        pol.name AS politicianName
       FROM canonical_promises cp
       JOIN politicians pol ON pol.id = cp.politician_id
       WHERE cp.deleted_at IS NULL${promiseVisibilityClause}
         AND lower(cp.promise_text) LIKE ?
       ORDER BY cp.created_at DESC, cp.id DESC
       LIMIT 5`
    )
    .all(like) as Array<{
    id: number;
    promiseText: string;
    statementId: number | null;
    politicianId: number;
    politicianName: string;
  }>;

  const topics = db
    .prepare(
      `SELECT DISTINCT issue
       FROM (
         SELECT issue FROM party_stances
         UNION
         SELECT issue FROM vote_events
       )
       WHERE issue IS NOT NULL AND lower(issue) LIKE ?
       ORDER BY lower(issue)
       LIMIT 5`
    )
    .all(like) as Array<{ issue: string }>;

  return [
    ...politicians.map((row) => ({
      kind: "politician" as const,
      key: `politician-${row.id}`,
      label: row.name,
      description: `${row.office ?? "Office not provided"} · ${row.region ?? "Region not provided"}${row.partyShortName ? ` · ${row.partyShortName}` : ""}`,
      target: `/politicians/${row.id}`
    })),
    ...parties.map((row) => ({
      kind: "party" as const,
      key: `party-${row.id}`,
      label: row.name,
      description: `${row.shortName} party page`,
      target: `/parties/${row.id}`
    })),
    ...promises.map((row) => ({
      kind: "promise" as const,
      key: `promise-${row.id}`,
      label: row.promiseText,
      description: `${row.politicianName} · canonical promise`,
      target: row.statementId ? `/promises/${row.statementId}` : `/politicians/${row.politicianId}?tab=promises`
    })),
    ...topics.map((row) => ({
      kind: "topic" as const,
      key: `topic-${row.issue.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      label: row.issue,
      description: "Topic or issue search",
      target: `/politicians?q=${encodeURIComponent(row.issue)}`
    }))
  ];
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

app.post("/canonical-promises", requireRole("moderator"), (req, res) => {
  const { politicianId, promiseText, publicStatus, primaryStatementId, acceptedSources } = req.body as {
    politicianId?: number;
    promiseText?: string;
    publicStatus?: string;
    primaryStatementId?: number;
    acceptedSources?: Array<{ sourceUrl?: string; sourceNote?: string; statementId?: number }>;
  };

  if (!Number.isInteger(politicianId) || (politicianId ?? 0) <= 0) {
    res.status(400).json({ error: "politicianId must be a positive integer" });
    return;
  }
  const normalizedPromiseText = promiseText?.trim() ?? "";
  if (!normalizedPromiseText) {
    res.status(400).json({ error: "promiseText is required" });
    return;
  }
  const normalizedPublicStatus = (publicStatus?.trim().toLowerCase() ?? "draft");
  if (!isCanonicalPublicStatus(normalizedPublicStatus)) {
    res.status(400).json({ error: "publicStatus must be draft or public" });
    return;
  }

  const politician = db.prepare("SELECT 1 FROM politicians WHERE id = ? AND deleted_at IS NULL LIMIT 1").get(politicianId) as { "1"?: number } | undefined;
  if (!politician) {
    res.status(404).json({ error: "politician not found" });
    return;
  }

  const primaryStatement =
    primaryStatementId !== undefined
      ? (db
          .prepare(
            "SELECT id, politician_id AS politicianId, source_url AS sourceUrl FROM statements WHERE id = ? AND deleted_at IS NULL LIMIT 1"
          )
          .get(primaryStatementId) as { id: number; politicianId: number; sourceUrl: string } | undefined)
      : undefined;
  if (primaryStatementId !== undefined && !primaryStatement) {
    res.status(404).json({ error: "primary statement not found" });
    return;
  }
  if (primaryStatement && primaryStatement.politicianId !== politicianId) {
    res.status(409).json({ error: "primary statement politician does not match canonical promise politician" });
    return;
  }

  const normalizedSources = (acceptedSources ?? []).map((source) => ({
    sourceUrl: source.sourceUrl?.trim() ?? "",
    sourceNote: normalizeOptionalText(source.sourceNote),
    statementId: source.statementId
  }));

  if (normalizedSources.some((source) => !source.sourceUrl)) {
    res.status(400).json({ error: "accepted source urls are required" });
    return;
  }

  if (!primaryStatement && normalizedSources.length === 0) {
    res.status(400).json({ error: "acceptedSources or primaryStatementId is required" });
    return;
  }

  try {
    const tx = db.transaction(() => {
      const insertPromise = db
        .prepare(
          `INSERT INTO canonical_promises (politician_id, promise_text, public_status, primary_statement_id, created_by)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(politicianId, normalizedPromiseText, normalizedPublicStatus, primaryStatement?.id ?? null, req.auth.userId ?? "moderation");

      const canonicalPromiseId = insertPromise.lastInsertRowid as number;
      const insertSource = db.prepare(
        `INSERT INTO canonical_promise_sources (canonical_promise_id, statement_id, source_url, source_note, accepted_by, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`
      );

      const sourceRows = [...normalizedSources];
      if (primaryStatement && !sourceRows.some((source) => source.sourceUrl === primaryStatement.sourceUrl)) {
        sourceRows.unshift({
          sourceUrl: primaryStatement.sourceUrl,
          sourceNote: "primary statement source",
          statementId: primaryStatement.id
        });
      }

      for (const source of sourceRows) {
        insertSource.run(
          canonicalPromiseId,
          source.statementId ?? null,
          source.sourceUrl,
          source.sourceNote,
          req.auth.userId ?? "moderation"
        );
      }

      return canonicalPromiseId;
    });

    const canonicalPromiseId = tx();
    res.status(201).json({ id: canonicalPromiseId });
  } catch (err) {
    const code = (err as { code?: string }).code;
    const isUniqueness = code === "SQLITE_CONSTRAINT_UNIQUE" || String((err as Error).message).includes("UNIQUE constraint");
    res.status(isUniqueness ? 409 : 500).json({
      error: isUniqueness ? "canonical promise already exists for this primary statement or source url" : "internal server error"
    });
  }
});

app.get("/canonical-promises", (req, res) => {
  const politicianIdRaw = req.query.politicianId as string | undefined;
  const politicianId = politicianIdRaw ? Number(politicianIdRaw) : undefined;
  if (politicianIdRaw !== undefined && (!Number.isInteger(politicianId) || (politicianId ?? 0) <= 0)) {
    res.status(400).json({ error: "politicianId must be a positive integer" });
    return;
  }

  const includeNonPublic = req.auth.role === "moderator" || req.auth.role === "admin";
  res.json({
    items: listCanonicalPromises({
      politicianId,
      includeNonPublic
    })
  });
});

app.get("/canonical-promises/:id", (req, res) => {
  const canonicalPromiseId = Number(req.params.id);
  if (!Number.isInteger(canonicalPromiseId) || canonicalPromiseId <= 0) {
    res.status(400).json({ error: "invalid canonical promise id" });
    return;
  }

  const includeNonPublic = req.auth.role === "moderator" || req.auth.role === "admin";
  const promise = getCanonicalPromiseById(canonicalPromiseId, includeNonPublic);
  if (!promise) {
    res.status(404).json({ error: "canonical promise not found" });
    return;
  }

  res.json({
    promise,
    acceptedSources: listCanonicalPromiseSources(canonicalPromiseId),
    history: listCanonicalHistory(canonicalPromiseId),
    trustContext: getCanonicalPromiseTrustContext(canonicalPromiseId)
  });
});

app.get("/canonical-promises/:id/vote-links", (req, res) => {
  const canonicalPromiseId = Number(req.params.id);
  if (!Number.isInteger(canonicalPromiseId) || canonicalPromiseId <= 0) {
    res.status(400).json({ error: "invalid canonical promise id" });
    return;
  }

  const includeNonPublic = req.auth.role === "moderator" || req.auth.role === "admin";
  const promise = getCanonicalPromiseById(canonicalPromiseId, includeNonPublic);
  if (!promise) {
    res.status(404).json({ error: "canonical promise not found" });
    return;
  }

  const items = listPromiseVoteComparisons(canonicalPromiseId);
  res.json({
    summary: summarizePromiseVoteAlignment(items),
    items
  });
});

app.post("/canonical-promises/:id/vote-links", requireRole("moderator"), (req, res) => {
  const canonicalPromiseId = Number(req.params.id);
  const { voteEventId, alignedVoteValue, comparisonNote } = req.body as {
    voteEventId?: number;
    alignedVoteValue?: string;
    comparisonNote?: string;
  };

  if (!Number.isInteger(canonicalPromiseId) || canonicalPromiseId <= 0) {
    res.status(400).json({ error: "invalid canonical promise id" });
    return;
  }
  if (!Number.isInteger(voteEventId) || (voteEventId ?? 0) <= 0) {
    res.status(400).json({ error: "voteEventId must be a positive integer" });
    return;
  }
  const normalizedAlignedVoteValue = alignedVoteValue?.trim().toLowerCase() ?? "";
  if (!isAlignedVoteValue(normalizedAlignedVoteValue)) {
    res.status(400).json({ error: "alignedVoteValue must be for, against, or abstain" });
    return;
  }
  if (!getCanonicalPromiseById(canonicalPromiseId, true)) {
    res.status(404).json({ error: "canonical promise not found" });
    return;
  }
  if (!getVoteEventById(voteEventId)) {
    res.status(404).json({ error: "vote event not found" });
    return;
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO canonical_promise_vote_links
         (canonical_promise_id, vote_event_id, aligned_vote_value, comparison_note, created_by, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(
        canonicalPromiseId,
        voteEventId,
        normalizedAlignedVoteValue,
        normalizeOptionalText(comparisonNote),
        req.auth.userId ?? "moderation"
      );
    res.status(201).json({ id: result.lastInsertRowid as number, canonicalPromiseId, voteEventId });
  } catch (err) {
    const code = (err as { code?: string }).code;
    const isUniqueness = code === "SQLITE_CONSTRAINT_UNIQUE" || String((err as Error).message).includes("UNIQUE constraint");
    res.status(isUniqueness ? 409 : 500).json({
      error: isUniqueness ? "vote link already exists for this canonical promise" : "internal server error"
    });
  }
});

app.get("/canonical-promises/:id/fulfillment-assessments", (req, res) => {
  const canonicalPromiseId = Number(req.params.id);
  if (!Number.isInteger(canonicalPromiseId) || canonicalPromiseId <= 0) {
    res.status(400).json({ error: "invalid canonical promise id" });
    return;
  }

  const includeNonPublic = req.auth.role === "moderator" || req.auth.role === "admin";
  if (!getCanonicalPromiseById(canonicalPromiseId, includeNonPublic)) {
    res.status(404).json({ error: "canonical promise not found" });
    return;
  }

  res.json({
    latest: getLatestPromiseFulfillmentAssessment(canonicalPromiseId) ?? null,
    items: listPromiseFulfillmentAssessments(canonicalPromiseId)
  });
});

app.post("/canonical-promises/:id/fulfillment-assessments", requireRole("moderator"), (req, res) => {
  const canonicalPromiseId = Number(req.params.id);
  const { status, summary, sourceUrl, sourceNote, evidenceDate } = req.body as {
    status?: string;
    summary?: string;
    sourceUrl?: string;
    sourceNote?: string;
    evidenceDate?: string;
  };

  if (!Number.isInteger(canonicalPromiseId) || canonicalPromiseId <= 0) {
    res.status(400).json({ error: "invalid canonical promise id" });
    return;
  }
  const normalizedStatus = status?.trim().toLowerCase() ?? "";
  const normalizedSummary = summary?.trim() ?? "";
  const normalizedSourceUrl = sourceUrl?.trim() ?? "";
  const normalizedEvidenceDate = normalizeOptionalDate(evidenceDate);

  if (!isFulfillmentStatus(normalizedStatus)) {
    res.status(400).json({ error: "status must be fulfilled, broken, in_progress, or unknown" });
    return;
  }
  if (!normalizedSummary || !normalizedSourceUrl || !normalizedEvidenceDate) {
    res.status(400).json({ error: "summary, sourceUrl, and evidenceDate are required" });
    return;
  }
  if (normalizedEvidenceDate === INVALID_DATE_TOKEN) {
    res.status(400).json({ error: "evidenceDate must use YYYY-MM-DD format" });
    return;
  }
  if (!getCanonicalPromiseById(canonicalPromiseId, true)) {
    res.status(404).json({ error: "canonical promise not found" });
    return;
  }

  const result = db
    .prepare(
      `INSERT INTO promise_fulfillment_assessments
       (canonical_promise_id, status, summary, source_url, source_note, evidence_date, created_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(
      canonicalPromiseId,
      normalizedStatus,
      normalizedSummary,
      normalizedSourceUrl,
      normalizeOptionalText(sourceNote),
      normalizedEvidenceDate,
      req.auth.userId ?? "moderation"
    );
  res.status(201).json({ id: result.lastInsertRowid as number, canonicalPromiseId });
});

app.get("/canonical-promises/:id/party-alignments", (req, res) => {
  const canonicalPromiseId = Number(req.params.id);
  if (!Number.isInteger(canonicalPromiseId) || canonicalPromiseId <= 0) {
    res.status(400).json({ error: "invalid canonical promise id" });
    return;
  }

  const includeNonPublic = req.auth.role === "moderator" || req.auth.role === "admin";
  if (!getCanonicalPromiseById(canonicalPromiseId, includeNonPublic)) {
    res.status(404).json({ error: "canonical promise not found" });
    return;
  }

  res.json({ items: listPromisePartyAlignments(canonicalPromiseId) });
});

app.post("/canonical-promises/:id/party-alignments", requireRole("moderator"), (req, res) => {
  const canonicalPromiseId = Number(req.params.id);
  const { partyStanceId, status, reason } = req.body as {
    partyStanceId?: number;
    status?: string;
    reason?: string;
  };

  if (!Number.isInteger(canonicalPromiseId) || canonicalPromiseId <= 0) {
    res.status(400).json({ error: "invalid canonical promise id" });
    return;
  }
  if (!Number.isInteger(partyStanceId) || (partyStanceId ?? 0) <= 0) {
    res.status(400).json({ error: "partyStanceId must be a positive integer" });
    return;
  }
  const normalizedStatus = status?.trim().toLowerCase() ?? "";
  if (!isPartyAlignmentStatus(normalizedStatus)) {
    res.status(400).json({ error: "status must be aligned or broke_party_line" });
    return;
  }

  const promise = getCanonicalPromiseById(canonicalPromiseId, true);
  if (!promise) {
    res.status(404).json({ error: "canonical promise not found" });
    return;
  }
  const partyStance = getPartyStanceById(partyStanceId);
  if (!partyStance) {
    res.status(404).json({ error: "party stance not found" });
    return;
  }
  if (!politicianHasPartyMembership(promise.politicianId, partyStance.partyId)) {
    res.status(409).json({ error: "politician is not linked to the party for this stance" });
    return;
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO party_alignment_assessments
         (canonical_promise_id, party_stance_id, status, reason, created_by, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(
        canonicalPromiseId,
        partyStanceId,
        normalizedStatus,
        normalizeOptionalText(reason),
        req.auth.userId ?? "moderation"
      );
    res.status(201).json({ id: result.lastInsertRowid as number, canonicalPromiseId, partyStanceId });
  } catch (err) {
    const code = (err as { code?: string }).code;
    const isUniqueness = code === "SQLITE_CONSTRAINT_UNIQUE" || String((err as Error).message).includes("UNIQUE constraint");
    res.status(isUniqueness ? 409 : 500).json({
      error: isUniqueness ? "party alignment already exists for this stance" : "internal server error"
    });
  }
});

app.post("/promise-claims", requireRole("user"), (req, res) => {
  const { politicianId, claimText, sourceUrl, dateSaid, sourceNote } = req.body as {
    politicianId?: number;
    claimText?: string;
    sourceUrl?: string;
    dateSaid?: string;
    sourceNote?: string;
  };

  if (!Number.isInteger(politicianId) || (politicianId ?? 0) <= 0) {
    res.status(400).json({ error: "politicianId must be a positive integer" });
    return;
  }
  const normalizedClaimText = claimText?.trim() ?? "";
  const normalizedSourceUrl = sourceUrl?.trim() ?? "";
  const normalizedDateSaid = normalizeOptionalDate(dateSaid);
  if (!normalizedClaimText || !normalizedSourceUrl || !normalizedDateSaid || normalizedDateSaid === INVALID_DATE_TOKEN) {
    res.status(400).json({ error: "politicianId, claimText, sourceUrl, and dateSaid are required" });
    return;
  }

  const politician = db.prepare("SELECT 1 FROM politicians WHERE id = ? AND deleted_at IS NULL LIMIT 1").get(politicianId) as { "1"?: number } | undefined;
  if (!politician) {
    res.status(404).json({ error: "politician not found" });
    return;
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO promise_claims (submitted_by, politician_id, claim_text, source_url, date_said, source_note, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`
      )
      .run(req.auth.userId ?? "unknown", politicianId, normalizedClaimText, normalizedSourceUrl, normalizedDateSaid, normalizeOptionalText(sourceNote));
    const claimId = result.lastInsertRowid as number;
    db.prepare(
      `INSERT INTO promise_claim_audits (claim_id, actor_id, action, from_status, to_status, reason)
       VALUES (?, ?, 'submitted', NULL, 'pending', NULL)`
    ).run(claimId, req.auth.userId ?? "unknown");
    res.status(201).json({ id: claimId, status: "pending" });
  } catch (err) {
    const code = (err as { code?: string }).code;
    const isUniqueness = code === "SQLITE_CONSTRAINT_UNIQUE" || String((err as Error).message).includes("UNIQUE constraint");
    res.status(isUniqueness ? 409 : 500).json({
      error: isUniqueness ? "duplicate pending claim" : "internal server error"
    });
  }
});

app.post("/promise-claims/duplicate-assist-preview", requireRole("user"), (req, res) => {
  const { politicianId, claimText, sourceUrl } = req.body as { politicianId?: number; claimText?: string; sourceUrl?: string };
  if (!Number.isInteger(politicianId) || (politicianId ?? 0) <= 0) {
    res.status(400).json({ error: "politicianId must be a positive integer" });
    return;
  }
  const normalizedClaimText = claimText?.trim() ?? "";
  const normalizedSourceUrl = sourceUrl?.trim() ?? "";
  if (!normalizedClaimText || !normalizedSourceUrl) {
    res.status(400).json({ error: "claimText and sourceUrl are required" });
    return;
  }

  res.json(
    buildPromiseClaimDuplicateAssist({
      politicianId,
      claimText: normalizedClaimText,
      sourceUrl: normalizedSourceUrl
    })
  );
});

app.get("/promise-claims", requireRole("user"), (req, res) => {
  const includeAll = req.auth.role === "moderator" || req.auth.role === "admin";
  const statusRaw = (req.query.status as string | undefined)?.trim().toLowerCase();
  const status = statusRaw && statusRaw !== "all" ? statusRaw : undefined;
  if (status && !isPromiseClaimStatus(status)) {
    res.status(400).json({ error: "invalid status filter" });
    return;
  }

  const assignee = includeAll ? (req.query.assignee as string | undefined)?.trim() : undefined;
  const page = parsePageValue(req.query.page as string | undefined, 1, 10_000);
  const pageSize = parsePageValue(req.query.pageSize as string | undefined, 20, 100);
  const result = listPromiseClaims({
    submitterId: req.auth.userId ?? "unknown",
    includeAll,
    status: status as typeof claimStatuses[number] | undefined,
    assignee,
    page,
    pageSize
  });

  res.json({
    items: result.items,
    page,
    pageSize,
    total: result.total
  });
});

app.get("/promise-claims/:id", requireRole("user"), (req, res) => {
  const claimId = Number(req.params.id);
  if (!Number.isInteger(claimId) || claimId <= 0) {
    res.status(400).json({ error: "invalid claim id" });
    return;
  }

  const claim = getPromiseClaimById(claimId);
  if (!claim) {
    res.status(404).json({ error: "promise claim not found" });
    return;
  }

  const includeAll = req.auth.role === "moderator" || req.auth.role === "admin";
  if (!includeAll && claim.submittedBy !== req.auth.userId) {
    res.status(403).json({ error: "forbidden", message: "claim detail is limited to submitter or moderator" });
    return;
  }

  res.json({ claim });
});

app.get("/promise-claims/:id/duplicate-assist", requireRole("user"), (req, res) => {
  const claimId = Number(req.params.id);
  if (!Number.isInteger(claimId) || claimId <= 0) {
    res.status(400).json({ error: "invalid claim id" });
    return;
  }

  const claim = getPromiseClaimById(claimId);
  if (!claim) {
    res.status(404).json({ error: "promise claim not found" });
    return;
  }

  const includeAll = req.auth.role === "moderator" || req.auth.role === "admin";
  if (!includeAll && claim.submittedBy !== req.auth.userId) {
    res.status(403).json({ error: "forbidden", message: "claim detail is limited to submitter or moderator" });
    return;
  }

  res.json(
    buildPromiseClaimDuplicateAssist({
      claimId,
      politicianId: claim.politicianId,
      claimText: claim.claimText,
      sourceUrl: claim.sourceUrl
    })
  );
});

app.post("/promise-claims/:id/equivalence-signals", requireRole("user"), (req, res) => {
  const claimId = Number(req.params.id);
  const { targetKind, targetId, relation, reasonCode } = req.body as {
    targetKind?: string;
    targetId?: number;
    relation?: string;
    reasonCode?: string;
  };
  if (!Number.isInteger(claimId) || claimId <= 0) {
    res.status(400).json({ error: "invalid claim id" });
    return;
  }
  if (targetKind !== "canonical_promise" && targetKind !== "claim") {
    res.status(400).json({ error: "targetKind must be canonical_promise or claim" });
    return;
  }
  if (!Number.isInteger(targetId) || (targetId ?? 0) <= 0) {
    res.status(400).json({ error: "targetId must be a positive integer" });
    return;
  }
  if (relation !== "same_as" && relation !== "non_match") {
    res.status(400).json({ error: "relation must be same_as or non_match" });
    return;
  }
  if (!reasonCode || !isPromiseClaimSignalReasonCode(reasonCode)) {
    res.status(400).json({ error: "invalid equivalence reasonCode" });
    return;
  }

  const claim = getPromiseClaimById(claimId);
  if (!claim) {
    res.status(404).json({ error: "promise claim not found" });
    return;
  }
  if (claim.status !== "pending") {
    res.status(409).json({ error: "promise claim is not pending" });
    return;
  }
  if (targetKind === "canonical_promise") {
    const canonicalPromise = getCanonicalPromiseById(targetId, true);
    if (!canonicalPromise) {
      res.status(404).json({ error: "canonical promise not found" });
      return;
    }
  } else {
    const targetClaim = getPromiseClaimById(targetId);
    if (!targetClaim) {
      res.status(404).json({ error: "target claim not found" });
      return;
    }
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO claim_equivalence_signals (claim_id, actor_id, target_kind, target_id, relation, reason_code, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(claim_id, actor_id, target_kind, target_id)
         DO UPDATE SET relation = excluded.relation, reason_code = excluded.reason_code, updated_at = datetime('now')`
      )
      .run(claimId, req.auth.userId ?? "unknown", targetKind, targetId, relation, reasonCode);
    res.status(201).json({ ok: true, id: Number(result.lastInsertRowid || 0) });
  } catch {
    res.status(500).json({ error: "internal server error" });
  }
});

app.get("/promise-claims/:id/equivalence-signals", requireRole("user"), (req, res) => {
  const claimId = Number(req.params.id);
  if (!Number.isInteger(claimId) || claimId <= 0) {
    res.status(400).json({ error: "invalid claim id" });
    return;
  }
  const claim = getPromiseClaimById(claimId);
  if (!claim) {
    res.status(404).json({ error: "promise claim not found" });
    return;
  }

  const includeAll = req.auth.role === "moderator" || req.auth.role === "admin";
  if (!includeAll && claim.submittedBy !== req.auth.userId) {
    res.status(403).json({ error: "forbidden", message: "claim detail is limited to submitter or moderator" });
    return;
  }

  res.json({ items: listClaimEquivalenceSignals(claimId) });
});

app.post("/promise-claims/:id/claim", requireRole("moderator"), (req, res) => {
  const claimId = Number(req.params.id);
  const expectedVersion = (req.body as { expectedVersion?: number }).expectedVersion;
  if (!Number.isInteger(claimId) || claimId <= 0) {
    res.status(400).json({ error: "invalid claim id" });
    return;
  }
  if (expectedVersion !== undefined && (!Number.isInteger(expectedVersion) || expectedVersion < 0)) {
    res.status(400).json({ error: "expectedVersion must be a non-negative integer" });
    return;
  }

  const actorId = req.auth.userId ?? "moderation";
  try {
    const tx = db.transaction(() => {
      const claim = db
        .prepare("SELECT status, assignee_id AS assigneeId, review_version AS reviewVersion FROM promise_claims WHERE id = ?")
        .get(claimId) as { status: typeof claimStatuses[number]; assigneeId: string | null; reviewVersion: number } | undefined;
      if (!claim) {
        throw { status: 404, error: "promise claim not found" };
      }
      if (claim.status !== "pending") {
        throw { status: 409, error: "promise claim is not pending" };
      }
      if (expectedVersion !== undefined && expectedVersion !== claim.reviewVersion) {
        throw { status: 409, error: "promise claim version conflict" };
      }
      if (claim.assigneeId && claim.assigneeId !== actorId) {
        throw { status: 409, error: "promise claim already claimed by another moderator" };
      }
      if (claim.assigneeId === actorId) {
        return { assigneeId: actorId, reviewVersion: claim.reviewVersion };
      }

      const write = db
        .prepare(
          "UPDATE promise_claims SET assignee_id = ?, assigned_at = datetime('now'), updated_at = datetime('now'), review_version = review_version + 1 WHERE id = ? AND status = 'pending' AND review_version = ?"
        )
        .run(actorId, claimId, claim.reviewVersion);
      if (write.changes === 0) {
        throw { status: 409, error: "promise claim version conflict" };
      }
      db.prepare(
        "INSERT INTO promise_claim_audits (claim_id, actor_id, action, from_status, to_status, reason) VALUES (?, ?, 'claimed', 'pending', 'pending', NULL)"
      ).run(claimId, actorId);
      return { assigneeId: actorId, reviewVersion: claim.reviewVersion + 1 };
    });
    res.json({ ok: true, ...tx() });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err && "error" in err) {
      res.status((err as { status: number }).status).json({ error: (err as { error: string }).error });
      return;
    }
    res.status(500).json({ error: "internal server error" });
  }
});

app.post("/promise-claims/:id/release", requireRole("moderator"), (req, res) => {
  const claimId = Number(req.params.id);
  const expectedVersion = (req.body as { expectedVersion?: number }).expectedVersion;
  if (!Number.isInteger(claimId) || claimId <= 0) {
    res.status(400).json({ error: "invalid claim id" });
    return;
  }
  if (expectedVersion !== undefined && (!Number.isInteger(expectedVersion) || expectedVersion < 0)) {
    res.status(400).json({ error: "expectedVersion must be a non-negative integer" });
    return;
  }

  const actorId = req.auth.userId ?? "moderation";
  const isAdmin = req.auth.role === "admin";
  try {
    const tx = db.transaction(() => {
      const claim = db
        .prepare("SELECT status, assignee_id AS assigneeId, review_version AS reviewVersion FROM promise_claims WHERE id = ?")
        .get(claimId) as { status: typeof claimStatuses[number]; assigneeId: string | null; reviewVersion: number } | undefined;
      if (!claim) {
        throw { status: 404, error: "promise claim not found" };
      }
      if (claim.status !== "pending") {
        throw { status: 409, error: "promise claim is not pending" };
      }
      if (!claim.assigneeId) {
        throw { status: 409, error: "promise claim is not claimed" };
      }
      if (!isAdmin && claim.assigneeId !== actorId) {
        throw { status: 403, error: "only assignee or admin can release this claim" };
      }
      if (expectedVersion !== undefined && expectedVersion !== claim.reviewVersion) {
        throw { status: 409, error: "promise claim version conflict" };
      }

      const write = db
        .prepare(
          "UPDATE promise_claims SET assignee_id = NULL, assigned_at = NULL, updated_at = datetime('now'), review_version = review_version + 1 WHERE id = ? AND status = 'pending' AND review_version = ?"
        )
        .run(claimId, claim.reviewVersion);
      if (write.changes === 0) {
        throw { status: 409, error: "promise claim version conflict" };
      }
      db.prepare(
        "INSERT INTO promise_claim_audits (claim_id, actor_id, action, from_status, to_status, reason) VALUES (?, ?, 'released', 'pending', 'pending', NULL)"
      ).run(claimId, actorId);
      return { reviewVersion: claim.reviewVersion + 1 };
    });
    res.json({ ok: true, ...tx() });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err && "error" in err) {
      res.status((err as { status: number }).status).json({ error: (err as { error: string }).error });
      return;
    }
    res.status(500).json({ error: "internal server error" });
  }
});

app.patch("/promise-claims/:id/review", requireRole("moderator"), (req, res) => {
  const claimId = Number(req.params.id);
  const { decision, reason, reasonCode, linkedCanonicalPromiseId, publicStatus, expectedVersion } = req.body as {
    decision?: string;
    reason?: string;
    reasonCode?: string;
    linkedCanonicalPromiseId?: number;
    publicStatus?: string;
    expectedVersion?: number;
  };
  if (!Number.isInteger(claimId) || claimId <= 0) {
    res.status(400).json({ error: "invalid claim id" });
    return;
  }
  if (decision !== "merge" && decision !== "canonize" && decision !== "reject") {
    res.status(400).json({ error: "decision must be merge, canonize, or reject" });
    return;
  }
  if (expectedVersion !== undefined && (!Number.isInteger(expectedVersion) || expectedVersion < 0)) {
    res.status(400).json({ error: "expectedVersion must be a non-negative integer" });
    return;
  }
  if (decision === "reject" && (!reasonCode || !isPromiseClaimRejectReasonCode(reasonCode))) {
    res.status(400).json({ error: "invalid reasonCode for reject decision" });
    return;
  }
  if ((decision === "merge" || decision === "canonize") && reasonCode && !isPromiseClaimSignalReasonCode(reasonCode)) {
    res.status(400).json({ error: "invalid reasonCode for merge or canonize decision" });
    return;
  }

  const actorId = req.auth.userId ?? "moderation";
  const isAdmin = req.auth.role === "admin";
  const normalizedPublicStatus = isCanonicalPublicStatus(publicStatus?.trim().toLowerCase() ?? "public")
    ? (publicStatus?.trim().toLowerCase() ?? "public")
    : undefined;
  if (decision === "canonize" && !normalizedPublicStatus) {
    res.status(400).json({ error: "publicStatus must be draft or public for canonize decision" });
    return;
  }

  try {
    const tx = db.transaction(() => {
      const claim = db
        .prepare(
          `SELECT id, politician_id AS politicianId, claim_text AS claimText, source_url AS sourceUrl, source_note AS sourceNote,
            status, assignee_id AS assigneeId, review_version AS reviewVersion
           FROM promise_claims WHERE id = ?`
        )
        .get(claimId) as
        | {
            id: number;
            politicianId: number;
            claimText: string;
            sourceUrl: string;
            sourceNote: string | null;
            status: typeof claimStatuses[number];
            assigneeId: string | null;
            reviewVersion: number;
          }
        | undefined;
      if (!claim) {
        throw { status: 404, error: "promise claim not found" };
      }
      if (claim.status !== "pending") {
        throw { status: 409, error: "promise claim is not pending" };
      }
      if (claim.assigneeId && claim.assigneeId !== actorId && !isAdmin) {
        throw { status: 409, error: "promise claim is claimed by another moderator" };
      }
      if (expectedVersion !== undefined && expectedVersion !== claim.reviewVersion) {
        throw { status: 409, error: "promise claim version conflict" };
      }

      let targetCanonicalPromiseId: number | null = null;
      let nextStatus: "merged" | "canonized" | "rejected";
      if (decision === "merge") {
        if (!Number.isInteger(linkedCanonicalPromiseId) || (linkedCanonicalPromiseId ?? 0) <= 0) {
          throw { status: 400, error: "linkedCanonicalPromiseId is required for merge decision" };
        }
        const canonicalPromise = getCanonicalPromiseById(linkedCanonicalPromiseId, true);
        if (!canonicalPromise) {
          throw { status: 404, error: "canonical promise not found" };
        }
        targetCanonicalPromiseId = linkedCanonicalPromiseId;
        nextStatus = "merged";
      } else if (decision === "canonize") {
        const createPromise = db
          .prepare(
            `INSERT INTO canonical_promises (politician_id, promise_text, public_status, primary_statement_id, created_by)
             VALUES (?, ?, ?, NULL, ?)`
          )
          .run(claim.politicianId, claim.claimText, normalizedPublicStatus ?? "public", actorId);
        targetCanonicalPromiseId = createPromise.lastInsertRowid as number;
        nextStatus = "canonized";
      } else {
        nextStatus = "rejected";
      }

      if (targetCanonicalPromiseId) {
        db.prepare(
          `INSERT OR IGNORE INTO canonical_promise_sources
           (canonical_promise_id, statement_id, source_url, source_note, accepted_by, updated_at)
           VALUES (?, NULL, ?, ?, ?, datetime('now'))`
        ).run(targetCanonicalPromiseId, claim.sourceUrl, claim.sourceNote, actorId);
      }

      const write = db
        .prepare(
          `UPDATE promise_claims
           SET status = ?, decision_by = ?, decision_reason = ?, decision_code = ?, linked_canonical_promise_id = ?,
             assignee_id = COALESCE(assignee_id, ?), assigned_at = COALESCE(assigned_at, datetime('now')),
             updated_at = datetime('now'), decided_at = datetime('now'), review_version = review_version + 1
           WHERE id = ? AND status = 'pending' AND review_version = ?`
        )
        .run(nextStatus, actorId, normalizeOptionalText(reason), reasonCode ?? null, targetCanonicalPromiseId, actorId, claimId, claim.reviewVersion);
      if (write.changes === 0) {
        throw { status: 409, error: "promise claim version conflict" };
      }

      db.prepare(
        `INSERT INTO promise_claim_audits
         (claim_id, actor_id, action, from_status, to_status, reason, reason_code, linked_canonical_promise_id)
         VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)`
      ).run(claimId, actorId, nextStatus, nextStatus, normalizeOptionalText(reason), reasonCode ?? null, targetCanonicalPromiseId);

      return { status: nextStatus, canonicalPromiseId: targetCanonicalPromiseId, reviewVersion: claim.reviewVersion + 1 };
    });
    res.json({ ok: true, ...tx() });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err && "error" in err) {
      res.status((err as { status: number }).status).json({ error: (err as { error: string }).error });
      return;
    }
    res.status(500).json({ error: "internal server error" });
  }
});

app.get("/promise-claims/:id/audits", requireRole("moderator"), (req, res) => {
  const claimId = Number(req.params.id);
  if (!Number.isInteger(claimId) || claimId <= 0) {
    res.status(400).json({ error: "invalid claim id" });
    return;
  }
  if (!getPromiseClaimById(claimId)) {
    res.status(404).json({ error: "promise claim not found" });
    return;
  }

  res.json({ items: listPromiseClaimAudits(claimId) });
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
    .all(includePending ? 1 : 0) as Array<{
      id: number;
      politicianId: number;
      sourceUrl: string;
      body: string;
      dateSaid: string;
      verificationStatus: string;
      authorId: string;
      createdAt: string;
    }>;
  const canonicalMetadata = getStatementCanonicalMetadataMap(
    rows.map((row) => row.id),
    _req.auth.role === "moderator" || _req.auth.role === "admin"
  );
  res.json({
    items: rows.map((row) => {
      const canonical = canonicalMetadata.get(row.id);
      return {
        ...row,
        canonicalPromiseId: canonical?.canonicalPromiseId ?? null,
        promiseKind: canonical ? (canonical.canonicalPublicStatus === "public" ? "canonical_public" : "canonical_draft") : "raw_submission",
        canonicalPromiseText: canonical?.canonicalPromiseText ?? null,
        acceptedSourceCount: canonical?.acceptedSourceCount ?? 0
      };
    })
  });
});

app.get("/statements/:id", (req, res) => {
  const statementId = Number(req.params.id);
  const includePending = req.auth.role === "moderator" || req.auth.role === "admin";
  const includeNonPublicCanonical = req.auth.role === "moderator" || req.auth.role === "admin";
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
  const viewerVote = req.auth.userId
    ? ((db
        .prepare("SELECT value FROM votes WHERE statement_id = ? AND user_id = ? LIMIT 1")
        .get(statementId, req.auth.userId) as { value: "support" | "oppose" } | undefined)?.value ?? null)
    : null;
  const canonical = getStatementCanonicalMetadataMap([statementId], includeNonPublicCanonical).get(statementId) ?? null;
  const acceptedSources = canonical ? listCanonicalPromiseSources(canonical.canonicalPromiseId) : [];

  res.json({
    ...row,
    aggregate,
    viewerVote,
    promiseKind: canonical ? (canonical.canonicalPublicStatus === "public" ? "canonical_public" : "canonical_draft") : "raw_submission",
    canonical: canonical
      ? {
          id: canonical.canonicalPromiseId,
          promiseText: canonical.canonicalPromiseText,
          publicStatus: canonical.canonicalPublicStatus,
          primaryStatementId: canonical.primaryStatementId,
          acceptedSourceCount: canonical.acceptedSourceCount
        }
      : null,
    acceptedSources,
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

  res.json({ ok: true, aggregate: agg, viewerVote: value });
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

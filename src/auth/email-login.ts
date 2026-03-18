import crypto from "node:crypto";

import { db } from "../db/client.js";
import { recordProductEvent } from "../db/product-events.js";
import { signToken } from "./jwt.js";

type KnownRole = "user" | "moderator" | "admin";

export type EmailLoginRequestResult = {
  ok: true;
  expiresInMinutes: number;
  deliveryMode: "email" | "inline";
  codePreview: string | null;
};

export type EmailLoginVerifyResult =
  | {
      ok: true;
      token: string;
      userId: string;
      email: string;
      role: KnownRole;
    }
  | {
      ok: false;
      error: string;
    };

const EMAIL_LOGIN_TTL_MINUTES = Math.max(1, Number(process.env.AUTH_LOGIN_CODE_TTL_MINUTES ?? "15"));
const AUTH_CODE_SECRET = process.env.AUTH_CODE_SECRET ?? process.env.JWT_SECRET ?? "dev-secret-do-not-use-in-production";
const EMAIL_PROVIDER = (process.env.AUTH_EMAIL_PROVIDER ?? (process.env.NODE_ENV === "production" ? "resend" : "inline")).trim().toLowerCase();
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const AUTH_EMAIL_FROM = process.env.AUTH_EMAIL_FROM ?? "noreply@pnyx.local";
const RESEND_API_URL = process.env.RESEND_API_URL ?? "https://api.resend.com/emails";

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const buildCodeHash = (email: string, code: string): string => {
  return crypto.createHmac("sha256", AUTH_CODE_SECRET).update(`${normalizeEmail(email)}|${code}`).digest("hex");
};

const generateCode = (): string => {
  return String(crypto.randomInt(100_000, 1_000_000));
};

const expireOutstandingCodes = (email: string): void => {
  db.prepare(
    "UPDATE auth_login_codes SET delivery_state = 'expired', updated_at = datetime('now') WHERE email = ? AND consumed_at IS NULL AND expires_at >= datetime('now')"
  ).run(email);
};

const sendViaResend = async (email: string, code: string): Promise<void> => {
  if (!RESEND_API_KEY || !AUTH_EMAIL_FROM) {
    throw new Error("email auth provider is not configured");
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: AUTH_EMAIL_FROM,
      to: [email],
      subject: "Your PNYX sign-in code",
      text: `Your PNYX sign-in code is ${code}. It expires in ${EMAIL_LOGIN_TTL_MINUTES} minutes.`,
      html: `<p>Your PNYX sign-in code is <strong>${code}</strong>.</p><p>It expires in ${EMAIL_LOGIN_TTL_MINUTES} minutes.</p>`
    })
  });

  if (!response.ok) {
    throw new Error(`email delivery failed with status ${response.status}`);
  }
};

const deliverCode = async (email: string, code: string): Promise<{ deliveryMode: "email" | "inline"; codePreview: string | null }> => {
  if (EMAIL_PROVIDER === "inline") {
    return {
      deliveryMode: "inline",
      codePreview: code
    };
  }

  if (EMAIL_PROVIDER === "resend") {
    await sendViaResend(email, code);
    return {
      deliveryMode: "email",
      codePreview: null
    };
  }

  throw new Error("unsupported email auth provider");
};

export const issueEmailLoginCode = async (rawEmail: string): Promise<EmailLoginRequestResult> => {
  const email = normalizeEmail(rawEmail);
  const user = db
    .prepare("SELECT id FROM users WHERE email = ? LIMIT 1")
    .get(email) as { id: string } | undefined;

  if (!user) {
    recordProductEvent({
      eventDomain: "auth",
      eventName: "login_code_requested",
      entityKind: "user",
      metadata: {
        email,
        userKnown: false,
        deliveryMode: EMAIL_PROVIDER === "inline" ? "inline" : "email"
      }
    });
    return {
      ok: true,
      expiresInMinutes: EMAIL_LOGIN_TTL_MINUTES,
      deliveryMode: EMAIL_PROVIDER === "inline" ? "inline" : "email",
      codePreview: null
    };
  }

  expireOutstandingCodes(email);

  const code = generateCode();
  const codeHash = buildCodeHash(email, code);
  const result = db
    .prepare(
      "INSERT INTO auth_login_codes (user_id, email, code_hash, delivery_state, expires_at) VALUES (?, ?, ?, 'issued', datetime('now', ?))"
    )
    .run(user.id, email, codeHash, `+${EMAIL_LOGIN_TTL_MINUTES} minutes`);
  const loginCodeId = result.lastInsertRowid as number;

  try {
    const delivery = await deliverCode(email, code);
    db.prepare("UPDATE auth_login_codes SET delivery_state = 'sent', updated_at = datetime('now') WHERE id = ?").run(loginCodeId);
    recordProductEvent({
      eventDomain: "auth",
      eventName: "login_code_requested",
      actorId: user.id,
      entityKind: "user",
      entityId: user.id,
      metadata: {
        email,
        userKnown: true,
        deliveryMode: delivery.deliveryMode
      }
    });
    return {
      ok: true,
      expiresInMinutes: EMAIL_LOGIN_TTL_MINUTES,
      deliveryMode: delivery.deliveryMode,
      codePreview: delivery.codePreview
    };
  } catch (err) {
    db.prepare("UPDATE auth_login_codes SET delivery_state = 'failed', updated_at = datetime('now') WHERE id = ?").run(loginCodeId);
    throw err;
  }
};

export const verifyEmailLoginCode = (rawEmail: string, code: string): EmailLoginVerifyResult => {
  const email = normalizeEmail(rawEmail);
  const row = db
    .prepare(
      `SELECT alc.id, alc.user_id AS userId, u.email, u.role
        , alc.code_hash AS codeHash
       FROM auth_login_codes alc
       INNER JOIN users u ON u.id = alc.user_id
       WHERE alc.email = ?
         AND alc.consumed_at IS NULL
         AND alc.delivery_state IN ('issued', 'sent')
         AND alc.expires_at >= datetime('now')
       ORDER BY alc.id DESC
       LIMIT 1`
    )
    .get(email) as { id: number; userId: string; email: string; role: KnownRole; codeHash: string } | undefined;

  if (!row) {
    return { ok: false, error: "invalid or expired sign-in code" };
  }

  if (buildCodeHash(email, code.trim()) !== row.codeHash) {
    return { ok: false, error: "invalid or expired sign-in code" };
  }

  const write = db
    .prepare(
      "UPDATE auth_login_codes SET consumed_at = datetime('now'), delivery_state = 'consumed', updated_at = datetime('now') WHERE id = ? AND consumed_at IS NULL"
    )
    .run(row.id);
  if (write.changes === 0) {
    return { ok: false, error: "invalid or expired sign-in code" };
  }

  recordProductEvent({
    eventDomain: "auth",
    eventName: "signed_in",
    actorId: row.userId,
    actorRole: row.role,
    entityKind: "user",
    entityId: row.userId,
    metadata: {
      email: row.email
    }
  });

  return {
    ok: true,
    token: signToken({
      userId: row.userId,
      role: row.role,
      email: row.email
    }),
    userId: row.userId,
    email: row.email,
    role: row.role
  };
};

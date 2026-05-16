import crypto from "node:crypto";

import type { ResearchSourceTier } from "./watchlist.js";

export type ResearchCandidateType = "party_stance" | "canonical_promise" | "politician_statement" | "fulfillment_assessment";

export type ResearchDocumentForPrompt = {
  title: string;
  url: string;
  sourceTier: ResearchSourceTier;
  text: string;
};

export type ResearchCandidate = {
  candidateType: ResearchCandidateType;
  person: string | null;
  partyKey: string | null;
  issue: string | null;
  claimText: string;
  sourceUrl: string;
  sourceType: ResearchSourceTier;
  publishedAt: string;
  evidenceQuote: string;
  confidence: number;
  needsOfficialConfirmation: boolean;
};

export type ResearchSourceContext = {
  sourceUrl: string;
  sourceType: ResearchSourceTier;
  publishedAt: string;
};

const candidateTypes = new Set(["party_stance", "canonical_promise", "politician_statement", "fulfillment_assessment"]);
const sourceTypes = new Set(["official", "party", "article"]);

const textOrNull = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeSourceUrl = (sourceUrl: string): string | null => {
  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  parsed.hash = "";
  for (const key of Array.from(parsed.searchParams.keys())) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey.startsWith("utm_") || normalizedKey === "fbclid" || normalizedKey === "gclid") {
      parsed.searchParams.delete(key);
    }
  }
  parsed.searchParams.sort();
  if (parsed.pathname.length > 1) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }

  return parsed.toString();
};

const isValidPublishedDate = (publishedAt: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt)) {
    return false;
  }

  const date = new Date(`${publishedAt}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === publishedAt;
};

const normalizeClaimText = (claimText: string): string => claimText.trim().replace(/\s+/g, " ").toLowerCase();

export const buildResearchPrompt = (document: ResearchDocumentForPrompt): string => {
  return [
    "Return JSON only.",
    "Extract Finnish political accountability candidates from the source text.",
    "Allowed candidateType values: party_stance, canonical_promise, politician_statement, fulfillment_assessment.",
    "Every candidate must include sourceUrl, sourceType, publishedAt, evidenceQuote, confidence, and needsOfficialConfirmation.",
    "Use exact short evidenceQuote text from the source. Do not invent claims.",
    "For article-only fulfillment evidence, set needsOfficialConfirmation to true.",
    `Source URL: ${document.url}`,
    `Source title: ${document.title}`,
    `Source type: ${document.sourceTier}`,
    'Return shape: {"candidates":[{"candidateType":"politician_statement","person":"Name","partyKey":null,"issue":null,"claimText":"...","sourceUrl":"...","sourceType":"official","publishedAt":"YYYY-MM-DD","evidenceQuote":"...","confidence":0.82,"needsOfficialConfirmation":false}]}',
    "Source text:",
    document.text.slice(0, 16_000)
  ].join("\n\n");
};

export const normalizeResearchCandidates = (
  payload: unknown,
  minimumConfidence: number,
  sourceContext: ResearchSourceContext
): ResearchCandidate[] => {
  const sourceUrl = normalizeSourceUrl(sourceContext.sourceUrl);
  const sourceType = textOrNull(sourceContext.sourceType);
  const publishedAt = textOrNull(sourceContext.publishedAt);
  if (!sourceUrl || !sourceType || !sourceTypes.has(sourceType) || !publishedAt || !isValidPublishedDate(publishedAt)) {
    return [];
  }

  if (!isRecord(payload)) {
    return [];
  }

  const rawCandidates = payload.candidates;
  if (!Array.isArray(rawCandidates)) {
    return [];
  }

  const normalized: ResearchCandidate[] = [];
  for (const raw of rawCandidates) {
    if (!isRecord(raw)) {
      continue;
    }

    const candidateType = textOrNull(raw.candidateType);
    const claimText = textOrNull(raw.claimText);
    const evidenceQuote = textOrNull(raw.evidenceQuote);
    const confidence = raw.confidence;
    if (
      !candidateType ||
      !candidateTypes.has(candidateType) ||
      !claimText ||
      !evidenceQuote ||
      typeof confidence !== "number" ||
      !Number.isFinite(confidence) ||
      confidence < 0 ||
      confidence > 1 ||
      confidence < minimumConfidence
    ) {
      continue;
    }

    normalized.push({
      candidateType: candidateType as ResearchCandidateType,
      person: textOrNull(raw.person),
      partyKey: textOrNull(raw.partyKey),
      issue: textOrNull(raw.issue),
      claimText,
      sourceUrl,
      sourceType: sourceType as ResearchSourceTier,
      publishedAt,
      evidenceQuote,
      confidence,
      needsOfficialConfirmation:
        raw.needsOfficialConfirmation === true || (candidateType === "fulfillment_assessment" && sourceType === "article")
    });
  }

  return normalized;
};

export const researchCandidateDedupeKey = (candidate: ResearchCandidate): string => {
  const normalizedSourceUrl = normalizeSourceUrl(candidate.sourceUrl) ?? candidate.sourceUrl;
  const stable = [
    candidate.candidateType,
    candidate.person ?? "",
    candidate.partyKey ?? "",
    candidate.issue ?? "",
    normalizeClaimText(candidate.claimText),
    normalizedSourceUrl
  ].join("|");
  return `research:${crypto.createHash("sha256").update(stable).digest("hex")}`;
};

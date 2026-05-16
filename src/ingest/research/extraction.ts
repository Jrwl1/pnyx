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

const candidateTypes = new Set(["party_stance", "canonical_promise", "politician_statement", "fulfillment_assessment"]);
const sourceTypes = new Set(["official", "party", "article"]);

const textOrNull = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

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

export const normalizeResearchCandidates = (payload: unknown, minimumConfidence: number): ResearchCandidate[] => {
  const rawCandidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(rawCandidates)) {
    return [];
  }

  const normalized: ResearchCandidate[] = [];
  for (const raw of rawCandidates as Array<Record<string, unknown>>) {
    const candidateType = textOrNull(raw.candidateType);
    const sourceType = textOrNull(raw.sourceType);
    const claimText = textOrNull(raw.claimText);
    const sourceUrl = textOrNull(raw.sourceUrl);
    const publishedAt = textOrNull(raw.publishedAt);
    const evidenceQuote = textOrNull(raw.evidenceQuote);
    const confidence = Number(raw.confidence);
    if (
      !candidateType ||
      !candidateTypes.has(candidateType) ||
      !sourceType ||
      !sourceTypes.has(sourceType) ||
      !claimText ||
      !sourceUrl ||
      !publishedAt ||
      !evidenceQuote ||
      !Number.isFinite(confidence) ||
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
  const stable = [
    candidate.candidateType,
    candidate.person ?? "",
    candidate.partyKey ?? "",
    candidate.issue ?? "",
    candidate.claimText.trim().toLowerCase(),
    candidate.sourceUrl
  ].join("|");
  return `research:${crypto.createHash("sha256").update(stable).digest("hex")}`;
};

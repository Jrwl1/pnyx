import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type ResearchSourceTier = "official" | "party" | "article";

export type ResearchWatchlist = {
  sourceKey: "research_watch_pulse_fi";
  sourceFamily: "research_watch_pulse";
  checkedAt: string;
  politicians: Array<{
    targetKey: string;
    name: string;
    partyKey: string;
    keywords: string[];
  }>;
  officialDomains: string[];
  articleDomains: string[];
  partyDomains: string[];
  seedUrls: Array<{
    url: string;
    sourceTier: ResearchSourceTier;
    topic: string;
  }>;
  limits: {
    fetchTimeoutMs: number;
    maxResponseBytes: number;
    maxDocumentsPerPulse: number;
    minimumConfidence: number;
  };
};

const assertString = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
};

const assertArray = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value;
};

const assertRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
};

const assertStringArray = (value: unknown, label: string): string[] => {
  return assertArray(value, label).map((item, index) => assertString(item, `${label}[${index}]`));
};

const assertPositiveFiniteNumber = (value: unknown, label: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number`);
  }
  return value;
};

const assertConfidence = (value: unknown, label: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be a finite number between 0 and 1`);
  }
  return value;
};

export const normalizeHostname = (url: string): string => {
  const hostname = new URL(url).hostname.toLowerCase();
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
};

export const isAllowedResearchUrl = (url: string, allowedDomains: string[]): boolean => {
  let hostname: string;
  try {
    hostname = normalizeHostname(url);
  } catch {
    return false;
  }
  return allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
};

export const loadResearchWatchlist = (path = "data/research/watchlist.fi.json"): ResearchWatchlist => {
  const raw = assertRecord(JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8")), "watchlist");
  const sourceKey = assertString(raw.sourceKey, "sourceKey");
  const sourceFamily = assertString(raw.sourceFamily, "sourceFamily");
  if (sourceKey !== "research_watch_pulse_fi" || sourceFamily !== "research_watch_pulse") {
    throw new Error("watchlist source identity is invalid");
  }

  const limits = assertRecord(raw.limits, "limits");

  return {
    sourceKey,
    sourceFamily,
    checkedAt: assertString(raw.checkedAt, "checkedAt"),
    politicians: assertArray(raw.politicians, "politicians").map((value, index) => {
      const politician = assertRecord(value, `politicians[${index}]`);
      return {
        targetKey: assertString(politician.targetKey, `politicians[${index}].targetKey`),
        name: assertString(politician.name, `politicians[${index}].name`),
        partyKey: assertString(politician.partyKey, `politicians[${index}].partyKey`),
        keywords: assertStringArray(politician.keywords, `politicians[${index}].keywords`)
      };
    }),
    officialDomains: assertStringArray(raw.officialDomains, "officialDomains"),
    articleDomains: assertStringArray(raw.articleDomains, "articleDomains"),
    partyDomains: assertStringArray(raw.partyDomains, "partyDomains"),
    seedUrls: assertArray(raw.seedUrls, "seedUrls").map((value, index) => {
      const seed = assertRecord(value, `seedUrls[${index}]`);
      const sourceTier = assertString(seed.sourceTier, `seedUrls[${index}].sourceTier`);
      if (sourceTier !== "official" && sourceTier !== "party" && sourceTier !== "article") {
        throw new Error(`seedUrls[${index}].sourceTier is invalid`);
      }
      return {
        url: assertString(seed.url, `seedUrls[${index}].url`),
        sourceTier,
        topic: assertString(seed.topic, `seedUrls[${index}].topic`)
      };
    }),
    limits: {
      fetchTimeoutMs: assertPositiveFiniteNumber(limits.fetchTimeoutMs, "limits.fetchTimeoutMs"),
      maxResponseBytes: assertPositiveFiniteNumber(limits.maxResponseBytes, "limits.maxResponseBytes"),
      maxDocumentsPerPulse: assertPositiveFiniteNumber(limits.maxDocumentsPerPulse, "limits.maxDocumentsPerPulse"),
      minimumConfidence: assertConfidence(limits.minimumConfidence, "limits.minimumConfidence")
    }
  };
};

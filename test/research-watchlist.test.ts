import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { isAllowedResearchUrl, loadResearchWatchlist, normalizeHostname } from "../src/ingest/research/watchlist.js";

const temporaryDirectories: string[] = [];

const writeWatchlist = (overrides: Record<string, unknown>): string => {
  const directory = mkdtempSync(join(tmpdir(), "pnyx-watchlist-"));
  temporaryDirectories.push(directory);
  const path = join(directory, "watchlist.json");
  writeFileSync(
    path,
    JSON.stringify({
      sourceKey: "research_watch_pulse_fi",
      sourceFamily: "research_watch_pulse",
      checkedAt: "2026-05-16",
      politicians: [
        {
          targetKey: "petteri-orpo",
          name: "Petteri Orpo",
          partyKey: "kok",
          keywords: ["budget"]
        }
      ],
      officialDomains: ["valtioneuvosto.fi"],
      articleDomains: ["yle.fi"],
      partyDomains: ["kokoomus.fi"],
      seedUrls: [
        {
          url: "https://valtioneuvosto.fi/en/governments/government-programme",
          sourceTier: "official",
          topic: "government programme"
        }
      ],
      limits: {
        fetchTimeoutMs: 10000,
        maxResponseBytes: 1000000,
        maxDocumentsPerPulse: 30,
        minimumConfidence: 0.72
      },
      ...overrides
    }),
    "utf8"
  );
  return path;
};

describe("research watchlist", () => {
  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("loads pilot politicians and source policy", () => {
    const watchlist = loadResearchWatchlist("data/research/watchlist.fi.json");

    expect(watchlist.sourceKey).toBe("research_watch_pulse_fi");
    expect(watchlist.politicians.map((politician) => politician.name)).toEqual([
      "Petteri Orpo",
      "Riikka Purra",
      "Mari Rantanen",
      "Anders Adlercreutz",
      "Sari Multala"
    ]);
    expect(watchlist.officialDomains).toContain("valtioneuvosto.fi");
    expect(watchlist.articleDomains).toContain("yle.fi");
    expect(watchlist.limits.minimumConfidence).toBeGreaterThanOrEqual(0.7);
  });

  it("normalizes hostnames and allows subdomains of approved domains", () => {
    expect(normalizeHostname("https://www.valtioneuvosto.fi/en/governments")).toBe("valtioneuvosto.fi");
    expect(isAllowedResearchUrl("https://www.valtioneuvosto.fi/en/news", ["valtioneuvosto.fi"])).toBe(true);
    expect(isAllowedResearchUrl("https://yle.fi/a/74-20000000", ["yle.fi"])).toBe(true);
    expect(isAllowedResearchUrl("https://example.com/a", ["yle.fi"])).toBe(false);
  });

  it("returns false for malformed allowed-url checks", () => {
    expect(isAllowedResearchUrl("not a url", ["yle.fi"])).toBe(false);
  });

  it("requires politicians and seedUrls arrays", () => {
    expect(() => loadResearchWatchlist(writeWatchlist({ politicians: undefined }))).toThrow(/politicians must be an array/i);
    expect(() => loadResearchWatchlist(writeWatchlist({ politicians: "Petteri Orpo" }))).toThrow(/politicians must be an array/i);
    expect(() => loadResearchWatchlist(writeWatchlist({ seedUrls: undefined }))).toThrow(/seedUrls must be an array/i);
    expect(() => loadResearchWatchlist(writeWatchlist({ seedUrls: "https://yle.fi" }))).toThrow(/seedUrls must be an array/i);
  });

  it("rejects invalid numeric limits", () => {
    expect(() => loadResearchWatchlist(writeWatchlist({ limits: { fetchTimeoutMs: null, maxResponseBytes: 1, maxDocumentsPerPulse: 1, minimumConfidence: 0.5 } }))).toThrow(/limits\.fetchTimeoutMs must be a positive finite number/i);
    expect(() => loadResearchWatchlist(writeWatchlist({ limits: { fetchTimeoutMs: "", maxResponseBytes: 1, maxDocumentsPerPulse: 1, minimumConfidence: 0.5 } }))).toThrow(/limits\.fetchTimeoutMs must be a positive finite number/i);
    expect(() => loadResearchWatchlist(writeWatchlist({ limits: { fetchTimeoutMs: Number.NaN, maxResponseBytes: 1, maxDocumentsPerPulse: 1, minimumConfidence: 0.5 } }))).toThrow(/limits\.fetchTimeoutMs must be a positive finite number/i);
    expect(() => loadResearchWatchlist(writeWatchlist({ limits: { fetchTimeoutMs: 1, maxResponseBytes: 0, maxDocumentsPerPulse: 1, minimumConfidence: 0.5 } }))).toThrow(/limits\.maxResponseBytes must be a positive finite number/i);
    expect(() => loadResearchWatchlist(writeWatchlist({ limits: { fetchTimeoutMs: 1, maxResponseBytes: 1, maxDocumentsPerPulse: -1, minimumConfidence: 0.5 } }))).toThrow(/limits\.maxDocumentsPerPulse must be a positive finite number/i);
    expect(() => loadResearchWatchlist(writeWatchlist({ limits: { fetchTimeoutMs: 1, maxResponseBytes: 1, maxDocumentsPerPulse: 1, minimumConfidence: 1.1 } }))).toThrow(/limits\.minimumConfidence must be a finite number between 0 and 1/i);
  });
});

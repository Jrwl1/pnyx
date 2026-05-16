import { describe, expect, it } from "vitest";

import { buildResearchPrompt, normalizeResearchCandidates } from "../src/ingest/research/extraction.js";

describe("research pulse extraction", () => {
  it("builds a prompt that requires JSON candidates and source quotes", () => {
    const prompt = buildResearchPrompt({
      title: "Prime minister speech",
      url: "https://valtioneuvosto.fi/example",
      sourceTier: "official",
      text: "Prime Minister Petteri Orpo said the government will reduce debt."
    });

    expect(prompt).toContain("Return JSON only");
    expect(prompt).toContain("evidenceQuote");
    expect(prompt).toContain("canonical_promise");
    expect(prompt).toContain("politician_statement");
  });

  it("keeps valid candidates and marks article fulfillment as needing official confirmation", () => {
    const candidates = normalizeResearchCandidates(
      {
        candidates: [
          {
            candidateType: "fulfillment_assessment",
            person: "Petteri Orpo",
            claimText: "Debt reduction moved forward.",
            sourceUrl: "https://yle.fi/a/74-20000000",
            sourceType: "article",
            publishedAt: "2026-05-16",
            evidenceQuote: "The measure has advanced, according to the article.",
            confidence: 0.9,
            needsOfficialConfirmation: false
          }
        ]
      },
      0.72
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      candidateType: "fulfillment_assessment",
      sourceType: "article",
      needsOfficialConfirmation: true
    });
  });

  it("drops low-confidence and quote-less candidates", () => {
    const candidates = normalizeResearchCandidates(
      {
        candidates: [
          {
            candidateType: "canonical_promise",
            person: "Petteri Orpo",
            claimText: "Weak candidate.",
            sourceUrl: "https://valtioneuvosto.fi/example",
            sourceType: "official",
            publishedAt: "2026-05-16",
            evidenceQuote: "",
            confidence: 0.95,
            needsOfficialConfirmation: false
          },
          {
            candidateType: "politician_statement",
            person: "Riikka Purra",
            claimText: "Low confidence.",
            sourceUrl: "https://valtioneuvosto.fi/example",
            sourceType: "official",
            publishedAt: "2026-05-16",
            evidenceQuote: "A real quote.",
            confidence: 0.5,
            needsOfficialConfirmation: false
          }
        ]
      },
      0.72
    );

    expect(candidates).toEqual([]);
  });
});

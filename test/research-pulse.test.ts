import { describe, expect, it } from "vitest";

import { buildResearchPrompt, normalizeResearchCandidates, researchCandidateDedupeKey } from "../src/ingest/research/extraction.js";

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
            sourceUrl: "https://model.example/should-not-win",
            sourceType: "official",
            publishedAt: "2020-01-01",
            evidenceQuote: "The measure has advanced, according to the article.",
            confidence: 0.9,
            needsOfficialConfirmation: false
          }
        ]
      },
      0.72,
      {
        sourceUrl: "https://yle.fi/a/74-20000000",
        sourceType: "article",
        publishedAt: "2026-05-16"
      }
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      candidateType: "fulfillment_assessment",
      sourceUrl: "https://yle.fi/a/74-20000000",
      sourceType: "article",
      publishedAt: "2026-05-16",
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
      0.72,
      {
        sourceUrl: "https://valtioneuvosto.fi/example",
        sourceType: "official",
        publishedAt: "2026-05-16"
      }
    );

    expect(candidates).toEqual([]);
  });

  it("returns no candidates for malformed payload shapes and skips malformed candidate entries", () => {
    const sourceContext = {
      sourceUrl: "https://valtioneuvosto.fi/example",
      sourceType: "official" as const,
      publishedAt: "2026-05-16"
    };

    expect(normalizeResearchCandidates(null, 0.72, sourceContext)).toEqual([]);
    expect(normalizeResearchCandidates({ candidates: null }, 0.72, sourceContext)).toEqual([]);
    expect(normalizeResearchCandidates({ candidates: {} }, 0.72, sourceContext)).toEqual([]);

    const candidates = normalizeResearchCandidates(
      {
        candidates: [
          null,
          "not an object",
          {
            candidateType: "politician_statement",
            person: "Riikka Purra",
            claimText: "The budget will be adjusted.",
            evidenceQuote: "The budget will be adjusted.",
            confidence: 0.82
          }
        ]
      },
      0.72,
      sourceContext
    );

    expect(candidates).toHaveLength(1);
  });

  it("requires confidence to be a JSON number from zero to one", () => {
    const sourceContext = {
      sourceUrl: "https://valtioneuvosto.fi/example",
      sourceType: "official" as const,
      publishedAt: "2026-05-16"
    };
    const candidate = (confidence: unknown) => ({
      candidateType: "politician_statement",
      person: "Riikka Purra",
      claimText: `Confidence candidate ${String(confidence)}.`,
      evidenceQuote: "A real quote.",
      confidence
    });

    const candidates = normalizeResearchCandidates(
      {
        candidates: [
          candidate(true),
          candidate("0.95"),
          candidate([0.95]),
          candidate(Number.NaN),
          candidate(-0.1),
          candidate(1.1),
          candidate(0),
          candidate(1)
        ]
      },
      0,
      sourceContext
    );

    expect(candidates.map((entry) => entry.confidence)).toEqual([0, 1]);
  });

  it("rejects invalid source context URL and date shapes", () => {
    const payload = {
      candidates: [
        {
          candidateType: "politician_statement",
          claimText: "A valid claim.",
          evidenceQuote: "A valid quote.",
          confidence: 0.9
        }
      ]
    };

    expect(
      normalizeResearchCandidates(payload, 0.72, {
        sourceUrl: "ftp://valtioneuvosto.fi/example",
        sourceType: "official",
        publishedAt: "2026-05-16"
      })
    ).toEqual([]);
    expect(
      normalizeResearchCandidates(payload, 0.72, {
        sourceUrl: "https://valtioneuvosto.fi/example",
        sourceType: "official",
        publishedAt: "2026-02-30"
      })
    ).toEqual([]);
  });

  it("normalizes stable dedupe keys for equivalent URLs and claim text", () => {
    const baseCandidate = {
      candidateType: "politician_statement" as const,
      person: "Riikka Purra",
      partyKey: null,
      issue: null,
      sourceType: "article" as const,
      publishedAt: "2026-05-16",
      evidenceQuote: "A real quote.",
      confidence: 0.88,
      needsOfficialConfirmation: false
    };

    expect(
      researchCandidateDedupeKey({
        ...baseCandidate,
        claimText: "  Budget   will\nbe adjusted. ",
        sourceUrl: "https://YLE.fi/a/74-20000000/?utm_source=feed&fbclid=abc#graf"
      })
    ).toBe(
      researchCandidateDedupeKey({
        ...baseCandidate,
        claimText: "budget will be adjusted.",
        sourceUrl: "https://yle.fi/a/74-20000000?gclid=xyz"
      })
    );
  });
});

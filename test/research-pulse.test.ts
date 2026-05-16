import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../src/db/client.js";
import { runOfficialSourceImport } from "../src/ingest/adapters.js";
import { buildResearchPrompt, normalizeResearchCandidates, researchCandidateDedupeKey } from "../src/ingest/research/extraction.js";

const originalFetch = globalThis.fetch;

const clearResearchPulseTables = (): void => {
  db.exec("DELETE FROM ingest_stage_items");
  db.exec("DELETE FROM ingest_raw_records");
  db.exec("DELETE FROM ingest_runs");
  db.exec("DELETE FROM statements");
};

describe("research pulse extraction", () => {
  beforeEach(() => {
    clearResearchPulseTables();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("dispatches the research watch pulse through official import without auto-publishing statements", async () => {
    const generateSnapshots: Array<{ rawCount: number; stageCount: number }> = [];
    const prompts: string[] = [];

    globalThis.fetch = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/generate")) {
        generateSnapshots.push({
          rawCount: Number(db.prepare("SELECT COUNT(*) FROM ingest_raw_records WHERE source_family = 'research_watch_pulse'").pluck().get()),
          stageCount: Number(db.prepare("SELECT COUNT(*) FROM ingest_stage_items WHERE source_key = 'research_watch_pulse_fi'").pluck().get())
        });
        const body = JSON.parse(String(init?.body ?? "{}")) as { prompt?: string };
        prompts.push(body.prompt ?? "");
        return new Response(
          JSON.stringify({
            response: JSON.stringify({
              candidates: [
                {
                  candidateType: "politician_statement",
                  person: "Petteri Orpo",
                  partyKey: "kok",
                  issue: "Debt",
                  claimText: "The government will reduce debt.",
                  sourceUrl: "https://model.example/ignored",
                  sourceType: "article",
                  publishedAt: "2020-01-01",
                  evidenceQuote: "The government will reduce debt.",
                  confidence: 0.91,
                  needsOfficialConfirmation: false
                }
              ]
            }),
            done: true
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("api.hankeikkuna.fi")) {
        return new Response(JSON.stringify({ title: "Government project", description: "The government will reduce debt." }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(
        `
        <html>
          <head>
            <title>Government programme</title>
            <meta property="article:published_time" content="2026-05-16T10:00:00+03:00" />
          </head>
          <body>
            <script>window.noise = true;</script>
            <main>
              <h1>Government programme</h1>
              <p>The government will reduce debt.</p>
            </main>
          </body>
        </html>
        `,
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    }) as typeof fetch;

    const result = await runOfficialSourceImport("research_watch_pulse_fi", "research-test");

    const runs = db.prepare("SELECT id, status, fetched_count AS fetchedCount, staged_count AS stagedCount FROM ingest_runs").all() as Array<{
      id: number;
      status: string;
      fetchedCount: number;
      stagedCount: number;
    }>;
    const rawRecords = db
      .prepare("SELECT id, payload_json AS payloadJson FROM ingest_raw_records WHERE source_family = 'research_watch_pulse' ORDER BY id")
      .all() as Array<{ id: number; payloadJson: string }>;
    const stageItems = db
      .prepare("SELECT raw_record_id AS rawRecordId, stage_type AS stageType, normalized_json AS normalizedJson FROM ingest_stage_items ORDER BY id")
      .all() as Array<{ rawRecordId: number; stageType: string; normalizedJson: string }>;

    expect(result.runId).toBe(runs[0]?.id);
    expect(runs).toEqual([{ id: result.runId, status: "staged", fetchedCount: 2, stagedCount: 2 }]);
    expect(generateSnapshots[0]).toEqual({ rawCount: 1, stageCount: 0 });
    expect(rawRecords).toHaveLength(2);
    expect(stageItems).toHaveLength(2);
    expect(stageItems.map((item) => item.stageType)).toEqual(["politician_statement", "politician_statement"]);
    expect(stageItems.every((item) => rawRecords.some((record) => record.id === item.rawRecordId))).toBe(true);
    expect(JSON.parse(rawRecords[0].payloadJson)).toMatchObject({
      title: "Government programme",
      sourceUrl: "https://valtioneuvosto.fi/en/governments/government-programme",
      publishedAt: "2026-05-16"
    });
    expect(prompts[0]).toContain("The government will reduce debt.");
    expect(prompts[0]).not.toContain("<script>");
    expect(JSON.parse(stageItems[0].normalizedJson)).toMatchObject({
      sourceUrl: "https://valtioneuvosto.fi/en/governments/government-programme",
      sourceType: "official",
      publishedAt: "2026-05-16",
      reviewStatus: "pending",
      llmModel: "llama3.1:8b"
    });
    expect(Number(db.prepare("SELECT COUNT(*) FROM statements").pluck().get())).toBe(0);
  });

  it("marks a research pulse as fetched when documents are fetched but no candidates qualify", async () => {
    globalThis.fetch = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith("/api/generate")) {
        return new Response(JSON.stringify({ response: JSON.stringify({ candidates: [] }), done: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (url.includes("api.hankeikkuna.fi")) {
        return new Response(JSON.stringify({ title: "Government project", description: "Fetched but no qualifying claims." }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(
        `
        <html>
          <head>
            <title>Government programme</title>
            <meta property="article:published_time" content="2026-05-16T10:00:00+03:00" />
          </head>
          <body>
            <main>
              <h1>Government programme</h1>
              <p>Fetched but no qualifying claims.</p>
            </main>
          </body>
        </html>
        `,
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    }) as typeof fetch;

    const result = await runOfficialSourceImport("research_watch_pulse_fi", "research-test");

    const run = db
      .prepare("SELECT status, fetched_count AS fetchedCount, staged_count AS stagedCount FROM ingest_runs WHERE id = ?")
      .get(result.runId) as { status: string; fetchedCount: number; stagedCount: number };

    expect(run).toEqual({ status: "fetched", fetchedCount: 2, stagedCount: 0 });
    expect(Number(db.prepare("SELECT COUNT(*) FROM ingest_stage_items WHERE run_id = ?").pluck().get(result.runId))).toBe(0);
  });

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

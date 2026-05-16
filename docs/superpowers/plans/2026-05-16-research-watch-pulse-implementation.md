# Research Watch Pulse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a weekly local-LLM-assisted research pulse that fetches allowlisted Finnish political sources, extracts structured party stance, promise, statement, and fulfillment candidates with Ollama, and stages them for admin review without auto-publication.

**Architecture:** Reuse the existing ingest run, raw record, stage item, and ops review pipeline. Add a repo-local watchlist, focused research modules under `src/ingest/research/`, an Ollama-compatible provider adapter, a `politician_statement` stage type, and small ops UI additions for source-tier review metadata and "needs source" handling.

**Tech Stack:** TypeScript, Express, better-sqlite3, Vitest, Supertest, React/Vite, Ollama local HTTP API at `http://127.0.0.1:11434`.

---

## File Structure

Create:

- `data/research/watchlist.fi.json`: pilot politicians, allowed domains, source URLs, keywords, and pulse limits.
- `src/ingest/research/watchlist.ts`: typed watchlist loader and allowlist checks.
- `src/ingest/research/documents.ts`: source document normalization helpers.
- `src/ingest/research/ollama.ts`: local Ollama provider adapter with timeout and JSON response handling.
- `src/ingest/research/extraction.ts`: candidate schemas, validation, dedupe key helpers, and candidate-to-stage mapping.
- `src/ingest/research/pulse.ts`: research pulse orchestration that fetches, stores raw records, extracts, validates, and stages candidates.
- `src/ingest/research/ollama-health.ts`: CLI health check and dry-run extraction helper.
- `migrations/0016_research_watch_pulse.sql`: stage item type/status migration for `politician_statement` and `needs_source`.
- `test/research-watchlist.test.ts`: watchlist parsing and domain allowlist tests.
- `test/research-ollama.test.ts`: mocked Ollama adapter tests.
- `test/research-pulse.test.ts`: pulse raw-record, extraction, dedupe, staging, and no-autopublish tests.

Modify:

- `package.json`: add `research:pulse` and `ollama:health` scripts.
- `src/db/ingest.ts`: expand stage item type/status unions and add `markIngestStageItemNeedsSource`.
- `src/ingest/sources.ts`: add `research_watch_pulse_fi`.
- `src/ingest/adapters.ts`: dispatch the research watch pulse source family.
- `src/ingest/apply.ts`: apply `politician_statement` into `statements` as pending/verified according to review policy and keep other claim-like candidates gated.
- `src/server.ts`: add `POST /ops/stage-items/:id/needs-source`.
- `frontend/src/types.ts`: expand ingest stage/status unions and add normalized metadata typing.
- `frontend/src/lib/api.ts`: add `markIngestStageItemNeedsSource`.
- `frontend/src/routes/OpsImportsPage.tsx`: show research metadata and add "Needs source" action.
- `docs/superpowers/specs/2026-05-16-research-watch-pulse-design.md`: add link to this implementation plan after plan approval.

---

## Task 1: Install And Initialize Ollama Locally

**Files:**

- No repo files changed in this task.

- [ ] **Step 1: Install Ollama for Windows**

Run in PowerShell:

```powershell
winget install --id Ollama.Ollama -e
```

Expected:

```text
Successfully installed
```

If `winget` is not available, download the Windows installer from `https://ollama.com/download/windows`, run it, then continue with the same health commands below.

- [ ] **Step 2: Start or verify the Ollama service**

Run:

```powershell
ollama --version
```

Expected:

```text
ollama version ...
```

If the service is not running, start it from the Windows Start menu app named `Ollama`, then verify the HTTP API:

```powershell
Invoke-RestMethod http://127.0.0.1:11434/api/tags
```

Expected:

```text
models
------
...
```

- [ ] **Step 3: Pull the first extraction model**

Run:

```powershell
ollama pull llama3.1:8b
```

Expected:

```text
success
```

- [ ] **Step 4: Smoke test JSON extraction manually**

Run:

```powershell
$body = @{
  model = "llama3.1:8b"
  stream = $false
  format = "json"
  prompt = "Return JSON only: {`"ok`":true,`"source`":`"ollama`"}"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:11434/api/generate -Body $body -ContentType "application/json"
```

Expected:

```text
model      : llama3.1:8b
response   : {"ok":true,"source":"ollama"}
done       : True
```

- [ ] **Step 5: Commit nothing**

This task changes local machine state only. Do not commit installer artifacts or local Ollama model files.

---

## Task 2: Add Watchlist File And Parser

**Files:**

- Create: `data/research/watchlist.fi.json`
- Create: `src/ingest/research/watchlist.ts`
- Test: `test/research-watchlist.test.ts`

- [ ] **Step 1: Write the failing watchlist tests**

Create `test/research-watchlist.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { isAllowedResearchUrl, loadResearchWatchlist, normalizeHostname } from "../src/ingest/research/watchlist.js";

describe("research watchlist", () => {
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
});
```

- [ ] **Step 2: Run the failing tests**

Run:

```powershell
pnpm test -- test/research-watchlist.test.ts
```

Expected:

```text
Failed to resolve import "../src/ingest/research/watchlist.js"
```

- [ ] **Step 3: Add the watchlist JSON**

Create `data/research/watchlist.fi.json`:

```json
{
  "sourceKey": "research_watch_pulse_fi",
  "sourceFamily": "research_watch_pulse",
  "checkedAt": "2026-05-16",
  "politicians": [
    {
      "targetKey": "petteri-orpo",
      "name": "Petteri Orpo",
      "partyKey": "kok",
      "keywords": ["government programme", "budget", "debt", "tax", "employment", "hallitusohjelma", "talous", "velka", "vero", "tyollisyys"]
    },
    {
      "targetKey": "riikka-purra",
      "name": "Riikka Purra",
      "partyKey": "ps",
      "keywords": ["budget", "tax", "debt", "spending cuts", "talousarvio", "vero", "velka", "leikkaukset"]
    },
    {
      "targetKey": "mari-rantanen",
      "name": "Mari Rantanen",
      "partyKey": "ps",
      "keywords": ["interior security", "immigration", "border", "police", "sisainen turvallisuus", "maahanmuutto", "raja", "poliisi"]
    },
    {
      "targetKey": "anders-adlercreutz",
      "name": "Anders Adlercreutz",
      "partyKey": "rkp",
      "keywords": ["education", "culture", "language", "schools", "koulutus", "kulttuuri", "kieli", "koulut"]
    },
    {
      "targetKey": "sari-multala",
      "name": "Sari Multala",
      "partyKey": "kok",
      "keywords": ["climate", "environment", "housing", "construction", "biodiversity", "ilmasto", "ymparisto", "asuminen", "rakentaminen", "luonnon monimuotoisuus"]
    }
  ],
  "officialDomains": [
    "valtioneuvosto.fi",
    "intermin.fi",
    "vm.fi",
    "okm.fi",
    "ym.fi",
    "eduskunta.fi",
    "avoindata.eduskunta.fi",
    "finlex.fi",
    "data.finlex.fi",
    "hankeikkuna.fi",
    "api.hankeikkuna.fi",
    "julkaisut.valtioneuvosto.fi"
  ],
  "articleDomains": ["yle.fi", "hs.fi", "sttinfo.fi", "mtvuutiset.fi"],
  "partyDomains": ["kokoomus.fi", "perussuomalaiset.fi", "rkp.fi", "sfp.fi"],
  "seedUrls": [
    {
      "url": "https://valtioneuvosto.fi/en/governments/government-programme",
      "sourceTier": "official",
      "topic": "government programme"
    },
    {
      "url": "https://api.hankeikkuna.fi/api/v2/projects",
      "sourceTier": "official",
      "topic": "government projects"
    }
  ],
  "limits": {
    "fetchTimeoutMs": 10000,
    "maxResponseBytes": 1000000,
    "maxDocumentsPerPulse": 30,
    "minimumConfidence": 0.72
  }
}
```

- [ ] **Step 4: Implement the parser and allowlist helpers**

Create `src/ingest/research/watchlist.ts`:

```ts
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

const assertStringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value.map((item, index) => assertString(item, `${label}[${index}]`));
};

export const normalizeHostname = (url: string): string => {
  const hostname = new URL(url).hostname.toLowerCase();
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
};

export const isAllowedResearchUrl = (url: string, allowedDomains: string[]): boolean => {
  const hostname = normalizeHostname(url);
  return allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
};

export const loadResearchWatchlist = (path = "data/research/watchlist.fi.json"): ResearchWatchlist => {
  const raw = JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8")) as Record<string, unknown>;
  const sourceKey = assertString(raw.sourceKey, "sourceKey");
  const sourceFamily = assertString(raw.sourceFamily, "sourceFamily");
  if (sourceKey !== "research_watch_pulse_fi" || sourceFamily !== "research_watch_pulse") {
    throw new Error("watchlist source identity is invalid");
  }

  const limits = raw.limits as Record<string, unknown> | undefined;
  if (!limits) {
    throw new Error("limits are required");
  }

  return {
    sourceKey,
    sourceFamily,
    checkedAt: assertString(raw.checkedAt, "checkedAt"),
    politicians: (raw.politicians as Array<Record<string, unknown>> | undefined ?? []).map((politician, index) => ({
      targetKey: assertString(politician.targetKey, `politicians[${index}].targetKey`),
      name: assertString(politician.name, `politicians[${index}].name`),
      partyKey: assertString(politician.partyKey, `politicians[${index}].partyKey`),
      keywords: assertStringArray(politician.keywords, `politicians[${index}].keywords`)
    })),
    officialDomains: assertStringArray(raw.officialDomains, "officialDomains"),
    articleDomains: assertStringArray(raw.articleDomains, "articleDomains"),
    partyDomains: assertStringArray(raw.partyDomains, "partyDomains"),
    seedUrls: (raw.seedUrls as Array<Record<string, unknown>> | undefined ?? []).map((seed, index) => {
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
      fetchTimeoutMs: Number(limits.fetchTimeoutMs),
      maxResponseBytes: Number(limits.maxResponseBytes),
      maxDocumentsPerPulse: Number(limits.maxDocumentsPerPulse),
      minimumConfidence: Number(limits.minimumConfidence)
    }
  };
};
```

- [ ] **Step 5: Run tests**

Run:

```powershell
pnpm test -- test/research-watchlist.test.ts
```

Expected:

```text
2 passed
```

- [ ] **Step 6: Commit**

```powershell
git add data/research/watchlist.fi.json src/ingest/research/watchlist.ts test/research-watchlist.test.ts
git commit -m "feat: add research watchlist"
```

---

## Task 3: Register Research Source And Scripts

**Files:**

- Modify: `package.json`
- Modify: `src/ingest/sources.ts`
- Modify: `src/ingest/adapters.ts`
- Test: `test/ingest.test.ts`

- [ ] **Step 1: Add a failing source registration test**

Append this test inside `describe("ingest", () => { ... })` in `test/ingest.test.ts`:

```ts
  it("lists the research watch pulse import source", async () => {
    const moderator = await authHeaders("research-source-mod", "moderator");

    const response = await request(app).get("/ops/import-sources").set(moderator).expect(200);

    expect(response.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceKey: "research_watch_pulse_fi",
          sourceFamily: "research_watch_pulse",
          label: "Research watch pulse FI"
        })
      ])
    );
  });
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
pnpm test -- test/ingest.test.ts -t "lists the research watch pulse import source"
```

Expected:

```text
expected [...] to equal ArrayContaining [...]
```

- [ ] **Step 3: Extend `src/ingest/sources.ts`**

Add `"research_watch_pulse_fi"` to `SupportedIngestSourceKey` and add this union member to `SupportedIngestSource`:

```ts
  | {
      sourceKey: "research_watch_pulse_fi";
      sourceFamily: "research_watch_pulse";
      path: string;
      ollamaUrl: string;
      ollamaModel: string;
    };
```

Add this entry to `OFFICIAL_INGEST_SOURCES`:

```ts
  research_watch_pulse_fi: {
    sourceKey: "research_watch_pulse_fi",
    sourceFamily: "research_watch_pulse",
    path: "data/research/watchlist.fi.json",
    ollamaUrl: process.env.OLLAMA_URL ?? "http://127.0.0.1:11434",
    ollamaModel: process.env.OLLAMA_MODEL ?? "llama3.1:8b"
  }
```

- [ ] **Step 4: Extend `listOfficialSourceSummaries` in `src/ingest/adapters.ts`**

Add the label branch:

```ts
        : source.sourceFamily === "research_watch_pulse"
          ? "Research watch pulse FI"
```

- [ ] **Step 5: Add the research pulse script to `package.json`**

Add:

```json
"research:pulse": "tsx src/ingest/cli.ts research_watch_pulse_fi"
```

- [ ] **Step 6: Run the source registration test**

Run:

```powershell
pnpm test -- test/ingest.test.ts -t "lists the research watch pulse import source"
```

Expected:

```text
1 passed
```

- [ ] **Step 7: Run typecheck**

Run:

```powershell
pnpm typecheck
```

Expected:

```text
Process exits 0
```

- [ ] **Step 8: Commit**

```powershell
git add package.json src/ingest/sources.ts src/ingest/adapters.ts test/ingest.test.ts
git commit -m "feat: register research pulse source"
```

---

## Task 4: Add Ollama Provider Adapter And Health CLI

**Files:**

- Modify: `package.json`
- Create: `src/ingest/research/ollama.ts`
- Create: `src/ingest/research/ollama-health.ts`
- Test: `test/research-ollama.test.ts`

- [ ] **Step 1: Write failing Ollama adapter tests**

Create `test/research-ollama.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import { generateOllamaJson, parseOllamaJsonResponse } from "../src/ingest/research/ollama.js";

describe("ollama research provider", () => {
  it("parses JSON from an Ollama response field", () => {
    expect(parseOllamaJsonResponse({ response: "{\"items\":[{\"ok\":true}]}" })).toEqual({ items: [{ ok: true }] });
  });

  it("rejects malformed model JSON", () => {
    expect(() => parseOllamaJsonResponse({ response: "not json" })).toThrow(/valid JSON/i);
  });

  it("posts JSON-only generation requests to the local provider", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ response: "{\"items\":[]}", done: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }) as unknown as typeof fetch;

    const result = await generateOllamaJson({
      endpoint: "http://127.0.0.1:11434",
      model: "llama3.1:8b",
      prompt: "Return JSON only.",
      timeoutMs: 1000,
      fetchImpl
    });

    expect(result).toEqual({ items: [] });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/generate",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })
    );
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run:

```powershell
pnpm test -- test/research-ollama.test.ts
```

Expected:

```text
Failed to resolve import "../src/ingest/research/ollama.js"
```

- [ ] **Step 3: Implement the adapter**

Create `src/ingest/research/ollama.ts`:

```ts
type FetchLike = typeof fetch;

export type GenerateOllamaJsonInput = {
  endpoint: string;
  model: string;
  prompt: string;
  timeoutMs: number;
  fetchImpl?: FetchLike;
};

export const parseOllamaJsonResponse = (payload: unknown): unknown => {
  const response = (payload as { response?: unknown }).response;
  if (typeof response !== "string" || response.trim() === "") {
    throw new Error("Ollama response field must be a non-empty string");
  }
  try {
    return JSON.parse(response);
  } catch {
    throw new Error("Ollama response did not contain valid JSON");
  }
};

export const generateOllamaJson = async ({
  endpoint,
  model,
  prompt,
  timeoutMs,
  fetchImpl = fetch
}: GenerateOllamaJsonInput): Promise<unknown> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${endpoint.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        format: "json",
        options: {
          temperature: 0.1
        }
      })
    });
    if (!response.ok) {
      throw new Error(`Ollama generation failed with HTTP ${response.status}`);
    }
    return parseOllamaJsonResponse(await response.json());
  } finally {
    clearTimeout(timeout);
  }
};
```

- [ ] **Step 4: Add a health CLI**

Create `src/ingest/research/ollama-health.ts`:

```ts
import { generateOllamaJson } from "./ollama.js";

const endpoint = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const model = process.env.OLLAMA_MODEL ?? "llama3.1:8b";

const result = await generateOllamaJson({
  endpoint,
  model,
  timeoutMs: 30_000,
  prompt: "Return JSON only with this exact shape: {\"ok\":true,\"purpose\":\"pnyx-research-health\"}"
});

console.log(JSON.stringify({ endpoint, model, result }, null, 2));
```

- [ ] **Step 5: Add the health script to `package.json`**

Add:

```json
"ollama:health": "tsx src/ingest/research/ollama-health.ts"
```

- [ ] **Step 6: Run adapter tests**

Run:

```powershell
pnpm test -- test/research-ollama.test.ts
```

Expected:

```text
3 passed
```

- [ ] **Step 7: Run local health check if Ollama is installed**

Run:

```powershell
pnpm ollama:health
```

Expected:

```json
{
  "endpoint": "http://127.0.0.1:11434",
  "model": "llama3.1:8b",
  "result": {
    "ok": true,
    "purpose": "pnyx-research-health"
  }
}
```

- [ ] **Step 8: Commit**

```powershell
git add package.json src/ingest/research/ollama.ts src/ingest/research/ollama-health.ts test/research-ollama.test.ts
git commit -m "feat: add local ollama research adapter"
```

---

## Task 5: Add Research Extraction Validation

**Files:**

- Create: `src/ingest/research/extraction.ts`
- Test: `test/research-pulse.test.ts`

- [ ] **Step 1: Write failing extraction validation tests**

Create `test/research-pulse.test.ts` with these initial tests:

```ts
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
```

- [ ] **Step 2: Run failing tests**

Run:

```powershell
pnpm test -- test/research-pulse.test.ts
```

Expected:

```text
Failed to resolve import "../src/ingest/research/extraction.js"
```

- [ ] **Step 3: Implement extraction helpers**

Create `src/ingest/research/extraction.ts`:

```ts
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
    "Return shape: {\"candidates\":[{\"candidateType\":\"politician_statement\",\"person\":\"Name\",\"partyKey\":null,\"issue\":null,\"claimText\":\"...\",\"sourceUrl\":\"...\",\"sourceType\":\"official\",\"publishedAt\":\"YYYY-MM-DD\",\"evidenceQuote\":\"...\",\"confidence\":0.82,\"needsOfficialConfirmation\":false}]}",
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
```

- [ ] **Step 4: Run tests**

Run:

```powershell
pnpm test -- test/research-pulse.test.ts
```

Expected:

```text
3 passed
```

- [ ] **Step 5: Commit**

```powershell
git add src/ingest/research/extraction.ts test/research-pulse.test.ts
git commit -m "feat: validate research extractions"
```

---

## Task 6: Add Stage Type And Needs-Source Status

**Files:**

- Create: `migrations/0016_research_watch_pulse.sql`
- Modify: `src/db/ingest.ts`
- Modify: `frontend/src/types.ts`
- Test: `test/ingest.test.ts`

- [ ] **Step 1: Add a failing database stage type test**

Append this test to `test/ingest.test.ts`:

```ts
  it("stores politician statement stage items and marks candidates as needing source", () => {
    const runId = db
      .prepare("INSERT INTO ingest_runs (source_family, source_key, triggered_by) VALUES (?, ?, ?)")
      .run("research_watch_pulse", "research_watch_pulse_fi", "test").lastInsertRowid as number;
    const rawRecordId = addRawRecord({
      runId,
      sourceFamily: "research_watch_pulse",
      sourceKey: "research_watch_pulse_fi",
      recordType: "politician_statement",
      sourceRecordKey: "statement-1",
      sourceUrl: "https://valtioneuvosto.fi/example",
      payload: { ok: true }
    });

    const stageItemId = addStageItem({
      runId,
      rawRecordId,
      stageType: "politician_statement",
      sourceKey: "research_watch_pulse_fi",
      dedupeKey: "research:statement-1",
      normalized: {
        politicianName: "Petteri Orpo",
        statementText: "The government will reduce debt.",
        sourceUrl: "https://valtioneuvosto.fi/example",
        dateSaid: "2026-05-16",
        reviewStatus: "pending"
      }
    });

    expect(getIngestStageItemById(stageItemId)?.stageType).toBe("politician_statement");
  });
```

- [ ] **Step 2: Run failing test**

Run:

```powershell
pnpm test -- test/ingest.test.ts -t "stores politician statement stage items"
```

Expected:

```text
CHECK constraint failed
```

- [ ] **Step 3: Add migration `0016_research_watch_pulse.sql`**

Create:

```sql
DROP INDEX IF EXISTS idx_ingest_stage_items_run;
DROP INDEX IF EXISTS idx_ingest_stage_items_status;

ALTER TABLE ingest_stage_items RENAME TO ingest_stage_items_old;

CREATE TABLE ingest_stage_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  raw_record_id INTEGER NOT NULL,
  stage_type TEXT NOT NULL CHECK(stage_type IN ('party_stance', 'vote_event', 'vote_record', 'coverage_party_target', 'coverage_politician_target', 'canonical_promise', 'fulfillment_assessment', 'party_alignment', 'politician_statement')),
  source_key TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  normalized_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'applied', 'rejected', 'failed', 'needs_source')),
  applied_entity_kind TEXT,
  applied_entity_id TEXT,
  decided_by TEXT,
  decided_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (run_id) REFERENCES ingest_runs(id),
  FOREIGN KEY (raw_record_id) REFERENCES ingest_raw_records(id),
  UNIQUE(run_id, source_key, dedupe_key)
);

INSERT INTO ingest_stage_items
  (id, run_id, raw_record_id, stage_type, source_key, dedupe_key, normalized_json, status,
   applied_entity_kind, applied_entity_id, decided_by, decided_at, error_message, created_at, updated_at)
SELECT id, run_id, raw_record_id, stage_type, source_key, dedupe_key, normalized_json, status,
       applied_entity_kind, applied_entity_id, decided_by, decided_at, error_message, created_at, updated_at
FROM ingest_stage_items_old;

DROP TABLE ingest_stage_items_old;

CREATE INDEX IF NOT EXISTS idx_ingest_stage_items_run
ON ingest_stage_items(run_id, status, id DESC);

CREATE INDEX IF NOT EXISTS idx_ingest_stage_items_status
ON ingest_stage_items(stage_type, status, created_at DESC, id DESC);
```

- [ ] **Step 4: Update backend ingest types**

In `src/db/ingest.ts`, add `"politician_statement"` to `IngestStageItemRow["stageType"]` and add `"needs_source"` to `IngestStageItemRow["status"]`.

Add this function:

```ts
export const markIngestStageItemNeedsSource = (stageItemId: number, actorId: string): void => {
  const stageItem = getIngestStageItemById(stageItemId);
  if (!stageItem) {
    throw new Error("stage item not found");
  }
  if (stageItem.status !== "pending") {
    throw new Error("stage item is not pending");
  }

  updateIngestStageItem(stageItemId, {
    status: "needs_source",
    decidedBy: actorId,
    decidedAt: new Date().toISOString(),
    errorMessage: "Needs stronger source confirmation before publication"
  });
};
```

- [ ] **Step 5: Update frontend ingest unions**

In `frontend/src/types.ts`, change `IngestStageItemRecord.stageType` to:

```ts
  stageType:
    | "party_stance"
    | "vote_event"
    | "vote_record"
    | "coverage_party_target"
    | "coverage_politician_target"
    | "canonical_promise"
    | "fulfillment_assessment"
    | "party_alignment"
    | "politician_statement";
```

Change `IngestStageItemRecord.status` to:

```ts
  status: "pending" | "applied" | "rejected" | "failed" | "needs_source";
```

- [ ] **Step 6: Run migration and targeted test**

Run:

```powershell
pnpm migrate
pnpm test -- test/ingest.test.ts -t "stores politician statement stage items"
```

Expected:

```text
1 passed
```

- [ ] **Step 7: Commit**

```powershell
git add migrations/0016_research_watch_pulse.sql src/db/ingest.ts frontend/src/types.ts test/ingest.test.ts
git commit -m "feat: extend ingest stage review states"
```

---

## Task 7: Implement Research Pulse Fetch, Raw Storage, And Staging

**Files:**

- Create: `src/ingest/research/documents.ts`
- Create: `src/ingest/research/pulse.ts`
- Modify: `src/ingest/adapters.ts`
- Test: `test/research-pulse.test.ts`

- [ ] **Step 1: Add failing pulse staging test**

Append to `test/research-pulse.test.ts`:

```ts
import { beforeEach, vi } from "vitest";
import { db } from "../src/db/client.js";
import { runResearchWatchPulse } from "../src/ingest/research/pulse.js";

beforeEach(() => {
  db.exec("DELETE FROM ingest_stage_items");
  db.exec("DELETE FROM ingest_raw_records");
  db.exec("DELETE FROM ingest_runs");
});

describe("research pulse run", () => {
  it("stores raw documents before staging local LLM candidates", async () => {
    const fetchImpl = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/api/generate")) {
        return new Response(
          JSON.stringify({
            response: JSON.stringify({
              candidates: [
                {
                  candidateType: "politician_statement",
                  person: "Petteri Orpo",
                  partyKey: null,
                  issue: null,
                  claimText: "The government will reduce debt.",
                  sourceUrl: "https://valtioneuvosto.fi/en/governments/government-programme",
                  sourceType: "official",
                  publishedAt: "2026-05-16",
                  evidenceQuote: "The government will reduce debt.",
                  confidence: 0.91,
                  needsOfficialConfirmation: false
                }
              ]
            })
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        "<html><head><title>Government programme</title></head><body><main>The government will reduce debt.</main></body></html>",
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    }) as unknown as typeof fetch;

    const result = await runResearchWatchPulse({
      sourceKey: "research_watch_pulse_fi",
      watchlistPath: "data/research/watchlist.fi.json",
      triggeredBy: "test",
      ollamaEndpoint: "http://127.0.0.1:11434",
      ollamaModel: "llama3.1:8b",
      fetchImpl
    });

    expect(result.fetchedCount).toBeGreaterThan(0);
    expect(result.stagedCount).toBe(1);
    expect(Number(db.prepare("SELECT COUNT(*) FROM ingest_raw_records").pluck().get())).toBeGreaterThan(0);
    expect(Number(db.prepare("SELECT COUNT(*) FROM ingest_stage_items WHERE stage_type = 'politician_statement'").pluck().get())).toBe(1);
    expect(Number(db.prepare("SELECT COUNT(*) FROM statements").pluck().get())).toBe(0);
  });
});
```

- [ ] **Step 2: Run failing pulse test**

Run:

```powershell
pnpm test -- test/research-pulse.test.ts -t "stores raw documents"
```

Expected:

```text
Failed to resolve import "../src/ingest/research/pulse.js"
```

- [ ] **Step 3: Add document cleaning helpers**

Create `src/ingest/research/documents.ts`:

```ts
import type { ResearchSourceTier } from "./watchlist.js";

export type ResearchSourceDocument = {
  sourceUrl: string;
  sourceTier: ResearchSourceTier;
  title: string;
  text: string;
  fetchedAt: string;
};

const stripHtml = (html: string): string => {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const extractTitle = (html: string): string => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(match[1]) : "Untitled source";
};

export const documentFromResponseText = (input: {
  sourceUrl: string;
  sourceTier: ResearchSourceTier;
  responseText: string;
  fetchedAt: string;
}): ResearchSourceDocument => {
  return {
    sourceUrl: input.sourceUrl,
    sourceTier: input.sourceTier,
    title: extractTitle(input.responseText),
    text: stripHtml(input.responseText).slice(0, 40_000),
    fetchedAt: input.fetchedAt
  };
};
```

- [ ] **Step 4: Add pulse orchestration**

Create `src/ingest/research/pulse.ts`:

```ts
import { addRawRecord, addStageItem, createIngestRun, markIngestRunStatus } from "../../db/ingest.js";
import { buildResearchPrompt, normalizeResearchCandidates, researchCandidateDedupeKey } from "./extraction.js";
import { documentFromResponseText } from "./documents.js";
import { generateOllamaJson } from "./ollama.js";
import { isAllowedResearchUrl, loadResearchWatchlist } from "./watchlist.js";

type FetchLike = typeof fetch;

export type RunResearchWatchPulseInput = {
  sourceKey: "research_watch_pulse_fi";
  watchlistPath: string;
  triggeredBy: string;
  ollamaEndpoint: string;
  ollamaModel: string;
  fetchImpl?: FetchLike;
};

export const runResearchWatchPulse = async ({
  sourceKey,
  watchlistPath,
  triggeredBy,
  ollamaEndpoint,
  ollamaModel,
  fetchImpl = fetch
}: RunResearchWatchPulseInput): Promise<{ runId: number; fetchedCount: number; stagedCount: number }> => {
  const watchlist = loadResearchWatchlist(watchlistPath);
  const allowedDomains = [...watchlist.officialDomains, ...watchlist.articleDomains, ...watchlist.partyDomains];
  const runId = createIngestRun({
    sourceFamily: "research_watch_pulse",
    sourceKey,
    sourceUrl: null,
    triggeredBy
  });

  let fetchedCount = 0;
  let stagedCount = 0;

  for (const seed of watchlist.seedUrls.slice(0, watchlist.limits.maxDocumentsPerPulse)) {
    if (!isAllowedResearchUrl(seed.url, allowedDomains)) {
      continue;
    }

    const response = await fetchImpl(seed.url, { headers: { "user-agent": "PNYX research watch pulse" } });
    if (!response.ok) {
      continue;
    }
    const fetchedAt = new Date().toISOString();
    const document = documentFromResponseText({
      sourceUrl: seed.url,
      sourceTier: seed.sourceTier,
      responseText: await response.text(),
      fetchedAt
    });

    const rawRecordId = addRawRecord({
      runId,
      sourceFamily: "research_watch_pulse",
      sourceKey,
      recordType: "source_document",
      sourceRecordKey: seed.url,
      sourceUrl: seed.url,
      payload: {
        ...document,
        topic: seed.topic
      }
    });
    fetchedCount += 1;

    const extraction = await generateOllamaJson({
      endpoint: ollamaEndpoint,
      model: ollamaModel,
      timeoutMs: 30_000,
      fetchImpl,
      prompt: buildResearchPrompt({
        title: document.title,
        url: document.sourceUrl,
        sourceTier: document.sourceTier,
        text: document.text
      })
    });

    for (const candidate of normalizeResearchCandidates(extraction, watchlist.limits.minimumConfidence)) {
      const dedupeKey = researchCandidateDedupeKey(candidate);
      const stageType = candidate.candidateType;
      addStageItem({
        runId,
        rawRecordId,
        stageType,
        sourceKey,
        dedupeKey,
        normalized: {
          ...candidate,
          reviewStatus: "pending",
          llmModel: ollamaModel,
          sourceTitle: document.title,
          sourceFetchedAt: fetchedAt
        }
      });
      stagedCount += 1;
    }
  }

  markIngestRunStatus(runId, {
    status: stagedCount > 0 ? "staged" : fetchedCount > 0 ? "fetched" : "pending",
    fetchedCount,
    stagedCount
  });
  return { runId, fetchedCount, stagedCount };
};
```

- [ ] **Step 5: Dispatch research source from adapters**

In `src/ingest/adapters.ts`, import:

```ts
import { runResearchWatchPulse } from "./research/pulse.js";
```

In `runOfficialSourceImport`, before existing source-family branches, add:

```ts
    if (config.sourceFamily === "research_watch_pulse") {
      const result = await runResearchWatchPulse({
        sourceKey: config.sourceKey,
        watchlistPath: config.path,
        triggeredBy,
        ollamaEndpoint: config.ollamaUrl,
        ollamaModel: config.ollamaModel,
        fetchImpl
      });
      markIngestRunStatus(result.runId, {
        status: result.stagedCount > 0 ? "staged" : result.fetchedCount > 0 ? "fetched" : "pending",
        fetchedCount: result.fetchedCount,
        stagedCount: result.stagedCount
      });
      return { runId: result.runId };
    }
```

Keep the existing `createIngestRun` path for all other source families.

- [ ] **Step 6: Run pulse tests**

Run:

```powershell
pnpm test -- test/research-pulse.test.ts
```

Expected:

```text
4 passed
```

- [ ] **Step 7: Run ingest source tests**

Run:

```powershell
pnpm test -- test/ingest.test.ts -t "research watch pulse|lists the research"
```

Expected:

```text
2 passed
```

- [ ] **Step 8: Commit**

```powershell
git add src/ingest/research/documents.ts src/ingest/research/pulse.ts src/ingest/adapters.ts test/research-pulse.test.ts
git commit -m "feat: stage research pulse candidates"
```

---

## Task 8: Apply Politician Statement Stage Items

**Files:**

- Modify: `src/ingest/apply.ts`
- Test: `test/ingest.test.ts`

- [ ] **Step 1: Add a failing apply test**

Append to `test/ingest.test.ts`:

```ts
  it("applies reviewed politician statement stage items without auto-applying during staging", () => {
    db.prepare(
      "INSERT INTO politicians (name, region, office, external_id, verified, created_by) VALUES (?, ?, ?, ?, 1, ?)"
    ).run("Petteri Orpo", "Uusimaa", "Prime Minister", "petteri-orpo", "system");
    const politicianId = db.prepare("SELECT id FROM politicians WHERE name = ?").pluck().get("Petteri Orpo") as number;
    const runId = db
      .prepare("INSERT INTO ingest_runs (source_family, source_key, triggered_by) VALUES (?, ?, ?)")
      .run("research_watch_pulse", "research_watch_pulse_fi", "test").lastInsertRowid as number;
    const rawRecordId = addRawRecord({
      runId,
      sourceFamily: "research_watch_pulse",
      sourceKey: "research_watch_pulse_fi",
      recordType: "politician_statement",
      sourceRecordKey: "statement-apply-1",
      sourceUrl: "https://valtioneuvosto.fi/example",
      payload: { ok: true }
    });
    const stageItemId = addStageItem({
      runId,
      rawRecordId,
      stageType: "politician_statement",
      sourceKey: "research_watch_pulse_fi",
      dedupeKey: "research:statement-apply-1",
      normalized: {
        politicianId,
        politicianName: "Petteri Orpo",
        statementText: "The government will reduce debt.",
        sourceUrl: "https://valtioneuvosto.fi/example",
        dateSaid: "2026-05-16",
        reviewStatus: "reviewed"
      }
    });

    expect(Number(db.prepare("SELECT COUNT(*) FROM statements").pluck().get())).toBe(0);

    const result = applyIngestStageItem(stageItemId, "moderator");

    expect(result.entityKind).toBe("statement");
    expect(Number(db.prepare("SELECT COUNT(*) FROM statements WHERE verification_status = 'verified'").pluck().get())).toBe(1);
  });
```

- [ ] **Step 2: Run the failing apply test**

Run:

```powershell
pnpm test -- test/ingest.test.ts -t "applies reviewed politician statement"
```

Expected:

```text
politician statement stage type is not handled
```

If the actual failure is a party stance validation error, that also confirms the new branch is missing.

- [ ] **Step 3: Add statement apply branch**

In `src/ingest/apply.ts`, import `crypto`:

```ts
import crypto from "node:crypto";
```

Add this type near other stage types:

```ts
type PoliticianStatementStage = {
  politicianId?: number;
  politicianName: string;
  statementText: string;
  sourceUrl: string;
  dateSaid: string;
  reviewStatus: string;
};
```

Inside `applyIngestStageItem`, before the final party stance fallback, add:

```ts
    if (stageItem.stageType === "politician_statement") {
      const normalized = parseJson<PoliticianStatementStage>(stageItem.normalizedJson);
      if (normalized.reviewStatus !== "reviewed") {
        throw new Error("politician statement must be reviewed before apply");
      }
      if (!normalized.statementText.trim() || !normalized.sourceUrl.trim() || !normalized.dateSaid.trim()) {
        throw new Error("politician statement requires statementText, sourceUrl, and dateSaid");
      }

      const politician = normalized.politicianId
        ? (db
            .prepare("SELECT id FROM politicians WHERE id = ? AND deleted_at IS NULL LIMIT 1")
            .get(normalized.politicianId) as { id: number } | undefined)
        : (db
            .prepare("SELECT id FROM politicians WHERE name = ? AND deleted_at IS NULL LIMIT 1")
            .get(normalized.politicianName.trim()) as { id: number } | undefined);
      if (!politician) {
        throw new Error("politician statement requires an existing politician");
      }

      const normalizedBodyHash = crypto.createHash("sha256").update(normalized.statementText.trim().toLowerCase()).digest("hex");
      const statementFingerprint = crypto
        .createHash("sha256")
        .update(`${politician.id}|${normalizedBodyHash}|${normalized.sourceUrl.trim()}`)
        .digest("hex");
      const existing = db
        .prepare("SELECT id FROM statements WHERE statement_fingerprint = ? AND deleted_at IS NULL LIMIT 1")
        .get(statementFingerprint) as { id: number } | undefined;
      const statementId =
        existing?.id ??
        (db
          .prepare(
            "INSERT INTO statements (politician_id, source_url, body, date_said, normalized_body_hash, statement_fingerprint, verification_status, author_id) VALUES (?, ?, ?, ?, ?, ?, 'verified', ?)"
          )
          .run(
            politician.id,
            normalized.sourceUrl.trim(),
            normalized.statementText.trim(),
            normalized.dateSaid.trim(),
            normalizedBodyHash,
            statementFingerprint,
            actorId
          ).lastInsertRowid as number);

      updateIngestStageItem(stageItemId, {
        status: "applied",
        appliedEntityKind: "statement",
        appliedEntityId: String(statementId),
        decidedBy: actorId,
        decidedAt: new Date().toISOString(),
        errorMessage: null
      });
      return { entityKind: "statement", entityId: String(statementId) };
    }
```

- [ ] **Step 4: Run apply test**

Run:

```powershell
pnpm test -- test/ingest.test.ts -t "applies reviewed politician statement"
```

Expected:

```text
1 passed
```

- [ ] **Step 5: Run full ingest tests**

Run:

```powershell
pnpm test -- test/ingest.test.ts
```

Expected:

```text
All tests pass
```

- [ ] **Step 6: Commit**

```powershell
git add src/ingest/apply.ts test/ingest.test.ts
git commit -m "feat: apply reviewed politician statements"
```

---

## Task 9: Add Needs-Source API And Ops UI Action

**Files:**

- Modify: `src/server.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/routes/OpsImportsPage.tsx`
- Test: `test/ingest.test.ts`

- [ ] **Step 1: Add failing API test**

Append to `test/ingest.test.ts`:

```ts
  it("lets moderators mark research stage items as needing stronger source confirmation", async () => {
    const runId = db
      .prepare("INSERT INTO ingest_runs (source_family, source_key, triggered_by) VALUES (?, ?, ?)")
      .run("research_watch_pulse", "research_watch_pulse_fi", "test").lastInsertRowid as number;
    const rawRecordId = addRawRecord({
      runId,
      sourceFamily: "research_watch_pulse",
      sourceKey: "research_watch_pulse_fi",
      recordType: "fulfillment_assessment",
      sourceRecordKey: "needs-source-1",
      sourceUrl: "https://yle.fi/a/74-20000000",
      payload: { ok: true }
    });
    const stageItemId = addStageItem({
      runId,
      rawRecordId,
      stageType: "fulfillment_assessment",
      sourceKey: "research_watch_pulse_fi",
      dedupeKey: "research:needs-source-1",
      normalized: {
        status: "in_progress",
        summary: "Article-only fulfillment signal.",
        sourceUrl: "https://yle.fi/a/74-20000000",
        sourceNote: "Article source",
        evidenceDate: "2026-05-16",
        reviewStatus: "pending",
        needsOfficialConfirmation: true
      }
    });
    const moderator = await authHeaders("needs-source-mod", "moderator");

    await request(app).post(`/ops/stage-items/${stageItemId}/needs-source`).set(moderator).expect(200);

    expect(getIngestStageItemById(stageItemId)?.status).toBe("needs_source");
  });
```

- [ ] **Step 2: Run failing API test**

Run:

```powershell
pnpm test -- test/ingest.test.ts -t "needing stronger source"
```

Expected:

```text
404
```

- [ ] **Step 3: Add backend route**

In `src/server.ts`, add `markIngestStageItemNeedsSource` to the ingest import from `./db/ingest.js`.

Add route after the reject route:

```ts
app.post("/ops/stage-items/:id/needs-source", requireRole("moderator"), ingestStageRejectLimiter, (req, res) => {
  const stageItemId = Number(req.params.id);
  if (!Number.isInteger(stageItemId) || stageItemId <= 0) {
    res.status(400).json({ error: "invalid stage item id" });
    return;
  }

  const stageItem = getIngestStageItemById(stageItemId);
  if (!stageItem) {
    res.status(404).json({ error: "stage item not found" });
    return;
  }

  try {
    markIngestStageItemNeedsSource(stageItemId, req.auth.userId ?? "moderation");
    refreshIngestRunCounts(stageItem.runId);
    res.json({ ok: true });
  } catch (err) {
    res.status(409).json({ error: (err as Error).message || "unable to mark stage item as needing source" });
  }
});
```

- [ ] **Step 4: Add frontend API helper**

In `frontend/src/lib/api.ts`, add:

```ts
export const markIngestStageItemNeedsSource = async (token: string, stageItemId: number): Promise<{ ok: true }> => {
  return fetchJson<{ ok: true }>(`/ops/stage-items/${stageItemId}/needs-source`, {
    method: "POST",
    token
  });
};
```

- [ ] **Step 5: Add UI action and metadata display**

In `frontend/src/routes/OpsImportsPage.tsx`, import `markIngestStageItemNeedsSource`.

Inside the stage item card, after the normalized JSON `<pre>`, add:

```tsx
                  {"sourceType" in item.normalized || "confidence" in item.normalized || "needsOfficialConfirmation" in item.normalized ? (
                    <div className="metadata-grid">
                      {"sourceType" in item.normalized ? <p className="meta-line">Source tier: {String(item.normalized.sourceType)}</p> : null}
                      {"confidence" in item.normalized ? <p className="meta-line">Confidence: {String(item.normalized.confidence)}</p> : null}
                      {"needsOfficialConfirmation" in item.normalized ? (
                        <p className="meta-line">Official confirmation: {item.normalized.needsOfficialConfirmation ? "Needed" : "Not flagged"}</p>
                      ) : null}
                    </div>
                  ) : null}
```

Inside the pending button group, after "Reject staged item", add:

```tsx
                        <button
                          className="button button-secondary"
                          type="button"
                          disabled={submitting}
                          onClick={() =>
                            void runAction(async () => {
                              await markIngestStageItemNeedsSource(session.token, item.id);
                            }, `Marked stage item #${item.id} as needing stronger source confirmation.`)
                          }
                        >
                          Needs source
                        </button>
```

- [ ] **Step 6: Run backend API test**

Run:

```powershell
pnpm test -- test/ingest.test.ts -t "needing stronger source"
```

Expected:

```text
1 passed
```

- [ ] **Step 7: Run frontend typecheck**

Run:

```powershell
pnpm frontend:typecheck
```

Expected:

```text
Process exits 0
```

- [ ] **Step 8: Commit**

```powershell
git add src/server.ts frontend/src/lib/api.ts frontend/src/routes/OpsImportsPage.tsx test/ingest.test.ts
git commit -m "feat: add research needs-source review action"
```

---

## Task 10: Verify End-To-End Research Pulse And Document Setup

**Files:**

- Modify: `docs/superpowers/specs/2026-05-16-research-watch-pulse-design.md`
- Modify: `docs/repo/truth.md`
- Modify: `docs/quality/verification.md`

- [ ] **Step 1: Add docs entries**

In `docs/superpowers/specs/2026-05-16-research-watch-pulse-design.md`, add under "Implementation Phases":

```markdown
Implementation plan: `docs/superpowers/plans/2026-05-16-research-watch-pulse-implementation.md`.
```

In `docs/repo/truth.md`, add under "Important commands":

```markdown
- `pnpm research:pulse`: run the local research watch pulse through the ingest CLI.
- `pnpm ollama:health`: verify the local Ollama endpoint and extraction model.
```

In `docs/quality/verification.md`, add under "Standard proof commands":

```markdown
- Research pulse proof: `pnpm test -- test/research-watchlist.test.ts test/research-ollama.test.ts test/research-pulse.test.ts test/ingest.test.ts`
- Local Ollama health, when Ollama is installed: `pnpm ollama:health`
```

- [ ] **Step 2: Run backend and research tests**

Run:

```powershell
pnpm test -- test/research-watchlist.test.ts test/research-ollama.test.ts test/research-pulse.test.ts test/ingest.test.ts
```

Expected:

```text
All listed test files pass
```

- [ ] **Step 3: Run typechecks**

Run:

```powershell
pnpm typecheck
pnpm frontend:typecheck
```

Expected:

```text
Both commands exit 0
```

- [ ] **Step 4: Run docs check**

Run:

```powershell
pnpm docs:check
```

Expected:

```text
Generated API reference is current.
Markdown harness check passed
```

- [ ] **Step 5: Run local Ollama health if installed**

Run:

```powershell
pnpm ollama:health
```

Expected:

```json
{
  "endpoint": "http://127.0.0.1:11434",
  "model": "llama3.1:8b",
  "result": {
    "ok": true,
    "purpose": "pnyx-research-health"
  }
}
```

- [ ] **Step 6: Run a manual pulse dry run**

Run:

```powershell
pnpm research:pulse
```

Expected:

```text
The command creates one ingest run for sourceKey research_watch_pulse_fi and exits 0.
```

Then inspect:

```powershell
pnpm dev
```

Open `/ops/imports` as a moderator/admin and confirm the newest run shows fetched raw records and pending research candidates, or a fetched run with no candidates if the source text produced no qualifying extraction.

- [ ] **Step 7: Commit docs and verification updates**

```powershell
git add docs/superpowers/specs/2026-05-16-research-watch-pulse-design.md docs/repo/truth.md docs/quality/verification.md
git commit -m "docs: document research pulse operations"
```

---

## Final Verification

Run:

```powershell
pnpm test -- test/research-watchlist.test.ts test/research-ollama.test.ts test/research-pulse.test.ts test/ingest.test.ts
pnpm typecheck
pnpm frontend:typecheck
pnpm docs:check
```

Expected:

```text
All commands exit 0.
```

If Ollama is installed and `llama3.1:8b` is pulled, also run:

```powershell
pnpm ollama:health
pnpm research:pulse
```

Expected:

```text
Ollama health returns JSON with ok=true, and research:pulse creates a research_watch_pulse_fi ingest run without auto-publishing canonical records.
```

## Self-Review Notes

Spec coverage:

- Hybrid official/article source policy is covered by Task 2 watchlist and Task 7 pulse source handling.
- Ollama download, install, initialization, health check, and dry run are covered by Task 1 and Task 4.
- Strict JSON extraction and validation are covered by Task 4 and Task 5.
- Raw provenance before LLM processing is covered by Task 7.
- Staging for party stances, promises, statements, and fulfillment is covered by Task 5 through Task 8.
- Admin-only review and no auto-publication are covered by Task 8, Task 9, and final verification.
- Ops source-tier and confidence visibility is covered by Task 9.

The plan is ready for task-by-task execution.

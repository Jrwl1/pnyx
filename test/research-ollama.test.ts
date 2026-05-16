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

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

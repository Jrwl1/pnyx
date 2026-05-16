import { generateOllamaJson } from "./ollama.js";

const endpoint = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const model = process.env.OLLAMA_MODEL ?? "llama3.1:8b";

const run = async (): Promise<void> => {
  const result = await generateOllamaJson({
    endpoint,
    model,
    prompt: "Return JSON only: {\"ok\":true,\"purpose\":\"pnyx-research-health\"}",
    timeoutMs: 30_000
  });

  console.log(JSON.stringify({ endpoint, model, result }, null, 2));
};

run().catch((err) => {
  console.error(
    JSON.stringify(
      {
        endpoint,
        model,
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});

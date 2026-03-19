// WHAT IT DO? Runs one supported official ingest source from the command line for repeatable operator replay.

import { runOfficialSourceImport } from "./adapters.js";
import type { SupportedIngestSourceKey } from "./sources.js";

const sourceKey = process.argv[2] as SupportedIngestSourceKey | undefined;
if (!sourceKey) {
  console.error("Usage: pnpm ingest:run <sourceKey>");
  process.exit(1);
}

const triggeredBy = process.env.INGEST_TRIGGERED_BY ?? "cli";

runOfficialSourceImport(sourceKey, triggeredBy)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error((err as Error).message);
    process.exit(1);
  });

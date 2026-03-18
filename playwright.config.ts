import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { defineConfig } from "@playwright/test";

const backendPort = 4311;
const frontendPort = 4312;
const dbPath = path.join(os.tmpdir(), "pnyx-playwright-ui.db");
try {
  fs.rmSync(dbPath, { force: true });
} catch {
  // Best-effort cleanup before the run.
}

process.env.PLAYWRIGHT_UI_DB_PATH = dbPath;
process.env.PLAYWRIGHT_UI_FRONTEND = `http://127.0.0.1:${frontendPort}`;

export default defineConfig({
  testDir: "./test/playwright",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  use:
    process.platform === "win32"
      ? {
          baseURL: `http://127.0.0.1:${frontendPort}`,
          headless: true,
          launchOptions: {
            executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
          }
        }
      : {
          baseURL: `http://127.0.0.1:${frontendPort}`,
          headless: true
        },
  webServer: [
    {
      command: "pnpm exec tsx src/index.ts",
      url: `http://127.0.0.1:${backendPort}/health`,
      reuseExistingServer: false,
      cwd: ".",
      env: {
        ...process.env,
        PORT: String(backendPort),
        DB_PATH: dbPath,
        JWT_SECRET: "ui-test-jwt-secret",
        AUTH_CODE_SECRET: "ui-test-auth-code-secret",
        AUTH_EMAIL_PROVIDER: "inline",
        NODE_ENV: "development"
      }
    },
    {
      command: `pnpm --filter pnyx-frontend-v3 dev --host 127.0.0.1 --port ${frontendPort}`,
      url: `http://127.0.0.1:${frontendPort}`,
      reuseExistingServer: false,
      cwd: ".",
      env: {
        ...process.env,
        VITE_BACKEND_URL: `http://127.0.0.1:${backendPort}`
      }
    }
  ]
});

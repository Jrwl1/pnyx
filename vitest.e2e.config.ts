// WHAT IT DO? Vitest config for e2e tests (placeholder until S0-T11).
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["test/**/*.e2e.test.ts"],
  },
});

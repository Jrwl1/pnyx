// WHAT IT DO? Vitest config for unit/integration tests.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./test/setup.ts", "./test/setup-migrate.ts"],
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
  },
});

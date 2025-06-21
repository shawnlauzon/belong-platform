import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from integration test directory
config({ path: resolve(__dirname, "tests/integration/.env") });

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["tests/integration/database/setup.ts"],
    globals: true,
    testTimeout: 20000, // 20 seconds to match hook readiness timeouts
    // Run integration tests sequentially to avoid conflicts
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});

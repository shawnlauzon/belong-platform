import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from root directory
config({ path: resolve(__dirname, ".env") });

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["tests/integration/database/setup.ts"],
    globals: true,
    testTimeout: 30000, // 30 seconds to match hook readiness timeouts
    hookTimeout: 30000, // 30 seconds for renderHook timeouts
    silent: true, // Run silently by default to reduce noise
    // Run integration tests sequentially to avoid conflicts
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});

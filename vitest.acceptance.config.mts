import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from root directory
config({ path: resolve(__dirname, ".env") });

export default defineConfig({
  test: {
    include: ["tests/acceptance/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    silent: process.env.VITEST_VERBOSE !== "true",
    // Run acceptance tests sequentially to avoid conflicts
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
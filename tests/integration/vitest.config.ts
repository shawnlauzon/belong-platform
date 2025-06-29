import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from root directory
config({ path: resolve(__dirname, "../../.env.local") });

export default defineConfig({
  root: resolve(__dirname, "../../"),
  test: {
    include: ["tests/integration/**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/setup/**",
      "**/*.backup/**",
      "**/integration-backup/**",
      "**/acceptance/**",
      "**/npm-package/**",
      "**/customer-webapp/**",
      "packages/**",
    ],
    environment: "jsdom",
    setupFiles: ["tests/integration/setup/test-environment.ts"],
    globals: true,
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 30000,
    // Run tests sequentially to avoid database conflicts
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Silent by default, can be overridden with VITEST_VERBOSE=true
    silent: process.env.VITEST_VERBOSE !== "true",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "../../"),
      "@tests": resolve(__dirname, "../"),
    },
  },
});

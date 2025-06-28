import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 120000, // 2 minutes for acceptance tests
    hookTimeout: 120000,
    // No setupFiles - acceptance tests should be self-contained
  },
});
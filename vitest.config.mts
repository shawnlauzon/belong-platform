import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/integration/setup.ts"],
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || "",
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || "",
      VITE_MAPBOX_PUBLIC_TOKEN: process.env.VITE_MAPBOX_PUBLIC_TOKEN || "",
    },
  },
  resolve: {
    alias: {
      "@belongnetwork/api": "./packages/api/src",
      "@belongnetwork/components": "./packages/components/src",
      "@belongnetwork/core": "./packages/core/src",
      "@belongnetwork/types": "./packages/types/src",
    },
  },
});

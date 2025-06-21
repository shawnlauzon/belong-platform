import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { resolve } from "path";
import { faker } from "@faker-js/faker";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    env: {
      VITE_MAPBOX_PUBLIC_TOKEN: faker.string.alphanumeric(32),
      VITE_SUPABASE_URL: `https://${faker.string.alphanumeric(8).toLowerCase()}.supabase.co`,
      VITE_SUPABASE_ANON_KEY: faker.internet.jwt(),
    },
    coverage: {
      reporter: ["text", "json", "html"],
    },
    // Ensure setup file is run before any tests
    sequence: {
      setupFiles: "list",
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});

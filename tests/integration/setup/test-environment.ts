// Verify required environment variables are set
const requiredEnvVars = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_MAPBOX_PUBLIC_TOKEN",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(
      `Missing required environment variable: ${envVar}. Please check your .env file in the root directory`,
    );
  }
}

// Set up global test utilities
import "@testing-library/jest-dom";
import { beforeEach, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Clean up React components after each test
afterEach(() => {
  cleanup();
});

// Global test configuration
beforeEach(() => {
  // Reset any global state before each test
  if (typeof window !== "undefined") {
    window.localStorage.clear();
    window.sessionStorage.clear();
  }
});
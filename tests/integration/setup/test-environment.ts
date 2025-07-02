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
import { beforeEach, afterEach, beforeAll, afterAll } from "vitest";
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

// Global database cleanup configuration
let globalCleanupHelper: any;

beforeAll(async () => {
  // Initialize cleanup helper
  try {
    const { cleanupHelper } = await import("../helpers/cleanup-patterns");
    globalCleanupHelper = cleanupHelper;
    
    // Ensure clean state at start of test suite
    await globalCleanupHelper.ensureTestIsolation();
    
    console.log('🚀 Test environment initialized with database cleanup');
  } catch (error) {
    console.warn('Failed to initialize global cleanup:', error);
  }
});

afterAll(async () => {
  // Perform final cleanup after all tests in this file
  if (globalCleanupHelper) {
    try {
      console.log('🧹 Running global cleanup after all tests');
      await globalCleanupHelper.cleanupAfterAllTests();
    } catch (error) {
      console.warn('Global cleanup failed:', error);
    }
  }
});
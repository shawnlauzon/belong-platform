// Test setup file for core package
import { vi } from "vitest";

// Mock environment variables
vi.stubEnv("DEV", "true");
vi.stubEnv("VITE_LOG_LEVEL", "debug");

// Suppress console output during tests unless VITEST_VERBOSE is set
if (process.env.VITEST_VERBOSE !== "true") {
  global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}
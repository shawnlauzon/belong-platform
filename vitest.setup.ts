import { vi } from "vitest";

// Mock core module globally - no longer using @belongnetwork/core since we flattened the structure
vi.mock("./src/core", () => ({
  getBelongClient: vi.fn(),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

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
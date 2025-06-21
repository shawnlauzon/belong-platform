import { vi } from "vitest";

// Mock @belongnetwork/core module globally
vi.mock("@belongnetwork/core", () => ({
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

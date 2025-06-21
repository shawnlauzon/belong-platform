import { vi } from "vitest";

/**
 * Global mock setup for getBelongClient
 * This allows impl tests to continue working during migration to services
 */

// Mock the entire @belongnetwork/core module
vi.mock("@belongnetwork/core", async () => {
  const actual = await vi.importActual("@belongnetwork/core");

  // Create a default mock for getBelongClient that can be overridden in tests
  const mockGetBelongClient = vi.fn(() => {
    throw new Error(
      "getBelongClient not mocked - use setupSupabaseMocks() and createGetBelongClientMock() in your test",
    );
  });

  return {
    ...actual,
    getBelongClient: mockGetBelongClient,
  };
});

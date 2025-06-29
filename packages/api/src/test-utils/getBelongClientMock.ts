import { vi } from "vitest";
import type { BelongClient } from "@belongnetwork/core";

/**
 * Creates a mock getBelongClient function for tests
 * This is a temporary solution to allow impl tests to pass during migration to services
 */
export function createGetBelongClientMock(mockSupabase: any) {
  const mockBelongClient: BelongClient = {
    supabase: mockSupabase,
    mapbox: {} as any,
  };

  return {
    getBelongClient: vi.fn(() => mockBelongClient),
  };
}

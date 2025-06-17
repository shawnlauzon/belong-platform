import { vi } from 'vitest';
import { getBelongClient } from '@belongnetwork/core';

/**
 * Sets up standard mocks for getBelongClient with Supabase and logger
 * Returns the mock objects for use in tests
 */
export function setupBelongClientMocks() {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  
  const mockSupabase = {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  };

  const mockMapbox = {
    autocomplete: vi.fn(),
    reverseGeocode: vi.fn(),
  };
  
  const mockGetBelongClient = vi.mocked(getBelongClient);
  mockGetBelongClient.mockReturnValue({
    supabase: mockSupabase as any,
    logger: mockLogger as any,
    mapbox: mockMapbox as any,
  });
  
  return {
    mockSupabase,
    mockLogger,
    mockMapbox,
    mockGetBelongClient,
  };
}
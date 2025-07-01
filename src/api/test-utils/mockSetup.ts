import { vi } from 'vitest';

/**
 * Sets up standard mocks for Supabase client and logger
 * Returns the mock objects for use in tests
 */
export function setupSupabaseMocks() {
  const mockSupabase = {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
    },
  };

  const mockMapbox = {
    autocomplete: vi.fn(),
    reverseGeocode: vi.fn(),
  };

  return {
    mockSupabase,
    mockMapbox,
  };
}

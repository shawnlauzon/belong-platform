import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useSignOut } from '../../hooks/useSignOut';
import { createMockUser } from '../../../test-utils/mocks';
import { BelongProvider } from '../../providers/CurrentUserProvider';

// Mock core to provide createBelongClient
vi.mock('@belongnetwork/core', () => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const mockSupabase = {
    auth: {
      signOut: vi.fn(),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
    },
  };

  const mockMapbox = {
    autocomplete: vi.fn(),
    reverseGeocode: vi.fn(),
  };

  const mockClient = {
    supabase: mockSupabase as any,
    logger: mockLogger as any,
    mapbox: mockMapbox as any,
  };

  return {
    createBelongClient: vi.fn(() => mockClient),
    logger: mockLogger,
  };
});

describe('useSignOut', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: any }) => any;
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked client to access supabase
    const { createBelongClient } = await import('@belongnetwork/core');
    const mockClient = vi.mocked(createBelongClient)();
    mockSupabase = mockClient.supabase;

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const testConfig = {
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-key',
      mapboxPublicToken: 'test-token',
    };

    wrapper = ({ children }: { children: any }) =>
      createElement(QueryClientProvider, { client: queryClient }, 
        createElement(BelongProvider, { config: testConfig }, children)
      );
  });

  it('should call signOut implementation', async () => {
    // Arrange
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });

    // Act
    const { result } = renderHook(() => useSignOut(), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('should handle sign out errors properly', async () => {
    // Arrange
    const error = new Error('Sign out failed');
    mockSupabase.auth.signOut.mockResolvedValue({ error });

    // Act
    const { result } = renderHook(() => useSignOut(), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toBeDefined();
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

});

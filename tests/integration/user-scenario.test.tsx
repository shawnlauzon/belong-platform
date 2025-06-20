import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import React from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import {
  initializeBelong,
  BelongContextProvider,
  useResources,
  useEvents,
  useCommunities,
  resetBelongClient,
} from '@belongnetwork/platform';

// Create a query client once for all tests
let queryClient: QueryClient;
let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;

describe('User Scenario Integration', () => {
  beforeAll(() => {
    // Initialize the platform
    initializeBelong({
      supabaseUrl: process.env.VITE_SUPABASE_URL!,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
      mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
    });

    // Create query client once for all tests
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0,
          refetchOnWindowFocus: false,
          refetchOnMount: true,
          refetchOnReconnect: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BelongContextProvider>{children}</BelongContextProvider>
      </QueryClientProvider>
    );
  });

  afterAll(() => {
    resetBelongClient();
  });

  test('useResources should work with BelongContextProvider', async () => {
    const { result } = renderHook(() => useResources(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current).toMatchObject({
      isError: false,
      isSuccess: true,
      isPending: false,
      error: null,
      data: expect.any(Array),
    });
  });

  test('useEvents should work with BelongContextProvider', async () => {
    const { result } = renderHook(() => useEvents(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current).toMatchObject({
      isError: false,
      isSuccess: true,
      isPending: false,
      error: null,
      data: expect.any(Array),
    });
  });

  test('useCommunities should work with BelongContextProvider', async () => {
    const { result } = renderHook(() => useCommunities(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current).toMatchObject({
      isError: false,
      isSuccess: true,
      isPending: false,
      error: null,
      data: expect.any(Array),
    });

    // Should return at least 1 community
    expect(result.current.data.length).toBeGreaterThanOrEqual(1);
  });
});

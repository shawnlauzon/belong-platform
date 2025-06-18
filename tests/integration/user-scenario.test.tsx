import { describe, test, expect, beforeEach } from 'vitest';
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
  useResources,
  useEvents,
  resetBelongClient,
} from '@belongnetwork/platform';

// Create a fresh query client for each test
let queryClient: QueryClient;

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('User Scenario Integration', () => {
  beforeEach(() => {
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

    initializeBelong({
      supabaseUrl: process.env.VITE_SUPABASE_URL!,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
      mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
    });
  });

  test('useResources should work after calling initializeBelong', async () => {
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

  test('useEvents should work after calling initializeBelong', async () => {
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
});

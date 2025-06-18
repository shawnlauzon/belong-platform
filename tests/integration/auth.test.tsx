import { describe, test, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  initializeBelong,
  useSignUp,
  useSignIn,
  useCurrentUser,
  useSignOut,
  resetBelongClient,
} from '@belongnetwork/platform';

let queryClient: QueryClient;

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('Authentication Integration', () => {
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

  test('useSignUp should work after calling initializeBelong', async () => {
    const { result } = renderHook(() => useSignUp(), { wrapper });

    const testEmail = `test-${faker.string.alphanumeric(8)}-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const testUser = {
      email: testEmail,
      password: testPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    await act(async () => {
      result.current.mutate(testUser);
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current).toMatchObject({
      isError: false,
      isSuccess: true,
      isPending: false,
      error: null,
    });
  });

  test('useSignIn should work after calling initializeBelong', async () => {
    const { result } = renderHook(() => useSignIn(), { wrapper });

    const testCredentials = {
      email: 'test@example.com',
      password: 'TestPassword123!',
    };

    await act(async () => {
      result.current.mutate(testCredentials);
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current).toMatchObject({
      isError: false,
      isSuccess: true,
      isPending: false,
      error: null,
    });
  });

  test('useCurrentUser should work after calling initializeBelong', async () => {
    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    if (result.current.isError) {
      throw new Error(
        result.current.error?.message || 'Unknown error occurred'
      );
    }

    expect(result.current.isLoading).toBe(false);
  });

  test('useSignOut should work after calling initializeBelong', async () => {
    const { result } = renderHook(() => useSignOut(), { wrapper });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current).toMatchObject({
      isError: false,
      isSuccess: true,
      isPending: false,
      error: null,
    });
  });
});

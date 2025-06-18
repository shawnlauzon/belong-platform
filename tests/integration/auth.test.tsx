import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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
  getBelongClient,
} from '@belongnetwork/platform';

let queryClient: QueryClient;

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('Authentication Integration', () => {
  beforeAll(() => {
    initializeBelong({
      supabaseUrl: process.env.VITE_SUPABASE_URL!,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
      mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
    });
  });

  afterAll(async () => {
    try {
      const client = getBelongClient();
      if (client?.supabase) {
        await client.supabase
          .from('profiles')
          .delete()
          .like('email', 'test-%@example.com');
      }
    } catch (error) {
      console.warn('Failed to clean up test users:', error);
    }
  });

  beforeEach(async () => {
    // Clear any existing authentication state
    try {
      const client = getBelongClient();
      if (client?.supabase) {
        await client.supabase.auth.signOut();
      }
    } catch (error) {
      // Ignore signOut errors for clean test isolation
    }

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
      await result.current.mutateAsync(testUser);
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current).toMatchObject({
      isError: false,
      isSuccess: true,
      isPending: false,
      error: null,
    });
  });

  test('useSignIn should work after signing up a user', async () => {
    // First create a user
    const { result: signUpResult } = renderHook(() => useSignUp(), { wrapper });

    const testEmail = `test-${faker.string.alphanumeric(8)}-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const testUser = {
      email: testEmail,
      password: testPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    await act(async () => {
      await signUpResult.current.mutateAsync(testUser);
    });

    await waitFor(() => expect(signUpResult.current.isPending).toBe(false));

    // Now test sign in
    const { result } = renderHook(() => useSignIn(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        email: testEmail,
        password: testPassword,
      });
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current).toMatchObject({
      isError: false,
      isSuccess: true,
      isPending: false,
      error: null,
    });
  });

  test('useCurrentUser should return null when unauthenticated', async () => {
    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current).toMatchObject({
      isError: false,
      isSuccess: true,
      isPending: false,
      data: null,
    });
  });

  test('useCurrentUser should return user data when authenticated', async () => {
    // First create and sign in a user
    const { result: signUpResult } = renderHook(() => useSignUp(), { wrapper });

    const testEmail = `test-${faker.string.alphanumeric(8)}-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const testUser = {
      email: testEmail,
      password: testPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    await act(async () => {
      await signUpResult.current.mutateAsync(testUser);
    });

    await waitFor(() => expect(signUpResult.current.isPending).toBe(false));

    const { result: signInResult } = renderHook(() => useSignIn(), { wrapper });

    await act(async () => {
      await signInResult.current.mutateAsync({
        email: testEmail,
        password: testPassword,
      });
    });

    await waitFor(() => expect(signInResult.current.isPending).toBe(false));

    // Now test current user
    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current).toMatchObject({
      isError: false,
      isSuccess: true,
      isPending: false,
      data: expect.objectContaining({
        email: testEmail,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
      }),
    });
  });
});

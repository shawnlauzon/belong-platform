import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { renderHook, waitFor, act, render, screen } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  initializeBelong,
  useSignUp,
  useSignIn,
  useBelong,
  useSignOut,
  BelongProvider,
  resetBelongClient,
  getBelongClient,
} from '../../dist/index.es.js';

let queryClient: QueryClient;
let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;

describe('Authentication Integration', () => {
  beforeAll(() => {
    // Initialize once for all tests
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
        <BelongProvider>{children}</BelongProvider>
      </QueryClientProvider>
    );
  });

  afterAll(async () => {
    try {
      const client = getBelongClient();
      if (client?.supabase) {
        // Clean up test users using naming convention
        await client.supabase
          .from('profiles')
          .delete()
          .like('email', 'integration-test-%');
      }
    } catch (error) {
      console.warn('Failed to clean up test users:', error);
    }
  });

  // Keep test isolation for auth tests - each test needs clean auth state
  async function signOutBetweenTests() {
    try {
      const client = getBelongClient();
      if (client?.supabase) {
        await client.supabase.auth.signOut();
      }
    } catch (error) {
      // Ignore signOut errors for clean test isolation
    }
  }

  test('useSignUp should work after calling initializeBelong', async () => {
    await signOutBetweenTests();
    
    // Test auth mutations outside of BelongProvider
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    
    const { result } = renderHook(() => useSignUp(), { wrapper });

    const testEmail = `integration-test-${faker.string.alphanumeric(8)}-${Date.now()}@example.com`;
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
    await signOutBetweenTests();
    
    // Test auth mutations outside of BelongProvider  
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    
    // First create a user
    const { result: signUpResult } = renderHook(() => useSignUp(), { wrapper });

    const testEmail = `integration-test-${faker.string.alphanumeric(8)}-${Date.now()}@example.com`;
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

  test('useBelong should render error when unauthenticated', async () => {
    await signOutBetweenTests();
    
    const TestComponent = () => {
      const data = useBelong();
      if (data.isError || !data.currentUser) {
        return <div data-testid="no-user">No user</div>;
      }
      return <div data-testid="user-data">{data.currentUser.email}</div>;
    };

    const { getByTestId } = render(
      <QueryClientProvider client={queryClient}>
        <BelongProvider>
          <TestComponent />
        </BelongProvider>
      </QueryClientProvider>
    );

    // Wait for the component to render with no user
    await waitFor(() => {
      expect(getByTestId('no-user')).toBeDefined();
    });
  });

  test('useBelong should return user data when authenticated', async () => {
    await signOutBetweenTests();

    const testEmail = `integration-test-${faker.string.alphanumeric(8)}-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const testUser = {
      email: testEmail,
      password: testPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    // Step 1: Create auth mutations outside provider
    const authWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    
    const { result: signUpResult } = renderHook(() => useSignUp(), { wrapper: authWrapper });
    const { result: signInResult } = renderHook(() => useSignIn(), { wrapper: authWrapper });

    // Step 2: Sign up user
    await act(async () => {
      await signUpResult.current.mutateAsync(testUser);
    });
    await waitFor(() => expect(signUpResult.current.isSuccess).toBe(true));

    // Step 3: Sign in user
    await act(async () => {
      await signInResult.current.mutateAsync({
        email: testEmail,
        password: testPassword,
      });
    });
    await waitFor(() => expect(signInResult.current.isSuccess).toBe(true));

    // Step 4: Test BelongProvider with authenticated user
    const TestComponent = () => {
      const data = useBelong();
      if (data.isPending) return <div data-testid="loading">Loading...</div>;
      return <div data-testid="user-data">{data.currentUser?.email || ''}</div>;
    };

    const { getByTestId } = render(
      <QueryClientProvider client={queryClient}>
        <BelongProvider>
          <TestComponent />
        </BelongProvider>
      </QueryClientProvider>
    );

    // Should eventually show authenticated user data
    await waitFor(() => {
      const userElement = getByTestId('user-data');
      expect(userElement.textContent).toBe(testEmail.toLowerCase());
    }, { timeout: 10000 });
  });

  test('useSignOut should work and clear current user', async () => {
    await signOutBetweenTests();
    
    const testEmail = `integration-test-${faker.string.alphanumeric(8)}-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const testUser = {
      email: testEmail,
      password: testPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    // Step 1: Set up auth hooks using the same shared wrapper
    const { result: signUpResult } = renderHook(() => useSignUp(), { wrapper });
    const { result: signInResult } = renderHook(() => useSignIn(), { wrapper });
    const { result: signOutResult } = renderHook(() => useSignOut(), { wrapper });

    // Step 2: Sign up user
    await act(async () => {
      await signUpResult.current.mutateAsync(testUser);
    });
    await waitFor(() => expect(signUpResult.current.isSuccess).toBe(true));

    // Step 3: Sign in user  
    await act(async () => {
      await signInResult.current.mutateAsync({
        email: testEmail,
        password: testPassword,
      });
    });
    await waitFor(() => expect(signInResult.current.isSuccess).toBe(true));

    // Step 4: Verify user is authenticated with BelongProvider
    const AuthenticatedComponent = () => {
      const data = useBelong();
      if (data.isPending) return <div data-testid="loading">Loading...</div>;
      return <div data-testid="authenticated-user">{data.currentUser?.email || ''}</div>;
    };

    const { getByTestId, rerender } = render(
      <QueryClientProvider client={queryClient}>
        <BelongProvider>
          <AuthenticatedComponent />
        </BelongProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      const userElement = getByTestId('authenticated-user');
      expect(userElement.textContent).toBe(testEmail.toLowerCase());
    }, { timeout: 10000 });

    // Step 5: Sign out user
    await act(async () => {
      await signOutResult.current.mutateAsync();
    });
    await waitFor(() => expect(signOutResult.current.isSuccess).toBe(true));

    // Step 6: Verify user is no longer authenticated (TkDodo's pattern should invalidate cache)
    // Force React to re-evaluate the provider
    rerender(
      <QueryClientProvider client={queryClient}>
        <BelongProvider>
          <AuthenticatedComponent />
        </BelongProvider>
      </QueryClientProvider>
    );

    // Should now show no user data (empty or null email)
    await waitFor(() => {
      const userElement = getByTestId('authenticated-user');
      expect(userElement.textContent).toBe(''); // Empty since no user
    });
  });
});

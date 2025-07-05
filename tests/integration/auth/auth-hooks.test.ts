import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import React from 'react';
import {
  useSignUp,
  useSignIn,
  useSignOut,
  useCurrentUser,
  BelongProvider,
} from '../../../src';

// Simple test wrapper for React Query and BelongProvider
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });

  const config = {
    supabaseUrl: process.env.VITE_SUPABASE_URL!,
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
    mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
  };

  return ({ children }: { children: React.ReactNode }) => 
    React.createElement(
      QueryClientProvider, 
      { client: queryClient },
      React.createElement(BelongProvider, { config }, children)
    );
};

// Simple test data
const createTestCredentials = () => ({
  email: `test-hook-auth-${Date.now()}-${Math.random().toString(36).substr(2, 6)}@example.com`,
  password: 'TestPassword123!',
  firstName: 'TestHookFirst',
  lastName: 'TestHookLast',
});

// Simple cleanup function
const cleanupAuthSession = async () => {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  );
  
  try {
    await supabase.auth.signOut();
  } catch (error) {
    // Ignore errors - user might not be signed in
  }
};

describe('Auth Hooks Integration Tests', () => {
  let wrapper: ReturnType<typeof createTestWrapper>;
  let testCredentials: ReturnType<typeof createTestCredentials>;

  beforeEach(() => {
    wrapper = createTestWrapper();
    testCredentials = createTestCredentials();
  });

  afterEach(async () => {
    await cleanupAuthSession();
  });

  test('should sign up a new user using useSignUp hook', async () => {
    const { result } = renderHook(() => useSignUp(), { wrapper });

    // useSignUp returns a mutation object
    expect(typeof result.current.mutateAsync).toBe('function');

    const account = await act(async () => {
      return await result.current.mutateAsync({
        email: testCredentials.email,
        password: testCredentials.password,
        firstName: testCredentials.firstName,
        lastName: testCredentials.lastName,
      });
    });

    expect(account).toBeDefined();
    expect(account.id).toBeDefined();
    expect(account.email).toBe(testCredentials.email);
    expect(account.firstName).toBe(testCredentials.firstName);
    expect(account.lastName).toBe(testCredentials.lastName);
    expect(account.createdAt).toBeInstanceOf(Date);
  });

  test('should sign in existing user using useSignIn hook', async () => {
    // First create a user
    const { result: signUpResult } = renderHook(() => useSignUp(), { wrapper });
    
    await act(async () => {
      await signUpResult.current.mutateAsync({
        email: testCredentials.email,
        password: testCredentials.password,
        firstName: testCredentials.firstName,
        lastName: testCredentials.lastName,
      });
    });

    // Sign out first
    const { result: signOutResult } = renderHook(() => useSignOut(), { wrapper });
    await act(async () => {
      await signOutResult.current.mutateAsync();
    });

    // Then sign in
    const { result: signInResult } = renderHook(() => useSignIn(), { wrapper });

    const account = await act(async () => {
      return await signInResult.current.mutateAsync({
        email: testCredentials.email,
        password: testCredentials.password,
      });
    });

    expect(account).toBeDefined();
    expect(account.id).toBeDefined();
    expect(account.email).toBe(testCredentials.email);
    expect(account.firstName).toBe(testCredentials.firstName);
  });

  test('should get current user using useCurrentUser hook', async () => {
    // First create and sign in a user
    const { result: signUpResult } = renderHook(() => useSignUp(), { wrapper });
    
    await act(async () => {
      await signUpResult.current.mutateAsync({
        email: testCredentials.email,
        password: testCredentials.password,
        firstName: testCredentials.firstName,
        lastName: testCredentials.lastName,
      });
    });

    // Now get current user
    const { result: currentUserResult } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => {
      expect(currentUserResult.current.data).toBeDefined();
    }, { timeout: 10000 });

    const currentUser = currentUserResult.current.data;
    expect(currentUser).not.toBeNull();
    expect(currentUser!.email).toBe(testCredentials.email);
    expect(currentUser!.firstName).toBe(testCredentials.firstName);
  });

  test('should return null for current user when not signed in', async () => {
    // Make sure we're signed out
    await cleanupAuthSession();

    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 10000 });

    expect(result.current.data).toBeNull();
  });

  test('should sign out user using useSignOut hook', async () => {
    // First create and sign in a user
    const { result: signUpResult } = renderHook(() => useSignUp(), { wrapper });
    
    await act(async () => {
      await signUpResult.current.mutateAsync({
        email: testCredentials.email,
        password: testCredentials.password,
        firstName: testCredentials.firstName,
        lastName: testCredentials.lastName,
      });
    });

    // Verify we're signed in
    const { result: currentUserResult } = renderHook(() => useCurrentUser(), { wrapper });
    await waitFor(() => {
      expect(currentUserResult.current.data).not.toBeNull();
    }, { timeout: 10000 });

    // Sign out
    const { result: signOutResult } = renderHook(() => useSignOut(), { wrapper });
    await act(async () => {
      await signOutResult.current.mutateAsync();
    });

    // Verify we're signed out
    await waitFor(() => {
      expect(currentUserResult.current.data).toBeNull();
    }, { timeout: 10000 });
  });

  test('should handle sign up with invalid email', async () => {
    const { result } = renderHook(() => useSignUp(), { wrapper });

    await expect(act(async () => {
      await result.current.mutateAsync({
        email: 'invalid-email',
        password: testCredentials.password,
        firstName: testCredentials.firstName,
        lastName: testCredentials.lastName,
      });
    })).rejects.toThrow();
  });

  test('should handle sign in with wrong credentials', async () => {
    const { result } = renderHook(() => useSignIn(), { wrapper });

    await expect(act(async () => {
      await result.current.mutateAsync({
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      });
    })).rejects.toThrow();
  });

  test('should handle sign up with weak password', async () => {
    const { result } = renderHook(() => useSignUp(), { wrapper });

    await expect(act(async () => {
      await result.current.mutateAsync({
        email: testCredentials.email,
        password: '123', // Too weak
        firstName: testCredentials.firstName,
        lastName: testCredentials.lastName,
      });
    })).rejects.toThrow();
  });

  test('should handle duplicate email during sign up', async () => {
    // First create a user
    const { result: firstSignUp } = renderHook(() => useSignUp(), { wrapper });
    
    await act(async () => {
      await firstSignUp.current.mutateAsync({
        email: testCredentials.email,
        password: testCredentials.password,
        firstName: testCredentials.firstName,
        lastName: testCredentials.lastName,
      });
    });

    // Try to create another user with same email
    const { result: secondSignUp } = renderHook(() => useSignUp(), { wrapper });

    await expect(act(async () => {
      await secondSignUp.current.mutateAsync({
        email: testCredentials.email, // Same email
        password: testCredentials.password,
        firstName: 'DifferentFirst',
        lastName: 'DifferentLast',
      });
    })).rejects.toThrow();
  });

  test('should validate hook signatures', async () => {
    const { result } = renderHook(() => ({
      signUp: useSignUp(),
      signIn: useSignIn(),
      signOut: useSignOut(),
      currentUser: useCurrentUser(),
    }), { wrapper });

    // Mutation hooks return mutation objects
    expect(typeof result.current.signUp.mutateAsync).toBe('function');
    expect(typeof result.current.signIn.mutateAsync).toBe('function');
    expect(typeof result.current.signOut.mutateAsync).toBe('function');

    // Query hook returns query state
    expect(result.current.currentUser).toHaveProperty('data');
    expect(result.current.currentUser).toHaveProperty('isLoading');
    expect(result.current.currentUser).toHaveProperty('error');
  });

  test('should handle auth flow with session persistence', async () => {
    // Create wrapper with fresh query client for this test
    const freshWrapper = createTestWrapper();

    // Sign up user
    const { result: signUpResult } = renderHook(() => useSignUp(), { wrapper: freshWrapper });
    
    const signedUpAccount = await act(async () => {
      return await signUpResult.current.mutateAsync({
        email: testCredentials.email,
        password: testCredentials.password,
        firstName: testCredentials.firstName,
        lastName: testCredentials.lastName,
      });
    });

    // Should be able to get current user immediately after signup
    const { result: currentUserResult1 } = renderHook(() => useCurrentUser(), { wrapper: freshWrapper });
    
    await waitFor(() => {
      expect(currentUserResult1.current.data).not.toBeNull();
    }, { timeout: 10000 });
    
    expect(currentUserResult1.current.data!.id).toBe(signedUpAccount.id);

    // Sign out and back in
    const { result: signOutResult } = renderHook(() => useSignOut(), { wrapper: freshWrapper });
    await act(async () => {
      await signOutResult.current.mutateAsync();
    });

    const { result: signInResult } = renderHook(() => useSignIn(), { wrapper: freshWrapper });
    const signedInAccount = await act(async () => {
      return await signInResult.current.mutateAsync({
        email: testCredentials.email,
        password: testCredentials.password,
      });
    });

    // Should be the same user
    expect(signedInAccount.id).toBe(signedUpAccount.id);

    // Should be able to get current user after sign in
    const { result: currentUserResult2 } = renderHook(() => useCurrentUser(), { wrapper: freshWrapper });
    
    await waitFor(() => {
      expect(currentUserResult2.current.data).not.toBeNull();
    }, { timeout: 10000 });
    
    expect(currentUserResult2.current.data!.id).toBe(signedUpAccount.id);
  });
});
import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCurrentUser, useSignIn, useSignOut, useSignUp } from '../../../src';
import {
  TestDataFactory,
  authHelper,
  cleanupHelper,
  testWrapperManager,
  testUtils,
} from '../helpers';

/**
 * Basic Auth Integration Tests
 *
 * Tests the new auth hook patterns:
 * - useCurrentUser() - Returns React Query state { data, isLoading, error }
 * - useSignIn() - Returns function (credentials) => Promise<User>
 * - useSignOut() - Returns function () => Promise<void>
 * - useSignUp() - Returns function (userData) => Promise<User>
 */

describe('Basic Auth', () => {
  const wrapper = testWrapperManager.getWrapper();

  beforeAll(async () => {
    testWrapperManager.reset();
  });

  beforeEach(async () => {
    await cleanupHelper.ensureTestIsolation();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterEach(async () => {
    await authHelper.ensureSignedOut();
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await cleanupHelper.cleanupAfterAllTests();
  });

  test('should sign up a new user using useSignUp hook', async () => {
    const testUser = TestDataFactory.createUser();

    // Use single component with all hooks
    const { result } = renderHook(
      () => ({
        signUp: useSignUp(),
      }),
      { wrapper }
    );

    // useSignUp returns a function
    expect(typeof result.current.signUp).toBe('function');

    const user = await testUtils.performAsyncAction(
      () => result.current.signUp(testUser),
      'sign up new user'
    );

    expect(user).toMatchObject({
      id: expect.any(String),
      email: testUser.email.toLowerCase(),
      firstName: testUser.firstName,
    });
  });

  test('should sign in existing user and reflect in useCurrentUser', async () => {
    const testUser = TestDataFactory.createUser();

    // Use single component with all hooks to ensure proper state sharing
    const { result } = renderHook(
      () => ({
        currentUser: useCurrentUser(),
        signUp: useSignUp(),
        signIn: useSignIn(),
        signOut: useSignOut(), // Include signOut from the start for cleanup if needed
      }),
      { wrapper }
    );

    // Wait for hooks to initialize
    await waitFor(() => {
      expect(result.current.currentUser.isLoading).toBe(false);
    });

    // If there's existing auth state from previous tests, clear it first
    if (result.current.currentUser.data) {
      console.log(
        '⚠️ Found existing auth state from previous test, clearing it'
      );

      await testUtils.performAsyncAction(
        () => result.current.signOut(),
        'clear existing auth state'
      );

      // Wait for state to clear
      await waitFor(
        () => {
          expect(result.current.currentUser.data ?? null).toBeNull();
        },
        { timeout: 5000 }
      );
    }

    // Initial state: not authenticated
    expect(result.current.currentUser.data ?? null).toBeNull();

    // Sign up user
    await testUtils.performAsyncAction(
      () => result.current.signUp(testUser),
      'sign up for sign in test'
    );

    // Sign in user
    const signedInUser = await testUtils.performAsyncAction(
      () =>
        result.current.signIn({
          email: testUser.email,
          password: testUser.password,
        }),
      'sign in user'
    );

    expect(signedInUser).toMatchObject({
      id: expect.any(String),
      email: testUser.email.toLowerCase(),
    });

    // Wait for useCurrentUser to update
    await waitFor(
      () => {
        expect(
          result.current.currentUser.data || result.current.currentUser.isError
        ).toBeTruthy();
      },
      { timeout: 10000 }
    );
    if (result.current.currentUser.isError) {
      throw result.current.currentUser.error;
    }

    expect(result.current.currentUser.data?.email).toBe(
      testUser.email.toLowerCase()
    );
    expect(result.current.currentUser.isLoading).toBe(false);
    expect(result.current.currentUser.error).toBeFalsy();
  });

  test('should sign out user and clear useCurrentUser state', async () => {
    const testUser = TestDataFactory.createUser();

    // Use single component with all hooks to ensure proper state sharing
    const { result } = renderHook(
      () => ({
        currentUser: useCurrentUser(),
        signUp: useSignUp(),
        signIn: useSignIn(),
        signOut: useSignOut(),
      }),
      { wrapper }
    );

    // Wait for hooks to initialize
    await waitFor(() => {
      expect(result.current.currentUser.isLoading).toBe(false);
    });

    // Check and log initial state to debug test isolation issues
    console.log('🔍 Initial auth state before sign out test:', {
      hasData: !!result.current.currentUser.data,
      userData: result.current.currentUser.data
        ? {
            id: result.current.currentUser.data.id,
            email: result.current.currentUser.data.email,
          }
        : null,
      isLoading: result.current.currentUser.isLoading,
      isError: result.current.currentUser.isError,
    });

    // Ensure clean initial state
    expect(result.current.currentUser.data ?? null).toBeNull();

    // Sign up and sign in user
    await testUtils.performAsyncAction(
      () => result.current.signUp(testUser),
      'sign up for sign out test'
    );

    await testUtils.performAsyncAction(
      () =>
        result.current.signIn({
          email: testUser.email,
          password: testUser.password,
        }),
      'sign in for sign out test'
    );

    // Wait for auth state
    await waitFor(
      () => {
        expect(
          result.current.currentUser.data || result.current.currentUser.isError
        ).toBeTruthy();
      },
      { timeout: 10000 }
    );

    if (result.current.currentUser.isError) {
      throw result.current.currentUser.error;
    }

    // Sign out
    await testUtils.performAsyncAction(
      () => result.current.signOut(),
      'sign out user'
    );

    // Wait for auth state to clear
    await waitFor(
      () => {
        expect(result.current.currentUser.data ?? null).toBeNull();
      },
      { timeout: 10000 }
    );

    expect(result.current.currentUser.data ?? null).toBeNull();
    expect(result.current.currentUser.isLoading).toBe(false);
    expect(result.current.currentUser.error).toBeFalsy();
  });

  test('should validate hook signatures match API', async () => {
    // Use single component with all hooks to ensure proper state sharing
    const { result } = renderHook(
      () => ({
        currentUser: useCurrentUser(),
        signIn: useSignIn(),
        signOut: useSignOut(),
        signUp: useSignUp(),
      }),
      { wrapper }
    );

    // Wait for hooks to initialize
    await waitFor(() => {
      expect(result.current.currentUser.isLoading).toBe(false);
    });

    // useCurrentUser returns React Query state
    expect(result.current.currentUser).toHaveProperty('data');
    expect(result.current.currentUser).toHaveProperty('isLoading');
    expect(result.current.currentUser).toHaveProperty('error');
    expect(typeof result.current.currentUser.isLoading).toBe('boolean');

    // Mutation hooks return functions
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
    expect(typeof result.current.signUp).toBe('function');

    console.log('✅ Auth hook signatures validated');
  });
});

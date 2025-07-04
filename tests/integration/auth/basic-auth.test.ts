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
      { wrapper },
    );

    // useSignUp returns a function
    expect(typeof result.current.signUp).toBe('function');

    const user = await testUtils.performAsyncAction(
      () => result.current.signUp(testUser),
      'sign up new user',
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
      { wrapper },
    );

    // If there's existing auth state from previous tests, clear it first
    if (result.current.currentUser) {
      console.log(
        '⚠️ Found existing auth state from previous test, clearing it',
      );

      await testUtils.performAsyncAction(
        () => result.current.signOut(),
        'clear existing auth state',
      );

      // Wait for state to clear
      await waitFor(
        () => {
          expect(result.current.currentUser).toBeNull();
        },
        { timeout: 5000 },
      );
    }

    // Initial state: not authenticated
    expect(result.current.currentUser).toBeNull();

    // Sign up user
    await testUtils.performAsyncAction(
      () => result.current.signUp(testUser),
      'sign up for sign in test',
    );

    // Sign in user
    const signedInUser = await testUtils.performAsyncAction(
      () =>
        result.current.signIn({
          email: testUser.email,
          password: testUser.password,
        }),
      'sign in user',
    );

    expect(signedInUser).toMatchObject({
      id: expect.any(String),
      email: testUser.email.toLowerCase(),
    });

    // Wait for useCurrentUser to update
    await waitFor(
      () => {
        expect(result.current.currentUser).not.toBeNull();
      },
      { timeout: 10000 },
    );

    expect(result.current.currentUser?.email).toBe(
      testUser.email.toLowerCase(),
    );
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
      { wrapper },
    );

    // Sign up and sign in user
    await testUtils.performAsyncAction(
      () => result.current.signUp(testUser),
      'sign up for sign out test',
    );

    await testUtils.performAsyncAction(
      () =>
        result.current.signIn({
          email: testUser.email,
          password: testUser.password,
        }),
      'sign in for sign out test',
    );

    // Sign out
    await testUtils.performAsyncAction(
      () => result.current.signOut(),
      'sign out user',
    );

    // Wait for auth state to clear
    await waitFor(
      () => {
        expect(result.current.currentUser).toBeFalsy();
      },
      { timeout: 10000 },
    );
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
      { wrapper },
    );

    // Mutation hooks return functions
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
    expect(typeof result.current.signUp).toBe('function');

    console.log('✅ Auth hook signatures validated');
  });
});

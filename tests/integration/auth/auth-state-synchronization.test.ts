import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import {
  renderHook,
  act,
  waitFor,
} from "@testing-library/react";
import {
  useCurrentUser,
  useSignIn,
  useSignOut,
  useSignUp,
} from "../../../src";
import {
  TestDataFactory,
  authHelper,
  cleanupHelper,
  testWrapperManager,
  testUtils,
} from "../helpers";

/**
 * Auth State Synchronization Integration Tests
 * 
 * These tests reproduce customer-reported authentication state bugs:
 * "useAuth Hook Returns Null Despite Successful API User Fetch"
 * 
 * Customer scenario:
 * - Console shows: "DEBUG 👤 API: Successfully fetched user"
 * - However, useAuth hook returns: { user: null, isLoading: false, error: null }
 * - This causes AuthGuard to redirect authenticated users to /login
 */

describe("Auth State Synchronization", () => {
  const wrapper = testWrapperManager.getWrapper();

  beforeAll(async () => {
    testWrapperManager.reset();
  });

  beforeEach(async () => {
    await cleanupHelper.ensureTestIsolation();
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterEach(async () => {
    await authHelper.ensureSignedOut();
    // Add delay after each test
    await new Promise(resolve => setTimeout(resolve, 1500));
  });

  afterAll(async () => {
    await cleanupHelper.cleanupAfterAllTests();
  });

  test("BUG REPRODUCTION: useCurrentUser returns null despite successful API user fetch", async () => {
    // Create test user data matching customer pattern
    const testUser = TestDataFactory.createUser();
    
    // Use single component with all hooks to ensure proper state sharing
    const { result } = renderHook(() => ({
      currentUser: useCurrentUser(),
      signUp: useSignUp(),
      signIn: useSignIn(),
    }), { wrapper });

    // Wait for hooks to initialize
    await waitFor(() => {
      expect(result.current.currentUser.isLoading).toBe(false);
    });

    // Step 1: Sign up user (should work)
    const signUpUser = await testUtils.performAsyncAction(
      () => result.current.signUp(testUser),
      "sign up user for state sync test"
    );

    expect(signUpUser).toMatchObject({
      id: expect.any(String),
      email: testUser.email.toLowerCase(),
      firstName: testUser.firstName,
    });

    // Step 2: Sign in user (should establish session)
    const signInUser = await testUtils.performAsyncAction(
      () => result.current.signIn({
        email: testUser.email,
        password: testUser.password,
      }),
      "sign in user for state sync test"
    );

    expect(signInUser).toMatchObject({
      id: expect.any(String),
      email: testUser.email.toLowerCase(),
    });

    // Step 3: Check auth state immediately after sign-in
    // This is where the bug manifests - API may log success but hook returns null
    const immediateAuthState = result.current.currentUser;
    console.log('🔍 Immediate auth state after sign-in:', {
      currentUser: immediateAuthState.data ? {
        id: immediateAuthState.data.id,
        email: immediateAuthState.data.email,
      } : null,
      isLoading: immediateAuthState.isLoading,
      isError: immediateAuthState.isError,
    });

    // Step 4: Wait for auth state to stabilize and test the bug condition
    await waitFor(() => {
      const currentState = result.current.currentUser;
      console.log('🔍 Current auth state:', {
        currentUser: currentState.data ? {
          id: currentState.data.id,
          email: currentState.data.email,
        } : null,
        isLoading: currentState.isLoading,
        isError: currentState.isError,
      });

      // The bug: API succeeds but useCurrentUser returns null
      // If this test fails, it means the bug has been reproduced
      expect(currentState.data).toBeTruthy();
      expect(currentState.isLoading).toBe(false);
      expect(currentState.isError).toBeFalsy();
    }, { timeout: 10000 });

    // If we reach here, the bug is NOT reproduced
    expect(result.current.currentUser.data).toBeTruthy();
    expect(result.current.currentUser.data?.email).toBe(testUser.email.toLowerCase());
    expect(result.current.currentUser.isLoading).toBe(false);
    expect(result.current.currentUser.isError).toBeFalsy();

    console.log("✅ Auth state synchronization test successful - no bug reproduced");
  });

  test("TIMING ANALYSIS: auth state changes during authentication flow", async () => {
    const testUser = TestDataFactory.createUser();
    
    // Use single component with all hooks to ensure proper state sharing
    const { result } = renderHook(() => ({
      currentUser: useCurrentUser(),
      signUp: useSignUp(),
      signIn: useSignIn(),
    }), { wrapper });

    // Wait for hooks to initialize
    await waitFor(() => {
      expect(result.current.currentUser.isLoading).toBe(false);
    });

    // Track auth state changes during the flow
    const stateChanges: Array<{
      timestamp: number;
      currentUser: boolean;
      isAuthenticated: boolean;
      isPending: boolean;
      isError: boolean;
      action: string;
    }> = [];

    const trackState = (action: string) => {
      stateChanges.push({
        timestamp: Date.now(),
        currentUser: !!result.current.currentUser.data,
        isAuthenticated: !!result.current.currentUser.data && !result.current.currentUser.isLoading,
        isPending: result.current.currentUser.isLoading,
        isError: result.current.currentUser.isError,
        action,
      });
    };

    // Initial state
    trackState('initial');

    // Sign up
    await testUtils.performAsyncAction(
      async () => {
        const signUpResult = await result.current.signUp(testUser);
        trackState('after_signup');
        return signUpResult;
      },
      "sign up with timing tracking"
    );

    // Sign in
    await testUtils.performAsyncAction(
      async () => {
        const signInResult = await result.current.signIn({
          email: testUser.email,
          password: testUser.password,
        });
        trackState('after_signin');
        return signInResult;
      },
      "sign in with timing tracking"
    );

    // Wait for final state
    await waitFor(() => {
      trackState('polling');
      expect(result.current.currentUser.data).toBeTruthy();
      expect(result.current.currentUser.isLoading).toBe(false);
    }, { timeout: 10000 });

    trackState('final');

    // Analyze state changes for timing issues
    console.log('🕒 Auth state timeline:', stateChanges.map((state, index) => ({
      step: index,
      action: state.action,
      hasUser: state.currentUser,
      isAuthenticated: state.isAuthenticated,
      isPending: state.isPending,
      isError: state.isError,
      timestamp: state.timestamp,
    })));

    // Verify final state is correct
    const finalState = result.current.currentUser;
    expect(finalState.data).toBeTruthy();
    expect(!!finalState.data).toBe(true);
    expect(finalState.isLoading).toBe(false);
    expect(finalState.isError).toBe(false);

    // Check for concerning state transitions
    const nullUserStates = stateChanges.filter(state => 
      !state.isPending && !state.isError && !state.currentUser && state.isAuthenticated
    );

    if (nullUserStates.length > 0) {
      console.warn('⚠️  Detected potential timing issue: authenticated but null user', nullUserStates);
    } else {
      console.log("✅ No timing issues detected in auth state transitions");
    }

    // Ensure we don't have too many state changes (potential infinite loops)
    expect(stateChanges.length).toBeLessThan(20);

    // Ensure final state is stable
    const finalAuthState = stateChanges[stateChanges.length - 1];
    expect(finalAuthState.currentUser).toBe(true);
    expect(finalAuthState.isAuthenticated).toBe(true);
    expect(finalAuthState.isPending).toBe(false);
  });

  test("CACHE INVALIDATION: auth state after sign out", async () => {
    const testUser = TestDataFactory.createUser();
    
    // Use single component with all hooks to ensure proper state sharing
    const { result } = renderHook(() => ({
      currentUser: useCurrentUser(),
      signUp: useSignUp(),
      signIn: useSignIn(),
      signOut: useSignOut(),
    }), { wrapper });

    // Wait for hooks to initialize
    await waitFor(() => {
      expect(result.current.currentUser.isLoading).toBe(false);
    });

    // Authenticate user
    await testUtils.performAsyncAction(
      () => result.current.signUp(testUser),
      "sign up for cache invalidation test"
    );

    await testUtils.performAsyncAction(
      () => result.current.signIn({
        email: testUser.email,
        password: testUser.password,
      }),
      "sign in for cache invalidation test"
    );

    await waitFor(() => {
      expect(result.current.currentUser.data).toBeTruthy();
      expect(result.current.currentUser.isLoading).toBe(false);
    });

    // Verify authenticated state
    expect(result.current.currentUser.data).toBeTruthy();
    expect(!!result.current.currentUser.data && !result.current.currentUser.isLoading).toBe(true);

    // Sign out and verify cache is properly invalidated
    await testUtils.performAsyncAction(
      () => result.current.signOut(),
      "sign out for cache invalidation test"
    );

    // Wait for auth state to clear
    await waitFor(() => {
      expect(result.current.currentUser.data ?? null).toBeNull();
      expect(result.current.currentUser.isLoading).toBe(false);
    }, { timeout: 10000 });

    // Critical test: user should be null after sign out
    expect(result.current.currentUser.data).toBeNull();
    expect(!!result.current.currentUser.data).toBe(false);
    expect(result.current.currentUser.isLoading).toBe(false);

    console.log("✅ Cache invalidation test successful - user properly cleared after sign out");
  });

  test("STATE PERSISTENCE: auth state across hook remounts", async () => {
    const testUser = TestDataFactory.createUser();

    // First hook instance - authenticate using single component
    const { result: result1 } = renderHook(() => ({
      currentUser: useCurrentUser(),
      signUp: useSignUp(),
      signIn: useSignIn(),
    }), { wrapper });

    // Wait for hooks to initialize
    await waitFor(() => {
      expect(result1.current.currentUser.isLoading).toBe(false);
    });

    await testUtils.performAsyncAction(
      () => result1.current.signUp(testUser),
      "sign up for persistence test"
    );

    await testUtils.performAsyncAction(
      () => result1.current.signIn({
        email: testUser.email,
        password: testUser.password,
      }),
      "sign in for persistence test"
    );

    await waitFor(() => {
      expect(result1.current.currentUser.data).toBeTruthy();
      expect(result1.current.currentUser.isLoading).toBe(false);
    });

    const authenticatedUserId = result1.current.currentUser.data?.id;
    expect(authenticatedUserId).toBeTruthy();

    // Second hook instance - should maintain auth state
    const { result: result2 } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => {
      expect(result2.current.data).toBeTruthy();
      expect(result2.current.data?.id).toBe(authenticatedUserId);
    }, { timeout: 5000 });

    // Verify auth state persisted across hook instances
    expect(result2.current.data?.id).toBe(authenticatedUserId);
    expect(!!result2.current.data).toBe(true);
    expect(result2.current.isLoading).toBe(false);

    console.log("✅ State persistence test successful - auth state maintained across hook remounts");
  });
});
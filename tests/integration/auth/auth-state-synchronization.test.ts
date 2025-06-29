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
  useAuth,
} from "@belongnetwork/platform";
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

  test("BUG REPRODUCTION: useAuth returns null despite successful API user fetch", async () => {
    // Create test user data matching customer pattern
    const testUser = TestDataFactory.createUser();
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signUp === 'function'
    );

    // Step 1: Sign up user (should work)
    const signUpResult = await testUtils.performAsyncAction(
      () => authResult.current.signUp(testUser),
      "sign up user for state sync test"
    );

    expect(signUpResult).toMatchObject({
      id: expect.any(String),
      email: testUser.email.toLowerCase(),
      firstName: testUser.firstName,
    });

    // Step 2: Sign in user (should establish session)
    const signInResult = await testUtils.performAsyncAction(
      () => authResult.current.signIn({
        email: testUser.email,
        password: testUser.password,
      }),
      "sign in user for state sync test"
    );

    expect(signInResult).toMatchObject({
      id: expect.any(String),
      email: testUser.email.toLowerCase(),
    });

    // Step 3: Check auth state immediately after sign-in
    // This is where the bug manifests - API may log success but hook returns null
    const immediateAuthState = authResult.current;
    console.log('🔍 Immediate auth state after sign-in:', {
      currentUser: immediateAuthState.currentUser ? {
        id: immediateAuthState.currentUser.id,
        email: immediateAuthState.currentUser.email,
      } : null,
      isAuthenticated: immediateAuthState.isAuthenticated,
      isPending: immediateAuthState.isPending,
      isError: immediateAuthState.isError,
    });

    // Step 4: Wait for auth state to stabilize and test the bug condition
    await testUtils.waitForCondition(
      () => {
        const currentState = authResult.current;
        console.log('🔍 Current auth state:', {
          currentUser: currentState.currentUser ? {
            id: currentState.currentUser.id,
            email: currentState.currentUser.email,
          } : null,
          isAuthenticated: currentState.isAuthenticated,
          isPending: currentState.isPending,
          isError: currentState.isError,
        });

        // The bug: API succeeds but useAuth returns null
        // If this test fails, it means the bug has been reproduced
        return currentState.currentUser !== null && 
               currentState.isAuthenticated === true && 
               currentState.isPending === false;
      },
      "wait for auth state to stabilize",
      10000
    );

    // If we reach here, the bug is NOT reproduced
    expect(authResult.current.currentUser).toBeTruthy();
    expect(authResult.current.currentUser?.email).toBe(testUser.email.toLowerCase());
    expect(authResult.current.isAuthenticated).toBe(true);
    expect(authResult.current.isPending).toBe(false);

    console.log("✅ Auth state synchronization test successful - no bug reproduced");
  });

  test("TIMING ANALYSIS: useAuth state changes during authentication flow", async () => {
    const testUser = TestDataFactory.createUser();
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signUp === 'function'
    );

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
        currentUser: !!authResult.current.currentUser,
        isAuthenticated: authResult.current.isAuthenticated,
        isPending: authResult.current.isPending,
        isError: authResult.current.isError,
        action,
      });
    };

    // Initial state
    trackState('initial');

    // Sign up
    await testUtils.performAsyncAction(
      async () => {
        const result = await authResult.current.signUp(testUser);
        trackState('after_signup');
        return result;
      },
      "sign up with timing tracking"
    );

    // Sign in
    await testUtils.performAsyncAction(
      async () => {
        const result = await authResult.current.signIn({
          email: testUser.email,
          password: testUser.password,
        });
        trackState('after_signin');
        return result;
      },
      "sign in with timing tracking"
    );

    // Wait for final state
    await testUtils.waitForCondition(
      () => {
        trackState('polling');
        return authResult.current.isAuthenticated && !authResult.current.isPending;
      },
      "wait for final authenticated state",
      10000
    );

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
    const finalState = authResult.current;
    expect(finalState.currentUser).toBeTruthy();
    expect(finalState.isAuthenticated).toBe(true);
    expect(finalState.isPending).toBe(false);
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
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signUp === 'function'
    );

    // Authenticate user
    await testUtils.performAsyncAction(
      () => authResult.current.signUp(testUser),
      "sign up for cache invalidation test"
    );

    await testUtils.performAsyncAction(
      () => authResult.current.signIn({
        email: testUser.email,
        password: testUser.password,
      }),
      "sign in for cache invalidation test"
    );

    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated === true
    );

    // Verify authenticated state
    expect(authResult.current.currentUser).toBeTruthy();
    expect(authResult.current.isAuthenticated).toBe(true);

    // Sign out and verify cache is properly invalidated
    await testUtils.performAsyncAction(
      () => authResult.current.signOut(),
      "sign out for cache invalidation test"
    );

    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated === false
    );

    // Critical test: user should be null after sign out
    expect(authResult.current.currentUser).toBeNull();
    expect(authResult.current.isAuthenticated).toBe(false);
    expect(authResult.current.isPending).toBe(false);

    console.log("✅ Cache invalidation test successful - user properly cleared after sign out");
  });

  test("STATE PERSISTENCE: auth state across hook remounts", async () => {
    const testUser = TestDataFactory.createUser();

    // First hook instance - authenticate
    const { result: authResult1 } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      authResult1,
      (auth) => typeof auth.signUp === 'function'
    );

    await testUtils.performAsyncAction(
      () => authResult1.current.signUp(testUser),
      "sign up for persistence test"
    );

    await testUtils.performAsyncAction(
      () => authResult1.current.signIn({
        email: testUser.email,
        password: testUser.password,
      }),
      "sign in for persistence test"
    );

    await testUtils.waitForCondition(
      () => authResult1.current.isAuthenticated === true
    );

    const authenticatedUserId = authResult1.current.currentUser?.id;
    expect(authenticatedUserId).toBeTruthy();

    // Second hook instance - should maintain auth state
    const { result: authResult2 } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForCondition(
      () => authResult2.current.currentUser !== null,
      "wait for second hook to initialize with persisted auth state",
      5000
    );

    // Verify auth state persisted across hook instances
    expect(authResult2.current.currentUser?.id).toBe(authenticatedUserId);
    expect(authResult2.current.isAuthenticated).toBe(true);
    expect(authResult2.current.isPending).toBe(false);

    console.log("✅ State persistence test successful - auth state maintained across hook remounts");
  });
});
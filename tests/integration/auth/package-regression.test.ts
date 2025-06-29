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
 * Package Regression Integration Tests
 * 
 * These tests validate that the current local build maintains consistent
 * behavior with previous versions, particularly around authentication flows.
 * 
 * This helps catch regressions before publishing new package versions.
 */

describe("Package Regression Testing", () => {
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

  test("BASELINE: current build authentication behavior", async () => {
    console.log("🔍 Testing useAuth with CURRENT build...");

    const testUser = TestDataFactory.createUser();
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signUp === 'function'
    );

    // Test complete auth flow
    const signUpResult = await testUtils.performAsyncAction(
      () => authResult.current.signUp(testUser),
      "sign up with current build"
    );

    console.log("📝 CURRENT BUILD - Sign up result:", {
      id: signUpResult.id,
      email: signUpResult.email,
      firstName: signUpResult.firstName,
    });

    expect(signUpResult).toMatchObject({
      id: expect.any(String),
      email: testUser.email.toLowerCase(),
      firstName: testUser.firstName,
      lastName: testUser.lastName,
    });

    const signInResult = await testUtils.performAsyncAction(
      () => authResult.current.signIn({
        email: testUser.email,
        password: testUser.password,
      }),
      "sign in with current build"
    );

    console.log("🔐 CURRENT BUILD - Sign in result:", {
      id: signInResult.id,
      email: signInResult.email,
    });

    expect(signInResult).toMatchObject({
      id: expect.any(String),
      email: testUser.email.toLowerCase(),
    });

    // Test the critical behavior: useAuth state after authentication
    await testUtils.waitForCondition(
      () => {
        const authState = authResult.current;
        console.log("👤 CURRENT BUILD - Final auth state:", {
          currentUser: authState.currentUser ? {
            id: authState.currentUser.id,
            email: authState.currentUser.email,
            firstName: authState.currentUser.firstName,
          } : null,
          isAuthenticated: authState.isAuthenticated,
          isPending: authState.isPending,
          isError: authState.isError,
          error: authState.error?.message,
        });

        return authState.currentUser !== null && 
               authState.isAuthenticated === true && 
               authState.isPending === false;
      },
      "wait for current build auth state to stabilize",
      15000
    );

    // This is the critical test - should NOT be null after successful auth
    expect(authResult.current.currentUser).not.toBeNull();
    expect(authResult.current.isAuthenticated).toBe(true);
    expect(authResult.current.isPending).toBe(false);
    expect(authResult.current.currentUser?.email).toBe(testUser.email.toLowerCase());

    console.log("✅ CURRENT BUILD - useAuth test passed");
  });

  test("API CONSISTENCY: hook methods and return types", async () => {
    console.log("🔍 Testing API consistency...");

    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signUp === 'function'
    );

    const auth = authResult.current;

    // Verify all expected methods exist and have correct types
    expect(typeof auth.signUp).toBe('function');
    expect(typeof auth.signIn).toBe('function');
    expect(typeof auth.signOut).toBe('function');

    // Verify state properties exist and have correct types
    expect(typeof auth.isAuthenticated).toBe('boolean');
    expect(typeof auth.isPending).toBe('boolean');
    expect(typeof auth.isError).toBe('boolean');

    // currentUser can be null or object
    expect(auth.currentUser === null || typeof auth.currentUser === 'object').toBe(true);

    // error can be null or object
    expect(auth.error === null || typeof auth.error === 'object').toBe(true);

    console.log("✅ API consistency test passed - all expected methods and properties present");
  });

  test("PERFORMANCE BASELINE: authentication timing", async () => {
    console.log("🔍 Testing authentication performance baseline...");

    const testUser = TestDataFactory.createUser();
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signUp === 'function'
    );

    // Measure sign up performance
    const signUpStartTime = Date.now();
    await testUtils.performAsyncAction(
      () => authResult.current.signUp(testUser),
      "sign up for performance baseline"
    );
    const signUpDuration = Date.now() - signUpStartTime;

    // Measure sign in performance
    const signInStartTime = Date.now();
    await testUtils.performAsyncAction(
      () => authResult.current.signIn({
        email: testUser.email,
        password: testUser.password,
      }),
      "sign in for performance baseline"
    );
    const signInDuration = Date.now() - signInStartTime;

    // Measure auth state stabilization
    const stateStartTime = Date.now();
    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated === true,
      "wait for auth state to stabilize for performance baseline"
    );
    const stateDuration = Date.now() - stateStartTime;

    console.log("⏱️  PERFORMANCE BASELINE:", {
      signUpDuration: `${signUpDuration}ms`,
      signInDuration: `${signInDuration}ms`,
      stateDuration: `${stateDuration}ms`,
    });

    // Set reasonable performance expectations (these can be adjusted based on baseline)
    expect(signUpDuration).toBeLessThan(10000); // 10 seconds max for sign up
    expect(signInDuration).toBeLessThan(8000);  // 8 seconds max for sign in
    expect(stateDuration).toBeLessThan(3000);   // 3 seconds max for state stabilization

    console.log("✅ Performance baseline test passed");
  });

  test("ERROR HANDLING: consistent error responses", async () => {
    console.log("🔍 Testing error handling consistency...");

    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signUp === 'function'
    );

    // Test sign up with invalid data
    try {
      await authResult.current.signUp({
        email: "invalid-email",
        password: "123", // Too short
        firstName: "",   // Empty
        lastName: "",    // Empty
      });
      // Should not reach here
      expect(false).toBe(true);
    } catch (error: any) {
      expect(error).toBeDefined();
      expect(typeof error.message).toBe('string');
      console.log("📝 Expected sign up error:", error.message);
    }

    // Test sign in with non-existent user
    try {
      await authResult.current.signIn({
        email: "nonexistent@example.com",
        password: "password123",
      });
      // Should not reach here
      expect(false).toBe(true);
    } catch (error: any) {
      expect(error).toBeDefined();
      expect(typeof error.message).toBe('string');
      console.log("📝 Expected sign in error:", error.message);
    }

    // Verify auth state remains stable after errors
    expect(authResult.current.currentUser).toBeNull();
    expect(authResult.current.isAuthenticated).toBe(false);
    expect(authResult.current.isPending).toBe(false);

    console.log("✅ Error handling consistency test passed");
  });

  test("STATE MANAGEMENT: hook state consistency", async () => {
    console.log("🔍 Testing hook state management consistency...");

    const testUser = TestDataFactory.createUser();
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signUp === 'function'
    );

    // Track state changes throughout auth flow
    const stateSnapshots: Array<{
      action: string;
      currentUser: boolean;
      isAuthenticated: boolean;
      isPending: boolean;
      isError: boolean;
    }> = [];

    const captureState = (action: string) => {
      stateSnapshots.push({
        action,
        currentUser: !!authResult.current.currentUser,
        isAuthenticated: authResult.current.isAuthenticated,
        isPending: authResult.current.isPending,
        isError: authResult.current.isError,
      });
    };

    captureState('initial');

    // Sign up
    await testUtils.performAsyncAction(
      async () => {
        const result = await authResult.current.signUp(testUser);
        captureState('after_signup');
        return result;
      },
      "sign up for state consistency test"
    );

    // Sign in
    await testUtils.performAsyncAction(
      async () => {
        const result = await authResult.current.signIn({
          email: testUser.email,
          password: testUser.password,
        });
        captureState('after_signin');
        return result;
      },
      "sign in for state consistency test"
    );

    // Wait for final state
    await testUtils.waitForCondition(
      () => {
        captureState('polling');
        return authResult.current.isAuthenticated && !authResult.current.isPending;
      },
      "wait for final state consistency"
    );

    captureState('final');

    console.log("📊 STATE CONSISTENCY TIMELINE:", stateSnapshots);

    // Validate state consistency rules
    const finalState = stateSnapshots[stateSnapshots.length - 1];
    expect(finalState.currentUser).toBe(true);
    expect(finalState.isAuthenticated).toBe(true);
    expect(finalState.isPending).toBe(false);
    expect(finalState.isError).toBe(false);

    // Ensure no invalid state combinations occurred
    const invalidStates = stateSnapshots.filter(state => 
      // Invalid: authenticated but no user
      (state.isAuthenticated && !state.currentUser) ||
      // Invalid: user but not authenticated (unless pending)
      (state.currentUser && !state.isAuthenticated && !state.isPending)
    );

    if (invalidStates.length > 0) {
      console.warn("⚠️  Detected invalid state transitions:", invalidStates);
    }

    expect(invalidStates).toHaveLength(0);

    console.log("✅ State management consistency test passed");
  });

  test("REGRESSION DETECTION: known behavior patterns", async () => {
    console.log("🔍 Testing for known regression patterns...");

    const testUser = TestDataFactory.createUser();
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signUp === 'function'
    );

    // Test Pattern 1: Rapid sign in/out cycles should not break state
    await testUtils.performAsyncAction(
      () => authResult.current.signUp(testUser),
      "sign up for regression test"
    );

    for (let i = 0; i < 3; i++) {
      await testUtils.performAsyncAction(
        () => authResult.current.signIn({
          email: testUser.email,
          password: testUser.password,
        }),
        `rapid sign in ${i + 1}`
      );

      await testUtils.waitForCondition(
        () => authResult.current.isAuthenticated === true
      );

      await testUtils.performAsyncAction(
        () => authResult.current.signOut(),
        `rapid sign out ${i + 1}`
      );

      await testUtils.waitForCondition(
        () => authResult.current.isAuthenticated === false
      );
    }

    // Final verification - should be in clean signed out state
    expect(authResult.current.currentUser).toBeNull();
    expect(authResult.current.isAuthenticated).toBe(false);
    expect(authResult.current.isPending).toBe(false);

    console.log("✅ Regression detection test passed - no known patterns detected");
  });
});
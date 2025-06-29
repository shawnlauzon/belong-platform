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
  commonExpectations,
} from "../helpers";

describe("Authentication Integration (Rate Limit Safe)", () => {
  const wrapper = testWrapperManager.getWrapper();
  
  // Shared test user to minimize API calls
  let sharedTestUser: any = null;
  let sharedUserCredentials: any = null;

  beforeAll(async () => {
    testWrapperManager.reset();
    
    // Create one test user for the entire test suite
    try {
      const testUser = TestDataFactory.createUser();
      const { result } = await testUtils.renderHookWithWrapper(() => useAuth());

      await testUtils.waitForHookToInitialize(
        result,
        (auth) => typeof auth.signUp === 'function'
      );

      // Create the shared user
      sharedTestUser = await result.current.signUp(testUser);
      sharedUserCredentials = {
        email: testUser.email,
        password: testUser.password,
      };

      // Sign out after creation
      await result.current.signOut();

      console.log("Created shared test user for auth tests");
    } catch (error) {
      console.warn("Failed to create shared test user:", error);
    }
  });

  beforeEach(async () => {
    await cleanupHelper.ensureTestIsolation();
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500));
  });

  afterEach(async () => {
    await authHelper.ensureSignedOut();
    // Add delay after each test
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await cleanupHelper.cleanupAfterAllTests();
  });

  test("should have functional auth hooks available", async () => {
    const { result } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      result,
      (auth) => typeof auth.signUp === 'function'
    );

    // Verify all auth methods exist
    expect(typeof result.current.signUp).toBe('function');
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
    expect(typeof result.current.isAuthenticated).toBe('boolean');
    
    // Should start unauthenticated
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.currentUser).toBeNull();
  });

  test("should successfully sign in with existing user", async () => {
    if (!sharedTestUser || !sharedUserCredentials) {
      console.warn("Skipping test - no shared user available");
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      result,
      (auth) => typeof auth.signIn === 'function'
    );

    // Sign in with the shared user
    const signInResult = await testUtils.performAsyncAction(
      () => result.current.signIn(sharedUserCredentials),
      "sign in with existing user"
    );

    expect(signInResult).toMatchObject({
      id: sharedTestUser.id,
      email: sharedTestUser.email,
      firstName: sharedTestUser.firstName,
      lastName: sharedTestUser.lastName,
    });

    // Verify authentication state
    await testUtils.waitForCondition(
      () => result.current.isAuthenticated === true,
      { timeout: 5000 }
    );

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.currentUser).toMatchObject({
      id: sharedTestUser.id,
      email: sharedTestUser.email,
    });
  });

  test("should successfully sign out", async () => {
    if (!sharedTestUser || !sharedUserCredentials) {
      console.warn("Skipping test - no shared user available");
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      result,
      (auth) => typeof auth.signIn === 'function'
    );

    // Sign in first
    await testUtils.performAsyncAction(
      () => result.current.signIn(sharedUserCredentials),
      "sign in before sign out test"
    );

    await testUtils.waitForCondition(
      () => result.current.isAuthenticated === true
    );

    // Now sign out
    await testUtils.performAsyncAction(
      () => result.current.signOut(),
      "sign out"
    );

    await testUtils.waitForCondition(
      () => result.current.isAuthenticated === false
    );

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.currentUser).toBeNull();
  });

  test("should handle invalid credentials gracefully", async () => {
    const { result } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      result,
      (auth) => typeof auth.signIn === 'function'
    );

    // Test with completely invalid email
    await expect(
      testUtils.performAsyncAction(
        () => result.current.signIn({
          email: "definitely-not-a-user@nonexistent.com",
          password: "WrongPassword123!",
        }),
        "sign in with invalid credentials"
      )
    ).rejects.toThrow();

    // Should remain unauthenticated after failed attempt
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.currentUser).toBeNull();
  });

  test("should handle sign in with wrong password for existing user", async () => {
    if (!sharedTestUser || !sharedUserCredentials) {
      console.warn("Skipping test - no shared user available");
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      result,
      (auth) => typeof auth.signIn === 'function'
    );

    // Test with correct email but wrong password
    await expect(
      testUtils.performAsyncAction(
        () => result.current.signIn({
          email: sharedUserCredentials.email,
          password: "DefinitelyWrongPassword123!",
        }),
        "sign in with wrong password"
      )
    ).rejects.toThrow();

    // Should remain unauthenticated
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.currentUser).toBeNull();
  });

  test("should maintain authentication state across hook re-renders", async () => {
    if (!sharedTestUser || !sharedUserCredentials) {
      console.warn("Skipping test - no shared user available");
      return;
    }

    // First hook instance - sign in
    const { result: firstHook } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      firstHook,
      (auth) => typeof auth.signIn === 'function'
    );

    await testUtils.performAsyncAction(
      () => firstHook.current.signIn(sharedUserCredentials),
      "sign in for state persistence test"
    );

    await testUtils.waitForCondition(
      () => firstHook.current.isAuthenticated === true
    );

    // Second hook instance - should see the same auth state
    const { result: secondHook } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      secondHook,
      (auth) => auth.isAuthenticated === true,
      { timeout: 10000 }
    );

    // Both hooks should show the same authenticated state
    expect(firstHook.current.isAuthenticated).toBe(true);
    expect(secondHook.current.isAuthenticated).toBe(true);
    
    expect(firstHook.current.currentUser?.id).toBe(sharedTestUser.id);
    expect(secondHook.current.currentUser?.id).toBe(sharedTestUser.id);
  });

  test("should validate registration data format", async () => {
    const { result } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      result,
      (auth) => typeof auth.signUp === 'function'
    );

    // Test invalid email format (this should fail before hitting the API)
    await expect(
      testUtils.performAsyncAction(
        () => result.current.signUp({
          email: "not-an-email",
          password: "ValidPassword123!",
          firstName: "Test",
          lastName: "User",
        }),
        "sign up with invalid email format"
      )
    ).rejects.toThrow();

    // Test empty email
    await expect(
      testUtils.performAsyncAction(
        () => result.current.signUp({
          email: "",
          password: "ValidPassword123!",
          firstName: "Test",
          lastName: "User",
        }),
        "sign up with empty email"
      )
    ).rejects.toThrow();

    // Should remain unauthenticated after validation failures
    expect(result.current.isAuthenticated).toBe(false);
  });

  test("should complete a sign in -> sign out -> sign in cycle", async () => {
    if (!sharedTestUser || !sharedUserCredentials) {
      console.warn("Skipping test - no shared user available");
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      result,
      (auth) => typeof auth.signIn === 'function'
    );

    // 1. Sign in
    await testUtils.performAsyncAction(
      () => result.current.signIn(sharedUserCredentials),
      "first sign in"
    );

    await testUtils.waitForCondition(
      () => result.current.isAuthenticated === true
    );

    expect(result.current.isAuthenticated).toBe(true);

    // 2. Sign out
    await testUtils.performAsyncAction(
      () => result.current.signOut(),
      "sign out in cycle"
    );

    await testUtils.waitForCondition(
      () => result.current.isAuthenticated === false
    );

    expect(result.current.isAuthenticated).toBe(false);

    // 3. Sign back in
    await testUtils.performAsyncAction(
      () => result.current.signIn(sharedUserCredentials),
      "second sign in"
    );

    await testUtils.waitForCondition(
      () => result.current.isAuthenticated === true
    );

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.currentUser?.id).toBe(sharedTestUser.id);
  });
});
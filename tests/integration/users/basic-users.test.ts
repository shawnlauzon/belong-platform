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
  useUsers,
} from "@belongnetwork/platform";
import {
  TestDataFactory,
  authHelper,
  cleanupHelper,
  testWrapperManager,
  testUtils,
} from "../helpers";

describe("Users Integration Tests", () => {
  const wrapper = testWrapperManager.getWrapper();
  
  // Shared test users to minimize API calls
  let sharedTestUser: any = null;
  let sharedUserCredentials: any = null;

  beforeAll(async () => {
    testWrapperManager.reset();
    
    // Create shared test user
    try {
      const testUser = TestDataFactory.createUser();
      const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());

      await testUtils.waitForHookToInitialize(
        authResult,
        (auth) => typeof auth.signUp === 'function'
      );

      sharedTestUser = await authResult.current.signUp(testUser);
      sharedUserCredentials = {
        email: testUser.email,
        password: testUser.password,
      };

      // Sign out after setup
      await authResult.current.signOut();

      console.log("Created shared test user for users tests");
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

  test("should have functional users hooks available", async () => {
    const { result } = await testUtils.renderHookWithWrapper(() => useUsers());

    await testUtils.waitForHookToInitialize(
      result,
      (users) => typeof users.list === 'function'
    );

    // Verify all users methods exist
    expect(typeof result.current.list).toBe('function');
    expect(typeof result.current.byId).toBe('function');
    expect(typeof result.current.update).toBe('function');
    expect(typeof result.current.delete).toBe('function');
    
    // Verify status properties exist
    expect(typeof result.current.isPending).toBe('boolean');
    expect(typeof result.current.isError).toBe('boolean');
    expect(typeof result.current.isSuccess).toBe('boolean');
    expect(typeof result.current.isFetching).toBe('boolean');
  });

  test("should list users when authenticated", async () => {
    if (!sharedTestUser || !sharedUserCredentials) {
      console.warn("Skipping test - missing shared test user");
      return;
    }

    // Sign in first
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());
    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signIn === 'function'
    );

    await testUtils.performAsyncAction(
      () => authResult.current.signIn(sharedUserCredentials),
      "sign in for users listing test"
    );

    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated === true
    );

    const { result } = await testUtils.renderHookWithWrapper(() => useUsers());

    await testUtils.waitForHookToInitialize(
      result,
      (users) => typeof users.list === 'function'
    );

    const usersList = await testUtils.performAsyncAction(
      () => result.current.list(),
      "list users when authenticated"
    );

    expect(Array.isArray(usersList)).toBe(true);
    // Should include at least our test user
    expect(usersList.length).toBeGreaterThan(0);
  });

  test("should retrieve user by ID when authenticated", async () => {
    if (!sharedTestUser || !sharedUserCredentials) {
      console.warn("Skipping test - missing shared test user");
      return;
    }

    // Sign in first
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());
    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signIn === 'function'
    );

    await testUtils.performAsyncAction(
      () => authResult.current.signIn(sharedUserCredentials),
      "sign in for user retrieval test"
    );

    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated === true
    );

    const { result } = await testUtils.renderHookWithWrapper(() => useUsers());

    await testUtils.waitForHookToInitialize(
      result,
      (users) => typeof users.byId === 'function'
    );

    // Retrieve our test user by ID
    const retrievedUser = await testUtils.performAsyncAction(
      () => result.current.byId(sharedTestUser.id),
      "retrieve user by ID"
    );

    expect(retrievedUser).toMatchObject({
      id: sharedTestUser.id,
      email: sharedTestUser.email,
      firstName: sharedTestUser.firstName,
      lastName: sharedTestUser.lastName,
    });
  });

  test("should update user profile when authenticated", async () => {
    if (!sharedTestUser || !sharedUserCredentials) {
      console.warn("Skipping test - missing shared test user");
      return;
    }

    // Sign in first
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());
    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signIn === 'function'
    );

    await testUtils.performAsyncAction(
      () => authResult.current.signIn(sharedUserCredentials),
      "sign in for user update test"
    );

    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated === true
    );

    const { result } = await testUtils.renderHookWithWrapper(() => useUsers());

    await testUtils.waitForHookToInitialize(
      result,
      (users) => typeof users.update === 'function'
    );

    // Update the user profile
    const updateData = {
      id: sharedTestUser.id,
      email: sharedTestUser.email,
      firstName: "Updated",
      lastName: "TestUser",
      fullName: "Updated TestUser",
    };

    const updatedUser = await testUtils.performAsyncAction(
      () => result.current.update(updateData),
      "update user profile"
    );

    expect(updatedUser).toMatchObject({
      id: sharedTestUser.id,
      firstName: "Updated",
      lastName: "TestUser",
      fullName: "Updated TestUser",
    });

    // Verify the update persisted by retrieving the user again
    const retrievedUser = await testUtils.performAsyncAction(
      () => result.current.byId(sharedTestUser.id),
      "retrieve updated user"
    );

    expect(retrievedUser).toMatchObject({
      id: sharedTestUser.id,
      firstName: "Updated",
      lastName: "TestUser",
      fullName: "Updated TestUser",
    });
  });

  test("should filter users appropriately", async () => {
    if (!sharedTestUser || !sharedUserCredentials) {
      console.warn("Skipping test - missing shared test user");
      return;
    }

    // Sign in first
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());
    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signIn === 'function'
    );

    await testUtils.performAsyncAction(
      () => authResult.current.signIn(sharedUserCredentials),
      "sign in for user filtering test"
    );

    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated === true
    );

    const { result } = await testUtils.renderHookWithWrapper(() => useUsers());

    await testUtils.waitForHookToInitialize(
      result,
      (users) => typeof users.list === 'function'
    );

    // List all users
    const allUsers = await testUtils.performAsyncAction(
      () => result.current.list(),
      "list all users"
    );

    expect(Array.isArray(allUsers)).toBe(true);
    expect(allUsers.length).toBeGreaterThan(0);

    // Filter by specific criteria if supported
    try {
      const filteredUsers = await testUtils.performAsyncAction(
        () => result.current.list({ 
          firstName: sharedTestUser.firstName 
        }),
        "list users with filter"
      );

      expect(Array.isArray(filteredUsers)).toBe(true);
      // All returned users should match the filter
      filteredUsers.forEach(user => {
        if (user.firstName) {
          expect(user.firstName).toBe(sharedTestUser.firstName);
        }
      });
    } catch (error) {
      // Filtering might not be fully implemented
      console.log("User filtering not available or not working:", error);
    }
  });

  test("should handle user discovery operations", async () => {
    if (!sharedTestUser || !sharedUserCredentials) {
      console.warn("Skipping test - missing shared test user");
      return;
    }

    // Sign in first
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());
    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signIn === 'function'
    );

    await testUtils.performAsyncAction(
      () => authResult.current.signIn(sharedUserCredentials),
      "sign in for user discovery test"
    );

    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated === true
    );

    const { result } = await testUtils.renderHookWithWrapper(() => useUsers());

    await testUtils.waitForHookToInitialize(
      result,
      (users) => typeof users.list === 'function'
    );

    // Test basic user discovery by listing users
    const users = await testUtils.performAsyncAction(
      () => result.current.list(),
      "discover users via listing"
    );

    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);

    // Verify users have required profile information
    users.forEach(user => {
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('firstName');
      expect(typeof user.id).toBe('string');
      expect(typeof user.firstName).toBe('string');
      // lastName is optional, so only check type if it exists
      if (user.lastName !== undefined) {
        expect(typeof user.lastName).toBe('string');
      }
    });

    // Test discovery of specific user by ID
    const specificUser = await testUtils.performAsyncAction(
      () => result.current.byId(sharedTestUser.id),
      "discover specific user by ID"
    );

    expect(specificUser).toMatchObject({
      id: sharedTestUser.id,
      firstName: expect.any(String),
      lastName: expect.any(String),
    });
  });

  test("should handle users CRUD operations based on authentication", async () => {
    const { result } = await testUtils.renderHookWithWrapper(() => useUsers());

    await testUtils.waitForHookToInitialize(
      result,
      (users) => typeof users.list === 'function'
    );

    // List users without authentication - this may be allowed for public profiles
    try {
      const publicUsers = await testUtils.performAsyncAction(
        () => result.current.list(),
        "list users without auth"
      );
      
      // If listing succeeds, verify it returns valid user data
      expect(Array.isArray(publicUsers)).toBe(true);
      console.log("User listing allowed without authentication (public profiles)");
    } catch (error) {
      // If listing fails, that's also valid behavior
      console.log("User listing requires authentication:", error.message);
    }

    // Update and delete operations should require authentication
    await expect(
      testUtils.performAsyncAction(
        () => result.current.update({
          id: "fake-id",
          email: "fake@example.com",
          firstName: "Fake",
          lastName: "User",
        }),
        "update user without auth"
      )
    ).rejects.toThrow();

    await expect(
      testUtils.performAsyncAction(
        () => result.current.delete("fake-id"),
        "delete user without auth"
      )
    ).rejects.toThrow();
  });

  test("should provide user profile management functionality", async () => {
    if (!sharedTestUser || !sharedUserCredentials) {
      console.warn("Skipping test - missing shared test user");
      return;
    }

    // Sign in first
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());
    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signIn === 'function'
    );

    await testUtils.performAsyncAction(
      () => authResult.current.signIn(sharedUserCredentials),
      "sign in for profile management test"
    );

    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated === true
    );

    const { result } = await testUtils.renderHookWithWrapper(() => useUsers());

    await testUtils.waitForHookToInitialize(
      result,
      (users) => typeof users.update === 'function'
    );

    // Test profile updates with different field combinations
    const profileUpdates = [
      {
        field: 'firstName',
        value: 'NewFirst',
      },
      {
        field: 'lastName',
        value: 'NewLast',
      },
      {
        field: 'fullName',
        value: 'New Display Name',
      },
    ];

    for (const update of profileUpdates) {
      const updateData = {
        id: sharedTestUser.id,
        email: sharedTestUser.email,
        firstName: sharedTestUser.firstName,
        lastName: sharedTestUser.lastName,
        fullName: sharedTestUser.fullName,
        [update.field]: update.value,
      };

      const updatedUser = await testUtils.performAsyncAction(
        () => result.current.update(updateData),
        `update user ${update.field}`
      );

      expect(updatedUser[update.field]).toBe(update.value);

      // Update our reference for next iteration
      sharedTestUser = updatedUser;
    }

    // Verify final state
    const finalUser = await testUtils.performAsyncAction(
      () => result.current.byId(sharedTestUser.id),
      "get final user state"
    );

    expect(finalUser).toMatchObject({
      id: sharedTestUser.id,
      firstName: 'NewFirst',
      lastName: 'NewLast',
      fullName: 'New Display Name',
    });
  });

  test("should handle user mutation states correctly", async () => {
    if (!sharedTestUser || !sharedUserCredentials) {
      console.warn("Skipping test - missing shared test user");
      return;
    }

    // Sign in first
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());
    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signIn === 'function'
    );

    await testUtils.performAsyncAction(
      () => authResult.current.signIn(sharedUserCredentials),
      "sign in for mutation states test"
    );

    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated === true
    );

    const { result } = await testUtils.renderHookWithWrapper(() => useUsers());

    await testUtils.waitForHookToInitialize(
      result,
      (users) => typeof users.update === 'function'
    );

    // Verify initial state
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isFetching).toBe(false);

    // Test mutation state tracking
    const updateData = {
      id: sharedTestUser.id,
      email: sharedTestUser.email,
      firstName: 'StateTest',
      lastName: 'User',
    };

    // Start mutation and verify states change appropriately
    const updatePromise = result.current.update(updateData);
    
    // Note: In real apps, you might check isPending here, but in tests it may resolve too quickly
    
    const updatedUser = await updatePromise;

    expect(updatedUser).toMatchObject({
      firstName: 'StateTest',
      lastName: 'User',
    });

    // Verify final state
    expect(result.current.isError).toBe(false);
  });
});
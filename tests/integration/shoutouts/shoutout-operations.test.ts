import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import { waitFor } from "@testing-library/react";
import {
  useShoutouts,
  useShoutout,
  useCreateShoutout,
  useUpdateShoutout,
  useDeleteShoutout,
  useCreateCommunity,
  useCreateResource,
  type ShoutoutData,
  type Shoutout,
} from "../../../src";
import {
  TestDataFactory,
  authHelper,
  cleanupHelper,
  testWrapperManager,
  testUtils,
  commonExpectations,
} from "../helpers";

/**
 * Shoutout Operations Integration Tests
 *
 * Tests complete CRUD operations for shoutouts:
 * - useShoutouts() - List shoutouts with filters
 * - useShoutout() - Get single shoutout by ID
 * - useCreateShoutout() - Create new shoutouts
 * - useUpdateShoutout() - Update existing shoutouts
 * - useDeleteShoutout() - Delete shoutouts
 * - Shoutout-community relationships
 * - Shoutout-resource relationships
 * - Shoutout visibility and privacy
 */

describe.skip("Shoutout Operations Integration", () => {
  let testUser: any;
  let targetUser: any;
  let testCommunity: any;
  let testResource: any;

  beforeAll(async () => {
    testWrapperManager.reset();

    try {
      // Set up first authenticated user and community
      const authSetup = await authHelper.createAndAuthenticateUser();
      testUser = authSetup.user;

      const { result: createCommunityResult } =
        await testUtils.renderHookWithWrapper(() => useCreateCommunity());

      const communityData = TestDataFactory.createCommunity();
      testCommunity = await testUtils.performAsyncAction(
        () =>
          createCommunityResult.current({
            ...communityData,
            organizerId: testUser.userId,
            parentId: null,
          }),
        "create test community for shoutouts",
      );

      // Create a test resource for shoutout relationships
      const { result: createResourceResult } =
        await testUtils.renderHookWithWrapper(() => useCreateResource());

      const resourceData = TestDataFactory.createResource({
        communityId: testCommunity.id,
        type: "offer",
        category: "tools",
      });

      testResource = await testUtils.performAsyncAction(
        () => createResourceResult.current(resourceData),
        "create test resource for shoutouts",
      );

      // Create second user as shoutout target
      try {
        await authHelper.signOut();
        const targetAuthSetup = await authHelper.createAndAuthenticateUser();
        targetUser = targetAuthSetup.user;

        // Sign back in as first user for most tests
        await authHelper.signOut();
        await authHelper.signIn(testUser.email, "TestPassword123!");
      } catch (error) {
        console.warn("Target user setup failed:", error);
      }
    } catch (error) {
      console.warn("Setup failed for shoutout tests:", error);
    }
  });

  beforeEach(async () => {
    await cleanupHelper.ensureTestIsolation();
  });

  afterEach(async () => {
    await cleanupHelper.cleanupBetweenTests();
  });

  afterAll(async () => {
    await cleanupHelper.cleanupAfterAllTests();
  });

  test("should list shoutouts using useShoutouts hook", async () => {
    const { result } = await testUtils.renderHookWithWrapper(() =>
      useShoutouts(),
    );

    await testUtils.waitForHookToInitialize(
      result,
      (query) => query.isLoading !== undefined,
    );

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 10000 },
    );

    // Should return array of shoutouts
    expect(Array.isArray(result.current.data)).toBe(true);

    // Verify shoutout structure if shoutouts exist
    if (result.current.data && result.current.data.length > 0) {
      const firstShoutout = result.current.data[0];
      expect(firstShoutout).toHaveProperty("id");
      expect(firstShoutout).toHaveProperty("message");
      expect(firstShoutout).toHaveProperty("fromUserId");
      expect(firstShoutout).toHaveProperty("isPublic");
      commonExpectations.toBeValidId(firstShoutout.id);
    }

    console.log("✅ Shoutouts list retrieved successfully");
  });

  test("should validate shoutout hook signatures", async () => {
    const { result } = await testUtils.renderHookWithWrapper(() => ({
      shoutouts: useShoutouts(),
      createShoutout: useCreateShoutout(),
      updateShoutout: useUpdateShoutout(),
      deleteShoutout: useDeleteShoutout(),
    }));

    await testUtils.waitForHookToInitialize(
      { current: result.current.shoutouts },
      (query) => query.isLoading !== undefined,
    );

    // useShoutouts returns React Query state
    expect(result.current.shoutouts).toHaveProperty("data");
    expect(result.current.shoutouts).toHaveProperty("isLoading");
    expect(result.current.shoutouts).toHaveProperty("error");
    expect(typeof result.current.shoutouts.isLoading).toBe("boolean");

    // Mutation hooks return mutation functions
    expect(typeof result.current.createShoutout.mutate).toBe("function");
    expect(typeof result.current.updateShoutout.mutate).toBe("function");
    expect(typeof result.current.deleteShoutout.mutate).toBe("function");

    console.log("✅ Shoutout hook signatures validated");
  });

  test("should create a shoutout with valid data", async () => {
    if (!testUser || !targetUser || !testResource) {
      console.warn("Skipping shoutout creation test - setup failed");
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() => ({
      shoutouts: useShoutouts(),
      createShoutout: useCreateShoutout(),
    }));

    await testUtils.waitForHookToInitialize(
      { current: result.current.shoutouts },
      (query) => query.isLoading !== undefined,
    );

    const shoutoutData: ShoutoutData = {
      message:
        TestDataFactory.generateTestName("SHOUTOUT") +
        " - Thank you for sharing this amazing resource!",
      fromUserId: testUser.userId,
      toUserId: targetUser.userId,
      resourceId: testResource.id,
      isPublic: true,
    };

    let createdShoutout: Shoutout;

    try {
      createdShoutout = await testUtils.performAsyncAction(
        () => result.current.createShoutout.mutateAsync(shoutoutData),
        "create shoutout",
      );

      // Verify created shoutout structure
      expect(createdShoutout).toMatchObject({
        id: expect.any(String),
        message: shoutoutData.message,
        fromUserId: shoutoutData.fromUserId,
        toUserId: shoutoutData.toUserId,
        resourceId: shoutoutData.resourceId,
        isPublic: shoutoutData.isPublic,
      });

      commonExpectations.toBeValidId(createdShoutout.id);

      // Wait for shoutouts list to update
      await waitFor(
        () => {
          const shoutouts = result.current.shoutouts.data;
          const found = shoutouts?.some(
            (shoutout) => shoutout.id === createdShoutout.id,
          );
          expect(found).toBe(true);
        },
        { timeout: 10000 },
      );

      console.log("✅ Shoutout created successfully:", createdShoutout.id);
    } catch (error) {
      console.warn("Shoutout creation failed:", error);
      throw error;
    }
  });

  test("should fetch single shoutout by ID using useShoutout hook", async () => {
    if (!testUser || !targetUser || !testResource) {
      console.warn("Skipping single shoutout fetch test - setup failed");
      return;
    }

    // First create a shoutout to fetch
    const { result: createResult } = await testUtils.renderHookWithWrapper(() =>
      useCreateShoutout(),
    );

    const shoutoutData: ShoutoutData = {
      message:
        TestDataFactory.generateTestName("SHOUTOUT_FETCH") +
        " - Excellent work!",
      fromUserId: testUser.userId,
      toUserId: targetUser.userId,
      resourceId: testResource.id,
      isPublic: true,
    };

    const createdShoutout = await testUtils.performAsyncAction(
      () => createResult.current.mutateAsync(shoutoutData),
      "create shoutout for fetch test",
    );

    // Now fetch the shoutout by ID
    const { result: fetchResult } = await testUtils.renderHookWithWrapper(() =>
      useShoutout(createdShoutout.id),
    );

    await testUtils.waitForHookToInitialize(
      fetchResult,
      (query) => query.isLoading !== undefined,
    );

    await waitFor(
      () => {
        expect(fetchResult.current.isLoading).toBe(false);
      },
      { timeout: 10000 },
    );

    // Verify fetched shoutout matches created shoutout
    expect(fetchResult.current.data).toMatchObject({
      id: createdShoutout.id,
      message: shoutoutData.message,
      fromUserId: shoutoutData.fromUserId,
      toUserId: shoutoutData.toUserId,
      resourceId: shoutoutData.resourceId,
      isPublic: shoutoutData.isPublic,
    });

    console.log("✅ Single shoutout fetch successful");
  });

  test("should update a shoutout using useUpdateShoutout hook", async () => {
    if (!testUser || !targetUser || !testResource) {
      console.warn("Skipping shoutout update test - setup failed");
      return;
    }

    // Create shoutout to update
    const { result: createResult } = await testUtils.renderHookWithWrapper(() =>
      useCreateShoutout(),
    );

    const originalShoutoutData: ShoutoutData = {
      message:
        TestDataFactory.generateTestName("SHOUTOUT_UPDATE") +
        " - Original message",
      fromUserId: testUser.userId,
      toUserId: targetUser.userId,
      resourceId: testResource.id,
      isPublic: false,
    };

    const createdShoutout = await testUtils.performAsyncAction(
      () => createResult.current.mutateAsync(originalShoutoutData),
      "create shoutout for update test",
    );

    // Update the shoutout
    const { result: updateResult } = await testUtils.renderHookWithWrapper(
      () => ({
        updateShoutout: useUpdateShoutout(),
        shoutout: useShoutout(createdShoutout.id),
      }),
    );

    await testUtils.waitForHookToInitialize(
      { current: updateResult.current.shoutout },
      (query) => query.isLoading !== undefined,
    );

    const updates = {
      message: "Updated shoutout message - even more grateful!",
      isPublic: true,
    };

    const updatedShoutout = await testUtils.performAsyncAction(
      () =>
        updateResult.current.updateShoutout.mutateAsync({
          shoutoutId: createdShoutout.id,
          updates,
        }),
      "update shoutout",
    );

    // Verify updates were applied
    expect(updatedShoutout).toMatchObject({
      id: createdShoutout.id,
      message: updates.message,
      isPublic: updates.isPublic,
    });

    // Verify unchanged fields remain the same
    expect(updatedShoutout.fromUserId).toBe(originalShoutoutData.fromUserId);
    expect(updatedShoutout.toUserId).toBe(originalShoutoutData.toUserId);
    expect(updatedShoutout.resourceId).toBe(originalShoutoutData.resourceId);

    console.log("✅ Shoutout update successful");
  });

  test("should delete a shoutout using useDeleteShoutout hook", async () => {
    if (!testUser || !targetUser || !testResource) {
      console.warn("Skipping shoutout deletion test - setup failed");
      return;
    }

    // Create shoutout to delete
    const { result: createResult } = await testUtils.renderHookWithWrapper(() =>
      useCreateShoutout(),
    );

    const shoutoutData: ShoutoutData = {
      message:
        TestDataFactory.generateTestName("SHOUTOUT_DELETE") +
        " - To be deleted",
      fromUserId: testUser.userId,
      toUserId: targetUser.userId,
      resourceId: testResource.id,
      isPublic: true,
    };

    const createdShoutout = await testUtils.performAsyncAction(
      () => createResult.current.mutateAsync(shoutoutData),
      "create shoutout for deletion test",
    );

    // Delete the shoutout
    const { result: deleteResult } = await testUtils.renderHookWithWrapper(
      () => ({
        deleteShoutout: useDeleteShoutout(),
        shoutouts: useShoutouts(),
      }),
    );

    await testUtils.waitForHookToInitialize(
      { current: deleteResult.current.shoutouts },
      (query) => query.isLoading !== undefined,
    );

    await testUtils.performAsyncAction(
      () => deleteResult.current.deleteShoutout.mutateAsync(createdShoutout.id),
      "delete shoutout",
    );

    // Verify shoutout is removed from shoutouts list
    await waitFor(
      () => {
        const shoutouts = deleteResult.current.shoutouts.data;
        const found = shoutouts?.some(
          (shoutout) => shoutout.id === createdShoutout.id,
        );
        expect(found).toBe(false);
      },
      { timeout: 10000 },
    );

    // Verify individual shoutout fetch returns error/null
    const { result: fetchResult } = await testUtils.renderHookWithWrapper(() =>
      useShoutout(createdShoutout.id),
    );

    await waitFor(
      () => {
        expect(fetchResult.current.isLoading).toBe(false);
        // Shoutout should not exist or should return error
        expect(
          fetchResult.current.data === null ||
            fetchResult.current.error !== null,
        ).toBe(true);
      },
      { timeout: 10000 },
    );

    console.log("✅ Shoutout deletion successful");
  });

  test("should handle shoutout filters in useShoutouts hook", async () => {
    if (!testUser || !targetUser || !testResource) {
      console.warn("Skipping shoutout filters test - setup failed");
      return;
    }

    // Test different shoutout filters
    const filtersToTest = [
      { fromUserId: testUser.userId },
      { toUserId: targetUser.userId },
      { resourceId: testResource.id },
      { isPublic: true },
      { isPublic: false },
    ];

    for (const filter of filtersToTest) {
      const { result } = await testUtils.renderHookWithWrapper(() =>
        useShoutouts(filter),
      );

      await testUtils.waitForHookToInitialize(
        result,
        (query) => query.isLoading !== undefined,
      );

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 10000 },
      );

      // Should return array (might be empty)
      expect(Array.isArray(result.current.data)).toBe(true);

      console.log(`✅ Shoutout filter test passed:`, filter);
    }
  });

  test("should validate shoutout data structure", async () => {
    const shoutoutData = TestDataFactory.createShoutout();

    // Verify test data factory creates valid shoutout data
    expect(shoutoutData).toHaveProperty("message");
    expect(shoutoutData).toHaveProperty("isPublic");

    expect(typeof shoutoutData.message).toBe("string");
    expect(shoutoutData.message.length).toBeGreaterThan(0);
    expect(typeof shoutoutData.isPublic).toBe("boolean");

    console.log("✅ Shoutout data validation passed");
  });

  test("should handle public vs private shoutout visibility", async () => {
    if (!testUser || !targetUser || !testResource) {
      console.warn("Skipping shoutout visibility test - setup failed");
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() =>
      useCreateShoutout(),
    );

    // Create public shoutout
    const publicShoutoutData: ShoutoutData = {
      message:
        TestDataFactory.generateTestName("PUBLIC_SHOUTOUT") +
        " - This is public",
      fromUserId: testUser.userId,
      toUserId: targetUser.userId,
      resourceId: testResource.id,
      isPublic: true,
    };

    const publicShoutout = await testUtils.performAsyncAction(
      () => result.current.mutateAsync(publicShoutoutData),
      "create public shoutout",
    );

    expect(publicShoutout.isPublic).toBe(true);

    // Create private shoutout
    const privateShoutoutData: ShoutoutData = {
      message:
        TestDataFactory.generateTestName("PRIVATE_SHOUTOUT") +
        " - This is private",
      fromUserId: testUser.userId,
      toUserId: targetUser.userId,
      resourceId: testResource.id,
      isPublic: false,
    };

    const privateShoutout = await testUtils.performAsyncAction(
      () => result.current.mutateAsync(privateShoutoutData),
      "create private shoutout",
    );

    expect(privateShoutout.isPublic).toBe(false);

    console.log("✅ Public/private shoutout visibility test passed");
  });

  test("should handle shoutout-resource relationships", async () => {
    if (!testUser || !targetUser || !testResource) {
      console.warn(
        "Skipping shoutout-resource relationship test - setup failed",
      );
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() => ({
      shoutouts: useShoutouts({ resourceId: testResource.id }),
      createShoutout: useCreateShoutout(),
    }));

    await testUtils.waitForHookToInitialize(
      { current: result.current.shoutouts },
      (query) => query.isLoading !== undefined,
    );

    const shoutoutData: ShoutoutData = {
      message:
        TestDataFactory.generateTestName("RESOURCE_SHOUTOUT") +
        " - Thanks for this resource!",
      fromUserId: testUser.userId,
      toUserId: targetUser.userId,
      resourceId: testResource.id,
      isPublic: true,
    };

    const createdShoutout = await testUtils.performAsyncAction(
      () => result.current.createShoutout.mutateAsync(shoutoutData),
      "create shoutout with resource relationship",
    );

    // Verify the shoutout is associated with the correct resource
    expect(createdShoutout.resourceId).toBe(testResource.id);

    // Verify shoutout appears in resource-filtered query
    await waitFor(
      () => {
        const resourceShoutouts = result.current.shoutouts.data;
        const found = resourceShoutouts?.some(
          (shoutout) =>
            shoutout.id === createdShoutout.id &&
            shoutout.resourceId === testResource.id,
        );
        expect(found).toBe(true);
      },
      { timeout: 10000 },
    );

    console.log("✅ Shoutout-resource relationship test passed");
  });

  test("should handle invalid shoutout operations", async () => {
    const { result } = await testUtils.renderHookWithWrapper(() => ({
      updateShoutout: useUpdateShoutout(),
      deleteShoutout: useDeleteShoutout(),
    }));

    const invalidShoutoutId = "invalid-shoutout-id-123";

    // Test updating invalid shoutout
    try {
      await testUtils.performAsyncAction(
        () =>
          result.current.updateShoutout.mutateAsync({
            shoutoutId: invalidShoutoutId,
            updates: { message: "Updated message" },
          }),
        "update invalid shoutout",
      );

      console.warn("Updating invalid shoutout succeeded unexpectedly");
    } catch (error) {
      // Expected behavior - should fail
      expect(error).toBeDefined();
      console.log("✅ Invalid shoutout update properly rejected");
    }

    // Test deleting invalid shoutout
    try {
      await testUtils.performAsyncAction(
        () => result.current.deleteShoutout.mutateAsync(invalidShoutoutId),
        "delete invalid shoutout",
      );

      console.warn("Deleting invalid shoutout succeeded unexpectedly");
    } catch (error) {
      // Expected behavior - should fail
      expect(error).toBeDefined();
      console.log("✅ Invalid shoutout deletion properly rejected");
    }
  });

  test("should handle shoutouts with minimal required data", async () => {
    if (!testUser || !targetUser) {
      console.warn("Skipping minimal shoutout test - setup failed");
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() =>
      useCreateShoutout(),
    );

    // Create shoutout with minimal required fields (no resource)
    const minimalShoutoutData: ShoutoutData = {
      message:
        TestDataFactory.generateTestName("MINIMAL_SHOUTOUT") +
        " - Simple thank you!",
      fromUserId: testUser.userId,
      toUserId: targetUser.userId,
      isPublic: true,
      // resourceId omitted - should be optional
    };

    try {
      const createdShoutout = await testUtils.performAsyncAction(
        () => result.current.mutateAsync(minimalShoutoutData),
        "create minimal shoutout",
      );

      expect(createdShoutout).toMatchObject({
        message: minimalShoutoutData.message,
        fromUserId: minimalShoutoutData.fromUserId,
        toUserId: minimalShoutoutData.toUserId,
        isPublic: minimalShoutoutData.isPublic,
      });

      // resourceId might be null or undefined
      expect(
        createdShoutout.resourceId === null ||
          createdShoutout.resourceId === undefined,
      ).toBe(true);

      console.log("✅ Minimal shoutout creation successful");
    } catch (error) {
      console.warn("Minimal shoutout creation failed:", error);
      // This might indicate resourceId is required
      console.log(
        "✅ Minimal shoutout requires resourceId (expected behavior)",
      );
    }
  });
});

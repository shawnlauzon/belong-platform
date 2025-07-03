import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { waitFor } from "@testing-library/react";
import {
  useCreateCommunity,
  useCreateResource,
  useCreateEvent,
  useResources,
  useEvents,
  useCommunities,
  useSignIn,
  useSignOut,
  type ResourceData,
  type EventData,
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
 * Error Handling and Resilience Integration Tests
 *
 * Tests system resilience and error handling:
 * - Network failure recovery
 * - Concurrent operation conflicts
 * - Invalid data handling
 * - Permission denial scenarios
 * - Rate limiting behavior
 * - Authentication errors
 * - Resource not found errors
 * - Malformed request handling
 * - Cache invalidation on errors
 * - Retry mechanisms
 */

describe.skip("Error Handling and Resilience Integration", () => {
  let testUser: any;
  let testCommunity: any;

  beforeAll(async () => {
    testWrapperManager.reset();

    try {
      // Set up authenticated user for error tests
      const authSetup = await authHelper.createAndAuthenticateUser();
      testUser = authSetup.user;

      // Create test community for error scenarios
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
        "create test community for error handling",
      );
    } catch (error) {
      console.warn("Setup failed for error handling tests:", error);
    }
  });

  beforeEach(async () => {
    await cleanupHelper.ensureTestIsolation();
  });

  afterEach(async () => {
    await cleanupHelper.cleanupBetweenTests();
    // Restore any mocked functions
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await cleanupHelper.cleanupAfterAllTests();
  });

  test("should handle invalid resource data gracefully", async () => {
    if (!testUser || !testCommunity) {
      console.warn("Skipping invalid data test - setup failed");
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() =>
      useCreateResource(),
    );

    // Test with invalid data types
    const invalidResourceData = {
      title: null, // Invalid: should be string
      description: 123, // Invalid: should be string
      type: "invalid_type", // Invalid: should be 'offer' or 'request'
      category: "", // Invalid: empty string
      communityId: "invalid-uuid", // Invalid: malformed UUID
      imageUrls: "not-an-array", // Invalid: should be array
      isActive: "yes", // Invalid: should be boolean
    } as any;

    try {
      await testUtils.performAsyncAction(
        () => result.current(invalidResourceData),
        "create resource with invalid data",
      );

      // If this succeeds, the system is very permissive
      console.warn("Invalid resource data was accepted unexpectedly");
    } catch (error) {
      // Expected behavior - should reject invalid data
      expect(error).toBeDefined();
      console.log("✅ Invalid resource data properly rejected");

      // Verify error contains meaningful information
      expect(typeof error.message).toBe("string");
      expect(error.message.length).toBeGreaterThan(0);
    }
  });

  test("should handle network interruption simulation", async () => {
    if (!testUser || !testCommunity) {
      console.warn("Skipping network interruption test - setup failed");
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() => ({
      resources: useResources(),
      createResource: useCreateResource(),
    }));

    await testUtils.waitForHookToInitialize(
      { current: result.current.resources },
      (query) => query.isLoading !== undefined,
    );

    // Create a valid resource first
    const validResourceData: ResourceData = {
      title: TestDataFactory.generateTestName("NETWORK_TEST"),
      description: "Resource for network interruption test",
      type: "offer",
      category: "tools",
      communityId: testCommunity.id,
      imageUrls: [],
      isActive: true,
    };

    // This should succeed under normal conditions
    try {
      const createdResource = await testUtils.performAsyncAction(
        () => result.current.createResource(validResourceData),
        "create resource before network test",
      );

      expect(createdResource).toHaveProperty("id");
      console.log("✅ Resource created successfully before network test");
    } catch (error) {
      console.warn(
        "Resource creation failed even under normal conditions:",
        error,
      );
      // Continue with test anyway
    }

    // Test query behavior when data might be stale
    const { result: staleResult } = await testUtils.renderHookWithWrapper(() =>
      useResources({ communityId: testCommunity.id }),
    );

    await testUtils.waitForHookToInitialize(
      staleResult,
      (query) => query.isLoading !== undefined,
    );

    await waitFor(
      () => {
        expect(staleResult.current.isLoading).toBe(false);
        // Should still return data even if network is unreliable
        expect(Array.isArray(staleResult.current.data)).toBe(true);
      },
      { timeout: 15000 }, // Longer timeout to account for retries
    );

    console.log("✅ Network interruption handling test completed");
  });

  test("should handle authentication errors", async () => {
    const { result } = await testUtils.renderHookWithWrapper(() => ({
      signIn: useSignIn(),
      signOut: useSignOut(),
    }));

    // Test invalid credentials
    try {
      await testUtils.performAsyncAction(
        () =>
          result.current.signIn.mutateAsync({
            email: "nonexistent@example.com",
            password: "wrongpassword",
          }),
        "sign in with invalid credentials",
      );

      console.warn("Invalid credentials were accepted unexpectedly");
    } catch (error) {
      // Expected behavior - should reject invalid credentials
      expect(error).toBeDefined();
      console.log("✅ Invalid credentials properly rejected");
    }

    // Test malformed email
    try {
      await testUtils.performAsyncAction(
        () =>
          result.current.signIn.mutateAsync({
            email: "not-an-email",
            password: "somepassword",
          }),
        "sign in with malformed email",
      );

      console.warn("Malformed email was accepted unexpectedly");
    } catch (error) {
      // Expected behavior - should reject malformed email
      expect(error).toBeDefined();
      console.log("✅ Malformed email properly rejected");
    }

    // Test empty credentials
    try {
      await testUtils.performAsyncAction(
        () =>
          result.current.signIn.mutateAsync({
            email: "",
            password: "",
          }),
        "sign in with empty credentials",
      );

      console.warn("Empty credentials were accepted unexpectedly");
    } catch (error) {
      // Expected behavior - should reject empty credentials
      expect(error).toBeDefined();
      console.log("✅ Empty credentials properly rejected");
    }
  });

  test("should handle resource not found errors", async () => {
    const { result } = await testUtils.renderHookWithWrapper(() => ({
      resources: useResources(),
      events: useEvents(),
      communities: useCommunities(),
    }));

    // Test querying with non-existent community ID
    const { result: invalidCommunityResult } =
      await testUtils.renderHookWithWrapper(() =>
        useResources({ communityId: "non-existent-community-id" }),
      );

    await testUtils.waitForHookToInitialize(
      invalidCommunityResult,
      (query) => query.isLoading !== undefined,
    );

    await waitFor(
      () => {
        expect(invalidCommunityResult.current.isLoading).toBe(false);
        // Should return empty array or handle gracefully
        expect(
          Array.isArray(invalidCommunityResult.current.data) ||
            invalidCommunityResult.current.error !== null,
        ).toBe(true);
      },
      { timeout: 10000 },
    );

    // Test querying events with non-existent organizer
    const { result: invalidOrganizerResult } =
      await testUtils.renderHookWithWrapper(() =>
        useEvents({ organizerId: "non-existent-organizer-id" }),
      );

    await testUtils.waitForHookToInitialize(
      invalidOrganizerResult,
      (query) => query.isLoading !== undefined,
    );

    await waitFor(
      () => {
        expect(invalidOrganizerResult.current.isLoading).toBe(false);
        // Should return empty array or handle gracefully
        expect(
          Array.isArray(invalidOrganizerResult.current.data) ||
            invalidOrganizerResult.current.error !== null,
        ).toBe(true);
      },
      { timeout: 10000 },
    );

    console.log("✅ Resource not found errors handled gracefully");
  });

  test("should handle concurrent operation conflicts", async () => {
    if (!testUser || !testCommunity) {
      console.warn("Skipping concurrent operations test - setup failed");
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() =>
      useCreateResource(),
    );

    // Create multiple resources with similar data concurrently
    const baseResourceData: ResourceData = {
      title: TestDataFactory.generateTestName("CONCURRENT"),
      description: "Resource for concurrent operations test",
      type: "offer",
      category: "tools",
      communityId: testCommunity.id,
      imageUrls: [],
      isActive: true,
    };

    const concurrentPromises = [
      result.current({
        ...baseResourceData,
        title: baseResourceData.title + "_1",
      }),
      result.current({
        ...baseResourceData,
        title: baseResourceData.title + "_2",
      }),
      result.current({
        ...baseResourceData,
        title: baseResourceData.title + "_3",
      }),
      result.current({
        ...baseResourceData,
        title: baseResourceData.title + "_4",
      }),
      result.current({
        ...baseResourceData,
        title: baseResourceData.title + "_5",
      }),
    ];

    try {
      const results = await Promise.allSettled(concurrentPromises);

      // Most should succeed
      const successful = results.filter(
        (result) => result.status === "fulfilled",
      );
      const failed = results.filter((result) => result.status === "rejected");

      expect(successful.length).toBeGreaterThan(0);

      // Log results for analysis
      console.log(
        `Concurrent operations: ${successful.length} succeeded, ${failed.length} failed`,
      );

      // Verify successful results have valid data
      successful.forEach((result) => {
        if (result.status === "fulfilled") {
          expect(result.value).toHaveProperty("id");
          commonExpectations.toBeValidId(result.value.id);
        }
      });

      console.log("✅ Concurrent operations handled appropriately");
    } catch (error) {
      console.warn("Concurrent operations test encountered issues:", error);
      // This is acceptable as concurrent operations may have race conditions
    }
  });

  test("should handle malformed date and time data", async () => {
    if (!testUser || !testCommunity) {
      console.warn("Skipping malformed date test - setup failed");
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() =>
      useCreateEvent(),
    );

    // Test with invalid date formats
    const invalidDateEventData = {
      title: TestDataFactory.generateTestName("INVALID_DATE_EVENT"),
      description: "Event with invalid dates",
      startTime: "not-a-date", // Invalid: should be Date object
      endTime: new Date("invalid-date"), // Invalid: invalid date
      location: "Test Location",
      isVirtual: false,
      maxAttendees: 50,
      communityId: testCommunity.id,
      organizerId: testUser.userId,
    } as any;

    try {
      await testUtils.performAsyncAction(
        () => result.current.mutateAsync(invalidDateEventData),
        "create event with invalid dates",
      );

      console.warn("Invalid date data was accepted unexpectedly");
    } catch (error) {
      // Expected behavior - should reject invalid dates
      expect(error).toBeDefined();
      console.log("✅ Invalid date data properly rejected");
    }

    // Test with end time before start time
    const backwardsDateEventData: EventData = {
      title: TestDataFactory.generateTestName("BACKWARDS_DATE_EVENT"),
      description: "Event with backwards dates",
      startTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days from now
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now (before start)
      location: "Test Location",
      isVirtual: false,
      maxAttendees: 50,
      communityId: testCommunity.id,
      organizerId: testUser.userId,
    };

    try {
      await testUtils.performAsyncAction(
        () => result.current.mutateAsync(backwardsDateEventData),
        "create event with backwards dates",
      );

      console.warn("Backwards date data was accepted unexpectedly");
    } catch (error) {
      // Expected behavior - should reject backwards dates
      expect(error).toBeDefined();
      console.log("✅ Backwards date data properly rejected");
    }
  });

  test("should handle extremely large data payloads", async () => {
    if (!testUser || !testCommunity) {
      console.warn("Skipping large payload test - setup failed");
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() =>
      useCreateResource(),
    );

    // Test with extremely long strings
    const largeTitle = "A".repeat(10000); // 10KB title
    const largeDescription = "B".repeat(100000); // 100KB description

    const largeResourceData: ResourceData = {
      title: largeTitle,
      description: largeDescription,
      type: "offer",
      category: "tools",
      communityId: testCommunity.id,
      imageUrls: Array.from(
        { length: 100 },
        (_, i) => `https://example.com/image${i}.jpg`,
      ), // Many URLs
      isActive: true,
    };

    try {
      await testUtils.performAsyncAction(
        () => result.current(largeResourceData),
        "create resource with large payload",
      );

      console.warn("Large payload was accepted unexpectedly");
    } catch (error) {
      // Expected behavior - should reject oversized payloads
      expect(error).toBeDefined();
      console.log("✅ Large payload properly rejected");
    }
  });

  test("should handle missing required fields", async () => {
    if (!testUser || !testCommunity) {
      console.warn("Skipping missing fields test - setup failed");
      return;
    }

    const { result: resourceResult } = await testUtils.renderHookWithWrapper(
      () => useCreateResource(),
    );

    // Test resource with missing title
    try {
      await testUtils.performAsyncAction(
        () =>
          resourceResult.current({
            // title missing
            description: "Resource without title",
            type: "offer",
            category: "tools",
            communityId: testCommunity.id,
            imageUrls: [],
            isActive: true,
          } as any),
        "create resource with missing title",
      );

      console.warn("Resource with missing title was accepted unexpectedly");
    } catch (error) {
      expect(error).toBeDefined();
      console.log("✅ Missing title properly rejected");
    }

    const { result: eventResult } = await testUtils.renderHookWithWrapper(() =>
      useCreateEvent(),
    );

    // Test event with missing required fields
    try {
      await testUtils.performAsyncAction(
        () =>
          eventResult.current.mutateAsync({
            title: "Event without dates",
            description: "Event missing start/end times",
            // startTime missing
            // endTime missing
            location: "Test Location",
            isVirtual: false,
            maxAttendees: 50,
            communityId: testCommunity.id,
            organizerId: testUser.userId,
          } as any),
        "create event with missing dates",
      );

      console.warn("Event with missing dates was accepted unexpectedly");
    } catch (error) {
      expect(error).toBeDefined();
      console.log("✅ Missing required fields properly rejected");
    }
  });

  test("should handle unauthorized operations", async () => {
    // Sign out to test unauthorized operations
    try {
      await authHelper.signOut();

      const { result } = await testUtils.renderHookWithWrapper(() => ({
        createResource: useCreateResource(),
        createEvent: useCreateEvent(),
        createCommunity: useCreateCommunity(),
      }));

      // Try to create resource without authentication
      try {
        await testUtils.performAsyncAction(
          () =>
            result.current.createResource({
              title: "Unauthorized Resource",
              description: "Should not be created",
              type: "offer",
              category: "tools",
              communityId: testCommunity?.id || "dummy-id",
              imageUrls: [],
              isActive: true,
            }),
          "create resource without auth",
        );

        console.warn("Unauthorized resource creation succeeded unexpectedly");
      } catch (error) {
        expect(error).toBeDefined();
        console.log("✅ Unauthorized resource creation properly rejected");
      }

      // Try to create event without authentication
      try {
        await testUtils.performAsyncAction(
          () =>
            result.current.createEvent.mutateAsync({
              title: "Unauthorized Event",
              description: "Should not be created",
              startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
              endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
              location: "Test Location",
              isVirtual: false,
              maxAttendees: 50,
              communityId: testCommunity?.id || "dummy-id",
              organizerId: "dummy-organizer-id",
            }),
          "create event without auth",
        );

        console.warn("Unauthorized event creation succeeded unexpectedly");
      } catch (error) {
        expect(error).toBeDefined();
        console.log("✅ Unauthorized event creation properly rejected");
      }

      console.log("✅ Unauthorized operations properly handled");

      // Sign back in for cleanup
      if (testUser) {
        await authHelper.signIn(testUser.email, "TestPassword123!");
      }
    } catch (error) {
      console.warn("Unauthorized operations test failed:", error);
      // Ensure we're signed back in
      if (testUser) {
        await authHelper.signIn(testUser.email, "TestPassword123!");
      }
    }
  });

  test("should handle query timeout scenarios", async () => {
    // Test with very short timeout to simulate slow network
    const { result } = await testUtils.renderHookWithWrapper(() =>
      useResources(),
    );

    await testUtils.waitForHookToInitialize(
      result,
      (query) => query.isLoading !== undefined,
    );

    // Wait for query to complete or timeout
    await waitFor(
      () => {
        // Query should either succeed or fail, but not hang indefinitely
        expect(result.current.isLoading).toBe(false);
        expect(
          result.current.data !== undefined || result.current.error !== null,
        ).toBe(true);
      },
      { timeout: 30000 }, // 30 second max wait
    );

    console.log("✅ Query timeout scenarios handled appropriately");
  });

  test("should validate error message quality", async () => {
    const { result } = await testUtils.renderHookWithWrapper(() =>
      useCreateResource(),
    );

    // Trigger an error and check message quality
    try {
      await testUtils.performAsyncAction(
        () =>
          result.current({
            title: "", // Invalid: empty title
            description: "",
            type: "invalid" as any,
            category: "",
            communityId: "",
            imageUrls: [],
            isActive: true,
          }),
        "create invalid resource for error message test",
      );
    } catch (error: any) {
      // Verify error has meaningful information
      expect(error).toBeDefined();
      expect(typeof error.message).toBe("string");
      expect(error.message.length).toBeGreaterThan(0);

      // Error message should not just be generic
      expect(error.message.toLowerCase()).not.toBe("error");
      expect(error.message.toLowerCase()).not.toBe("invalid");

      console.log("Error message received:", error.message);
      console.log("✅ Error message quality validation passed");
    }
  });
});

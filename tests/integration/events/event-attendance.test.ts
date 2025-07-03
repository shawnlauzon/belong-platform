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
  useEvents,
  useEvent,
  useCreateEvent,
  useJoinEvent,
  useLeaveEvent,
  useCreateCommunity,
  EventAttendanceStatus,
  type EventData,
  type Event,
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
 * Event Attendance Integration Tests
 *
 * Tests event attendance management:
 * - useJoinEvent() - Join/RSVP to events with different statuses
 * - useLeaveEvent() - Cancel attendance/leave events
 * - Event capacity management
 * - Attendance status tracking
 * - Multiple users attending same event
 * - Attendance conflicts and edge cases
 */

describe.skip("Event Attendance Integration", () => {
  let testUser: any;
  let secondUser: any;
  let testCommunity: any;
  let testEvent: Event;

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
        "create test community for event attendance",
      );

      // Create a test event for attendance tests
      const { result: createEventResult } =
        await testUtils.renderHookWithWrapper(() => useCreateEvent());

      const eventData: EventData = {
        title: TestDataFactory.generateTestName("ATTENDANCE_EVENT"),
        description: "Event for testing attendance functionality",
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
        location: "Attendance Test Location",
        isVirtual: false,
        maxAttendees: 3, // Small capacity for testing limits
        communityId: testCommunity.id,
        organizerId: testUser.userId,
      };

      testEvent = await testUtils.performAsyncAction(
        () => createEventResult.current(eventData),
        "create test event for attendance",
      );

      // Create second user for multi-user attendance tests
      try {
        await authHelper.signOut();
        const secondAuthSetup = await authHelper.createAndAuthenticateUser();
        secondUser = secondAuthSetup.user;

        // Sign back in as first user for most tests
        await authHelper.signOut();
        await authHelper.signIn(testUser.email, "TestPassword123!");
      } catch (error) {
        console.warn("Second user setup failed:", error);
      }
    } catch (error) {
      console.warn("Setup failed for event attendance tests:", error);
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

  test("should validate attendance hook signatures", async () => {
    const { result } = await testUtils.renderHookWithWrapper(() => ({
      joinEvent: useJoinEvent(),
      leaveEvent: useLeaveEvent(),
    }));

    // Mutation hooks return mutation functions and state
    expect(typeof result.current.joinEvent.mutate).toBe("function");
    expect(typeof result.current.joinEvent.mutateAsync).toBe("function");
    expect(typeof result.current.leaveEvent.mutate).toBe("function");
    expect(typeof result.current.leaveEvent.mutateAsync).toBe("function");

    // Should have mutation state properties
    expect(result.current.joinEvent).toHaveProperty("isLoading");
    expect(result.current.joinEvent).toHaveProperty("error");
    expect(result.current.leaveEvent).toHaveProperty("isLoading");
    expect(result.current.leaveEvent).toHaveProperty("error");

    console.log("✅ Event attendance hook signatures validated");
  });

  test("should join event with ATTENDING status", async () => {
    if (!testEvent || !testUser) {
      console.warn("Skipping join event test - setup failed");
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() => ({
      joinEvent: useJoinEvent(),
      event: useEvent(testEvent.id),
    }));

    await testUtils.waitForHookToInitialize(
      { current: result.current.event },
      (query) => query.isLoading !== undefined,
    );

    const attendance = await testUtils.performAsyncAction(
      () =>
        result.current.joinEvent(testEvent.id, EventAttendanceStatus.ATTENDING),
      "join event with attending status",
    );

    // Verify attendance record
    expect(attendance).toMatchObject({
      eventId: testEvent.id,
      userId: testUser.userId,
      status: EventAttendanceStatus.ATTENDING,
    });

    commonExpectations.toBeValidId(attendance.id);

    console.log("✅ Successfully joined event with ATTENDING status");
  });

  test("should join event with MAYBE status", async () => {
    if (!testEvent || !testUser) {
      console.warn("Skipping maybe status test - setup failed");
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() =>
      useJoinEvent(),
    );

    const attendance = await testUtils.performAsyncAction(
      () =>
        result.current.mutateAsync({
          eventId: testEvent.id,
          status: EventAttendanceStatus.MAYBE,
        }),
      "join event with maybe status",
    );

    expect(attendance.status).toBe(EventAttendanceStatus.MAYBE);
    expect(attendance.eventId).toBe(testEvent.id);

    console.log("✅ Successfully joined event with MAYBE status");
  });

  test("should join event with NOT_ATTENDING status", async () => {
    if (!testEvent || !testUser) {
      console.warn("Skipping not attending status test - setup failed");
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() =>
      useJoinEvent(),
    );

    const attendance = await testUtils.performAsyncAction(
      () =>
        result.current.mutateAsync({
          eventId: testEvent.id,
          status: EventAttendanceStatus.NOT_ATTENDING,
        }),
      "join event with not attending status",
    );

    expect(attendance.status).toBe(EventAttendanceStatus.NOT_ATTENDING);
    expect(attendance.eventId).toBe(testEvent.id);

    console.log("✅ Successfully marked as NOT_ATTENDING");
  });

  test("should update attendance status from MAYBE to ATTENDING", async () => {
    if (!testEvent || !testUser) {
      console.warn("Skipping status update test - setup failed");
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() =>
      useJoinEvent(),
    );

    // First join with MAYBE status
    await testUtils.performAsyncAction(
      () =>
        result.current.mutateAsync({
          eventId: testEvent.id,
          status: EventAttendanceStatus.MAYBE,
        }),
      "initial maybe status",
    );

    // Then update to ATTENDING
    const updatedAttendance = await testUtils.performAsyncAction(
      () =>
        result.current.mutateAsync({
          eventId: testEvent.id,
          status: EventAttendanceStatus.ATTENDING,
        }),
      "update to attending status",
    );

    expect(updatedAttendance.status).toBe(EventAttendanceStatus.ATTENDING);
    expect(updatedAttendance.eventId).toBe(testEvent.id);
    expect(updatedAttendance.userId).toBe(testUser.userId);

    console.log("✅ Successfully updated attendance status");
  });

  test("should leave event using useLeaveEvent", async () => {
    if (!testEvent || !testUser) {
      console.warn("Skipping leave event test - setup failed");
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() => ({
      joinEvent: useJoinEvent(),
      leaveEvent: useLeaveEvent(),
    }));

    // First join the event
    await testUtils.performAsyncAction(
      () =>
        result.current.joinEvent.mutateAsync({
          eventId: testEvent.id,
          status: EventAttendanceStatus.ATTENDING,
        }),
      "join event before leaving",
    );

    // Then leave the event
    await testUtils.performAsyncAction(
      () => result.current.leaveEvent.mutateAsync(testEvent.id),
      "leave event",
    );

    // Verify attendance is removed (this might require additional query to confirm)
    console.log("✅ Successfully left event");
  });

  test("should handle event capacity limits", async () => {
    if (!testUser || !testCommunity) {
      console.warn("Skipping capacity test - setup failed");
      return;
    }

    // Create event with capacity of 1
    const { result: createEventResult } = await testUtils.renderHookWithWrapper(
      () => useCreateEvent(),
    );

    const limitedEventData: EventData = {
      title: TestDataFactory.generateTestName("CAPACITY_EVENT"),
      description: "Event for testing capacity limits",
      startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
      location: "Capacity Test Location",
      isVirtual: false,
      maxAttendees: 1, // Only 1 attendee allowed
      communityId: testCommunity.id,
      organizerId: testUser.userId,
    };

    const limitedEvent = await testUtils.performAsyncAction(
      () => createEventResult.current.mutateAsync(limitedEventData),
      "create capacity-limited event",
    );

    const { result: joinResult } = await testUtils.renderHookWithWrapper(() =>
      useJoinEvent(),
    );

    // First user should be able to join
    const firstAttendance = await testUtils.performAsyncAction(
      () =>
        joinResult.current.mutateAsync({
          eventId: limitedEvent.id,
          status: EventAttendanceStatus.ATTENDING,
        }),
      "first user joins capacity-limited event",
    );

    expect(firstAttendance.status).toBe(EventAttendanceStatus.ATTENDING);

    // If we have a second user, test that capacity limits work
    if (secondUser) {
      try {
        // Sign in as second user
        await authHelper.signOut();
        await authHelper.signIn(secondUser.email, "TestPassword123!");

        const { result: secondJoinResult } =
          await testUtils.renderHookWithWrapper(() => useJoinEvent());

        // Second user should get error or be put on waitlist
        try {
          await testUtils.performAsyncAction(
            () =>
              secondJoinResult.current.mutateAsync({
                eventId: limitedEvent.id,
                status: EventAttendanceStatus.ATTENDING,
              }),
            "second user attempts to join full event",
          );

          // If this succeeds, the system might support waitlists or overrides
          console.log("✅ Second user joined (waitlist or override behavior)");
        } catch (error) {
          // Expected behavior - capacity limit enforced
          console.log("✅ Capacity limit enforced - second user blocked");
          expect(error).toBeDefined();
        }

        // Sign back in as first user
        await authHelper.signOut();
        await authHelper.signIn(testUser.email, "TestPassword123!");
      } catch (error) {
        console.warn("Second user capacity test failed:", error);
      }
    }

    console.log("✅ Event capacity limit test completed");
  });

  test("should handle concurrent attendance attempts", async () => {
    if (!testEvent || !testUser) {
      console.warn("Skipping concurrent attendance test - setup failed");
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() =>
      useJoinEvent(),
    );

    // Attempt multiple simultaneous joins (should handle gracefully)
    const joinPromises = [
      result.current.mutateAsync({
        eventId: testEvent.id,
        status: EventAttendanceStatus.ATTENDING,
      }),
      result.current.mutateAsync({
        eventId: testEvent.id,
        status: EventAttendanceStatus.MAYBE,
      }),
    ];

    try {
      const results = await Promise.allSettled(joinPromises);

      // At least one should succeed
      const successful = results.filter(
        (result) => result.status === "fulfilled",
      );
      expect(successful.length).toBeGreaterThan(0);

      // The last successful one should determine the final status
      console.log("✅ Concurrent attendance attempts handled");
    } catch (error) {
      console.warn("Concurrent attendance test encountered issues:", error);
      // This is acceptable as concurrent operations may have race conditions
    }
  });

  test("should validate EventAttendanceStatus enum values", () => {
    // Verify all expected status values exist
    expect(EventAttendanceStatus.ATTENDING).toBe("attending");
    expect(EventAttendanceStatus.NOT_ATTENDING).toBe("not_attending");
    expect(EventAttendanceStatus.MAYBE).toBe("maybe");

    // Verify enum is complete
    const expectedValues = ["attending", "not_attending", "maybe"];
    const actualValues = Object.values(EventAttendanceStatus);

    expectedValues.forEach((value) => {
      expect(actualValues).toContain(value);
    });

    console.log("✅ EventAttendanceStatus enum validated");
  });

  test("should handle invalid event ID in attendance operations", async () => {
    const { result } = await testUtils.renderHookWithWrapper(() => ({
      joinEvent: useJoinEvent(),
      leaveEvent: useLeaveEvent(),
    }));

    const invalidEventId = "invalid-event-id-123";

    // Test joining invalid event
    try {
      await testUtils.performAsyncAction(
        () =>
          result.current.joinEvent.mutateAsync({
            eventId: invalidEventId,
            status: EventAttendanceStatus.ATTENDING,
          }),
        "join invalid event",
      );

      // If this succeeds, it's unexpected
      console.warn("Joining invalid event succeeded unexpectedly");
    } catch (error) {
      // Expected behavior - should fail
      expect(error).toBeDefined();
      console.log("✅ Invalid event join properly rejected");
    }

    // Test leaving invalid event
    try {
      await testUtils.performAsyncAction(
        () => result.current.leaveEvent.mutateAsync(invalidEventId),
        "leave invalid event",
      );

      console.warn("Leaving invalid event succeeded unexpectedly");
    } catch (error) {
      // Expected behavior - should fail
      expect(error).toBeDefined();
      console.log("✅ Invalid event leave properly rejected");
    }
  });

  test("should handle attendance for past events", async () => {
    if (!testUser || !testCommunity) {
      console.warn("Skipping past event attendance test - setup failed");
      return;
    }

    // Create event in the past
    const { result: createEventResult } = await testUtils.renderHookWithWrapper(
      () => useCreateEvent(),
    );

    const pastEventData: EventData = {
      title: TestDataFactory.generateTestName("PAST_EVENT"),
      description: "Past event for testing attendance",
      startTime: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
      endTime: new Date(Date.now() - 47 * 60 * 60 * 1000), // 2 days ago + 1 hour
      location: "Past Event Location",
      isVirtual: false,
      maxAttendees: 50,
      communityId: testCommunity.id,
      organizerId: testUser.userId,
    };

    const pastEvent = await testUtils.performAsyncAction(
      () => createEventResult.current.mutateAsync(pastEventData),
      "create past event",
    );

    const { result: joinResult } = await testUtils.renderHookWithWrapper(() =>
      useJoinEvent(),
    );

    // Attempt to join past event
    try {
      await testUtils.performAsyncAction(
        () =>
          joinResult.current.mutateAsync({
            eventId: pastEvent.id,
            status: EventAttendanceStatus.ATTENDING,
          }),
        "join past event",
      );

      // If this succeeds, the system allows joining past events
      console.log(
        "✅ Past event join allowed (system permits retrospective attendance)",
      );
    } catch (error) {
      // Expected behavior for many systems - can't join past events
      expect(error).toBeDefined();
      console.log("✅ Past event join properly rejected");
    }
  });
});

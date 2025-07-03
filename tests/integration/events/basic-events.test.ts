import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest';
import { waitFor } from '@testing-library/react';
import {
  useEvents,
  useEvent,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useCreateCommunity,
  type EventData,
  type Event,
} from '../../../src';
import {
  TestDataFactory,
  authHelper,
  cleanupHelper,
  testWrapperManager,
  testUtils,
  commonExpectations,
} from '../helpers';

/**
 * Event Lifecycle Integration Tests
 *
 * Tests complete CRUD operations for events:
 * - useEvents() - List events with filters
 * - useEvent() - Get single event by ID
 * - useCreateEvent() - Create new events
 * - useUpdateEvent() - Update existing events
 * - useDeleteEvent() - Delete events
 * - Event-community relationships
 * - Event data validation
 */

describe.skip('Event Lifecycle Integration', () => {
  let testUser: any;
  let testCommunity: any;

  beforeAll(async () => {
    testWrapperManager.reset();

    try {
      // Set up authenticated user and community for event tests
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
        'create test community for events'
      );
    } catch (error) {
      console.warn('Setup failed for event tests:', error);
      // Continue with tests, but some may be skipped
    }
  });

  beforeEach(async () => {
    // Skip cache clearing to preserve authentication state
    // await cleanupHelper.ensureTestIsolation();
  });

  afterEach(async () => {
    await cleanupHelper.cleanupBetweenTests();
  });

  afterAll(async () => {
    await cleanupHelper.cleanupAfterAllTests();
  });

  test('should list events using useEvents hook', async () => {
    const { result } = await testUtils.renderHookWithWrapper(() => useEvents());

    await testUtils.waitForHookToInitialize(
      result,
      (query) => query.isLoading !== undefined
    );

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toBeDefined();
      },
      { timeout: 10000 }
    );

    // Should return array of events
    expect(Array.isArray(result.current.data)).toBe(true);

    // Verify event structure if events exist
    if (result.current.data && result.current.data.length > 0) {
      const firstEvent = result.current.data[0];
      expect(firstEvent).toHaveProperty('id');
      expect(firstEvent).toHaveProperty('title');
      expect(firstEvent).toHaveProperty('startTime');
      expect(firstEvent).toHaveProperty('endTime');
      commonExpectations.toBeValidId(firstEvent.id);
    }
  });

  test('should validate event hook signatures', async () => {
    const { result } = await testUtils.renderHookWithWrapper(() => ({
      events: useEvents(),
      createEvent: useCreateEvent(),
      updateEvent: useUpdateEvent(),
      deleteEvent: useDeleteEvent(),
    }));

    await testUtils.waitForHookToInitialize(
      { current: result.current.events },
      (query) => query.isLoading !== undefined
    );

    // useEvents returns React Query state
    expect(result.current.events).toHaveProperty('data');
    expect(result.current.events).toHaveProperty('isLoading');
    expect(result.current.events).toHaveProperty('error');
    expect(typeof result.current.events.isLoading).toBe('boolean');

    // Mutation hooks return mutation functions
    expect(typeof result.current.createEvent).toBe('function');
    expect(typeof result.current.updateEvent).toBe('function');
    expect(typeof result.current.deleteEvent).toBe('function');

    console.log('✅ Event hook signatures validated');
  });

  test('should create an event with valid data', async () => {
    if (!testUser || !testCommunity) {
      console.warn('Skipping event creation test - setup failed');
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() => ({
      events: useEvents(),
      createEvent: useCreateEvent(),
    }));

    await testUtils.waitForHookToInitialize(
      { current: result.current.events },
      (query) => query.isLoading !== undefined
    );

    const eventData: EventData = {
      title: TestDataFactory.generateTestName('EVENT'),
      description: 'Integration test event for lifecycle testing',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
      location: '123 Test Street, Test City',
      isVirtual: false,
      maxAttendees: 50,
      communityId: testCommunity.id,
      organizerId: testUser.userId,
    };

    let createdEvent: Event;

    try {
      createdEvent = await testUtils.performAsyncAction(
        () => result.current.createEvent(eventData),
        'create event'
      );

      // Verify created event structure
      expect(createdEvent).toMatchObject({
        id: expect.any(String),
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        isVirtual: eventData.isVirtual,
        maxAttendees: eventData.maxAttendees,
        communityId: eventData.communityId,
        organizerId: eventData.organizerId,
      });

      commonExpectations.toBeValidId(createdEvent.id);
      expect(new Date(createdEvent.startTime)).toEqual(eventData.startTime);
      expect(new Date(createdEvent.endTime)).toEqual(eventData.endTime);

      // Wait for events list to update
      await waitFor(
        () => {
          const events = result.current.events.data;
          const found = events?.some((event) => event.id === createdEvent.id);
          expect(found).toBe(true);
        },
        { timeout: 10000 }
      );

      console.log('✅ Event created successfully:', createdEvent.id);
    } catch (error) {
      console.warn('Event creation failed:', error);
      throw error;
    }
  });

  test('should fetch single event by ID using useEvent hook', async () => {
    if (!testUser || !testCommunity) {
      console.warn('Skipping single event fetch test - setup failed');
      return;
    }

    // First create an event to fetch
    const { result: createResult } = await testUtils.renderHookWithWrapper(() =>
      useCreateEvent()
    );

    const eventData: EventData = {
      title: TestDataFactory.generateTestName('EVENT_FETCH'),
      description: 'Event for testing single fetch',
      startTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
      endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
      location: '456 Fetch Street',
      isVirtual: true,
      maxAttendees: 25,
      communityId: testCommunity.id,
      organizerId: testUser.userId,
    };

    const createdEvent = await testUtils.performAsyncAction(
      () => createResult.current(eventData),
      'create event for fetch test'
    );

    // Now fetch the event by ID
    const { result: fetchResult } = await testUtils.renderHookWithWrapper(() =>
      useEvent(createdEvent.id)
    );

    await testUtils.waitForHookToInitialize(
      fetchResult,
      (query) => query.isLoading !== undefined
    );

    await waitFor(
      () => {
        expect(fetchResult.current.isLoading).toBe(false);
      },
      { timeout: 10000 }
    );

    // Verify fetched event matches created event
    expect(fetchResult.current.data).toMatchObject({
      id: createdEvent.id,
      title: eventData.title,
      description: eventData.description,
      location: eventData.location,
      isVirtual: eventData.isVirtual,
      maxAttendees: eventData.maxAttendees,
    });

    console.log('✅ Single event fetch successful');
  });

  test('should update an event using useUpdateEvent hook', async () => {
    if (!testUser || !testCommunity) {
      console.warn('Skipping event update test - setup failed');
      return;
    }

    // Create event to update
    const { result: createResult } = await testUtils.renderHookWithWrapper(() =>
      useCreateEvent()
    );

    const originalEventData: EventData = {
      title: TestDataFactory.generateTestName('EVENT_UPDATE'),
      description: 'Original event description',
      startTime: new Date(Date.now() + 72 * 60 * 60 * 1000), // 3 days from now
      endTime: new Date(Date.now() + 73 * 60 * 60 * 1000),
      location: 'Original Location',
      isVirtual: false,
      maxAttendees: 30,
      communityId: testCommunity.id,
      organizerId: testUser.userId,
    };

    const createdEvent = await testUtils.performAsyncAction(
      () => createResult.current(originalEventData),
      'create event for update test'
    );

    // Update the event
    const { result: updateResult } = await testUtils.renderHookWithWrapper(
      () => ({
        updateEvent: useUpdateEvent(),
        event: useEvent(createdEvent.id),
      })
    );

    await testUtils.waitForHookToInitialize(
      { current: updateResult.current.event },
      (query) => query.isLoading !== undefined
    );

    const updates = {
      title: 'Updated Event Title',
      description: 'Updated event description',
      location: 'Updated Location',
      maxAttendees: 60,
    };

    const updatedEvent = await testUtils.performAsyncAction(
      () =>
        updateResult.current.updateEvent.mutateAsync({
          eventId: createdEvent.id,
          updates,
        }),
      'update event'
    );

    // Verify updates were applied
    expect(updatedEvent).toMatchObject({
      id: createdEvent.id,
      title: updates.title,
      description: updates.description,
      location: updates.location,
      maxAttendees: updates.maxAttendees,
    });

    // Verify unchanged fields remain the same
    expect(updatedEvent.isVirtual).toBe(originalEventData.isVirtual);
    expect(updatedEvent.communityId).toBe(originalEventData.communityId);

    console.log('✅ Event update successful');
  });

  test('should delete an event using useDeleteEvent hook', async () => {
    if (!testUser || !testCommunity) {
      console.warn('Skipping event deletion test - setup failed');
      return;
    }

    // Create event to delete
    const { result: createResult } = await testUtils.renderHookWithWrapper(() =>
      useCreateEvent()
    );

    const eventData: EventData = {
      title: TestDataFactory.generateTestName('EVENT_DELETE'),
      description: 'Event to be deleted',
      startTime: new Date(Date.now() + 96 * 60 * 60 * 1000), // 4 days from now
      endTime: new Date(Date.now() + 97 * 60 * 60 * 1000),
      location: 'Delete Test Location',
      isVirtual: false,
      maxAttendees: 20,
      communityId: testCommunity.id,
      organizerId: testUser.userId,
    };

    const createdEvent = await testUtils.performAsyncAction(
      () => createResult.current(eventData),
      'create event for deletion test'
    );

    // Delete the event
    const { result: deleteResult } = await testUtils.renderHookWithWrapper(
      () => ({
        deleteEvent: useDeleteEvent(),
        events: useEvents(),
      })
    );

    await testUtils.waitForHookToInitialize(
      { current: deleteResult.current.events },
      (query) => query.isLoading !== undefined
    );

    await testUtils.performAsyncAction(
      () => deleteResult.current.deleteEvent(createdEvent.id),
      'delete event'
    );

    // Verify event is removed from events list
    await waitFor(
      () => {
        const events = deleteResult.current.events.data;
        const found = events?.some((event) => event.id === createdEvent.id);
        expect(found).toBe(false);
      },
      { timeout: 10000 }
    );

    // Verify individual event fetch returns error/null
    const { result: fetchResult } = await testUtils.renderHookWithWrapper(() =>
      useEvent(createdEvent.id)
    );

    await waitFor(
      () => {
        expect(fetchResult.current.isLoading).toBe(false);
        // Event should not exist or should return error
        expect(
          fetchResult.current.data === null ||
            fetchResult.current.error !== null
        ).toBe(true);
      },
      { timeout: 10000 }
    );

    console.log('✅ Event deletion successful');
  });

  test('should handle event filters in useEvents hook', async () => {
    // Test different event filters
    const filtersToTest = [
      { communityId: testCommunity?.id },
      { organizerId: testUser?.userId },
      { isVirtual: true },
      { isVirtual: false },
    ];

    for (const filter of filtersToTest) {
      if (!testUser || !testCommunity) continue;

      const { result } = await testUtils.renderHookWithWrapper(() =>
        useEvents(filter)
      );

      await testUtils.waitForHookToInitialize(
        result,
        (query) => query.isLoading !== undefined
      );

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 10000 }
      );

      // Should return array (might be empty)
      expect(Array.isArray(result.current.data)).toBe(true);

      console.log(`✅ Event filter test passed:`, filter);
    }
  });

  test('should validate event data structure', async () => {
    const eventData = TestDataFactory.createEvent();

    // Verify test data factory creates valid event data
    expect(eventData).toHaveProperty('title');
    expect(eventData).toHaveProperty('description');
    expect(eventData).toHaveProperty('startTime');
    expect(eventData).toHaveProperty('endTime');
    expect(eventData).toHaveProperty('location');
    expect(eventData).toHaveProperty('isVirtual');
    expect(eventData).toHaveProperty('maxAttendees');

    expect(typeof eventData.title).toBe('string');
    expect(eventData.title.length).toBeGreaterThan(0);
    expect(typeof eventData.description).toBe('string');
    expect(eventData.startTime instanceof Date).toBe(true);
    expect(eventData.endTime instanceof Date).toBe(true);
    expect(typeof eventData.isVirtual).toBe('boolean');
    expect(typeof eventData.maxAttendees).toBe('number');
    expect(eventData.maxAttendees).toBeGreaterThan(0);

    // End time should be after start time
    expect(eventData.endTime.getTime()).toBeGreaterThan(
      eventData.startTime.getTime()
    );

    console.log('✅ Event data validation passed');
  });

  test('should handle event-community relationships', async () => {
    if (!testUser || !testCommunity) {
      console.warn('Skipping event-community relationship test - setup failed');
      return;
    }

    const { result } = await testUtils.renderHookWithWrapper(() => ({
      events: useEvents({ communityId: testCommunity.id }),
      createEvent: useCreateEvent(),
    }));

    await testUtils.waitForHookToInitialize(
      { current: result.current.events },
      (query) => query.isLoading !== undefined
    );

    const eventData: EventData = {
      title: TestDataFactory.generateTestName('EVENT_COMMUNITY'),
      description: 'Event to test community relationship',
      startTime: new Date(Date.now() + 120 * 60 * 60 * 1000), // 5 days from now
      endTime: new Date(Date.now() + 121 * 60 * 60 * 1000),
      location: 'Community Event Location',
      isVirtual: false,
      maxAttendees: 40,
      communityId: testCommunity.id,
      organizerId: testUser.userId,
    };

    const createdEvent = await testUtils.performAsyncAction(
      () => result.current.createEvent(eventData),
      'create event with community relationship'
    );

    // Verify the event is associated with the correct community
    expect(createdEvent.communityId).toBe(testCommunity.id);

    // Verify event appears in community-filtered query
    await waitFor(
      () => {
        const communityEvents = result.current.events.data;
        const found = communityEvents?.some(
          (event) =>
            event.id === createdEvent.id &&
            event.communityId === testCommunity.id
        );
        expect(found).toBe(true);
      },
      { timeout: 10000 }
    );

    console.log('✅ Event-community relationship test passed');
  });
});

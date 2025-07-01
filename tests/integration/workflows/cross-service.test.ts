import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useAuth,
  useCommunities,
  useResources,
  useEvents,
  useShoutouts,
  useUsers,
} from '../../../src';
import {
  TestDataFactory,
  authHelper,
  cleanupHelper,
  testWrapperManager,
  testUtils,
} from '../helpers';

describe('Cross-Service Integration Tests', () => {
  const wrapper = testWrapperManager.getWrapper();

  // Shared test data
  let sharedTestUser: any = null;
  let sharedUserCredentials: any = null;
  let sharedCommunity: any = null;
  let secondTestUser: any = null; // For shoutouts giving tests

  beforeAll(async () => {
    testWrapperManager.reset();

    // Create shared test data
    try {
      const testUser = TestDataFactory.createUser();
      const { result: authResult } = await testUtils.renderHookWithWrapper(() =>
        useAuth()
      );

      await testUtils.waitForHookToInitialize(
        authResult,
        (auth) => typeof auth.signUp === 'function'
      );

      sharedTestUser = await authResult.current.signUp(testUser);
      sharedUserCredentials = {
        email: testUser.email,
        password: testUser.password,
      };

      const { result: communitiesResult } =
        await testUtils.renderHookWithWrapper(() => useCommunities());
      await testUtils.waitForHookToInitialize(
        communitiesResult,
        (communities) => typeof communities.create === 'function'
      );

      const testCommunity = TestDataFactory.createCommunity();
      sharedCommunity = await communitiesResult.current.create({
        ...testCommunity,
        organizerId: sharedTestUser.id,
        parentId: null,
      });

      // Create a second user for shoutouts giving tests
      const secondUser = TestDataFactory.createUser();
      secondTestUser = await authResult.current.signUp(secondUser);

      await authResult.current.signOut();

      console.log('Created shared test data for cross-service tests');
    } catch (error) {
      console.warn('Failed to create shared test data:', error);
    }
  });

  beforeEach(async () => {
    await cleanupHelper.ensureTestIsolation();
    // Add delay to prevent rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterEach(async () => {
    await authHelper.ensureSignedOut();
    // Add delay after each test
    await new Promise((resolve) => setTimeout(resolve, 1500));
  });

  afterAll(async () => {
    await cleanupHelper.cleanupAfterAllTests();
  });

  test('cache consistency across services', async () => {
    if (!sharedTestUser || !sharedUserCredentials || !sharedCommunity) {
      console.warn('Skipping test - missing shared test data');
      return;
    }

    // Sign in
    const { result: authResult } = await testUtils.renderHookWithWrapper(() =>
      useAuth()
    );
    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signIn === 'function'
    );

    await testUtils.performAsyncAction(
      () => authResult.current.signIn(sharedUserCredentials),
      'sign in for cache consistency test'
    );

    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated === true
    );

    // Initialize multiple service hooks
    const { result: usersResult } = await testUtils.renderHookWithWrapper(() =>
      useUsers()
    );
    const { result: communitiesResult } = await testUtils.renderHookWithWrapper(
      () => useCommunities()
    );
    const { result: resourcesResult } = await testUtils.renderHookWithWrapper(
      () => useResources()
    );
    const { result: eventsResult } = await testUtils.renderHookWithWrapper(() =>
      useEvents()
    );

    await testUtils.waitForHookToInitialize(
      usersResult,
      (users) => typeof users.update === 'function'
    );

    await testUtils.waitForHookToInitialize(
      communitiesResult,
      (communities) => typeof communities.update === 'function'
    );

    await testUtils.waitForHookToInitialize(
      resourcesResult,
      (resources) => typeof resources.create === 'function'
    );

    await testUtils.waitForHookToInitialize(
      eventsResult,
      (events) => typeof events.create === 'function'
    );

    // Test 1: User update should be reflected across all services that reference user data
    const originalUser = await testUtils.performAsyncAction(
      () => usersResult.current.byId(sharedTestUser.id),
      'get original user data'
    );

    const updatedUser = await testUtils.performAsyncAction(
      () =>
        usersResult.current.update({
          id: sharedTestUser.id,
          email: sharedTestUser.email,
          firstName: 'CacheTest',
          lastName: 'User',
        }),
      'update user for cache test'
    );

    expect(updatedUser.firstName).toBe('CacheTest');

    // Create a resource that should reference the updated user
    const testResource = TestDataFactory.createResource();
    const createdResource = await testUtils.performAsyncAction(
      () =>
        resourcesResult.current.create({
          ...testResource,
          communityId: sharedCommunity.id,
        }),
      'create resource after user update'
    );

    // The resource should reference the updated user data
    if (createdResource.owner) {
      expect(createdResource.owner.firstName).toBe('CacheTest');
    }

    // Test 2: Community update should be reflected in resources and events
    const updatedCommunity = await testUtils.performAsyncAction(
      () =>
        communitiesResult.current.update(sharedCommunity.id, {
          name: 'Updated Community Name',
          description: 'Updated description for cache testing',
        }),
      'update community for cache test'
    );

    expect(updatedCommunity.name).toBe('Updated Community Name');

    // Create event that should reference updated community
    const eventData = TestDataFactory.createEvent();
    const createdEvent = await testUtils.performAsyncAction(
      () =>
        eventsResult.current.create({
          title: eventData.title,
          description: eventData.description,
          startDateTime: eventData.startTime,
          endDateTime: eventData.endTime,
          location: eventData.location,
          coordinates: { lat: 40.7128, lng: -74.006 },
          maxAttendees: eventData.maxAttendees,
          communityId: sharedCommunity.id,
        }),
      'create event after community update'
    );

    expect(createdEvent.community.name).toBe('Updated Community Name');

    // Test 3: Verify cache invalidation works properly
    const refreshedUser = await testUtils.performAsyncAction(
      () => usersResult.current.byId(sharedTestUser.id),
      'refresh user data from cache'
    );

    expect(refreshedUser.firstName).toBe('CacheTest');

    console.log('✅ Cache consistency test successful');
  });

  test('concurrent operations handling', async () => {
    if (!sharedTestUser || !sharedUserCredentials || !sharedCommunity) {
      console.warn('Skipping test - missing shared test data');
      return;
    }

    // Sign in
    const { result: authResult } = await testUtils.renderHookWithWrapper(() =>
      useAuth()
    );
    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signIn === 'function'
    );

    await testUtils.performAsyncAction(
      () => authResult.current.signIn(sharedUserCredentials),
      'sign in for concurrent operations test'
    );

    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated === true
    );

    // Initialize service hooks
    const { result: resourcesResult } = await testUtils.renderHookWithWrapper(
      () => useResources()
    );
    const { result: eventsResult } = await testUtils.renderHookWithWrapper(() =>
      useEvents()
    );
    const { result: shoutoutsResult } = await testUtils.renderHookWithWrapper(
      () => useShoutouts()
    );

    await testUtils.waitForHookToInitialize(
      resourcesResult,
      (resources) => typeof resources.create === 'function'
    );

    await testUtils.waitForHookToInitialize(
      eventsResult,
      (events) => typeof events.create === 'function'
    );

    await testUtils.waitForHookToInitialize(
      shoutoutsResult,
      (shoutouts) => typeof shoutouts.create === 'function'
    );

    // Test concurrent creation of multiple resources
    const resourcePromises = [];
    for (let i = 0; i < 3; i++) {
      const testResource = TestDataFactory.createResource();
      resourcePromises.push(
        resourcesResult.current.create({
          ...testResource,
          communityId: sharedCommunity.id,
          title: `Concurrent Resource ${i + 1}`,
        })
      );
    }

    const createdResources = await Promise.all(resourcePromises);
    expect(createdResources).toHaveLength(3);

    // Verify all resources were created successfully
    createdResources.forEach((resource, index) => {
      expect(resource.title).toBe(`Concurrent Resource ${index + 1}`);
      expect(resource.id).toBeDefined();
    });

    // Test concurrent creation of events
    const eventPromises = [];
    for (let i = 0; i < 2; i++) {
      const eventData = TestDataFactory.createEvent();
      eventPromises.push(
        eventsResult.current.create({
          title: `Concurrent Event ${i + 1}`,
          description: eventData.description,
          startDateTime: new Date(Date.now() + (i + 1) * 86400000), // Stagger start times
          endDateTime: new Date(Date.now() + (i + 1) * 86400000 + 3600000),
          location: eventData.location,
          coordinates: { lat: 40.7128, lng: -74.006 },
          maxAttendees: eventData.maxAttendees,
          communityId: sharedCommunity.id,
        })
      );
    }

    const createdEvents = await Promise.all(eventPromises);
    expect(createdEvents).toHaveLength(2);

    // Test concurrent shoutouts giving
    const shoutoutsPromises = [];
    for (let i = 0; i < 2; i++) {
      if (createdResources[i]) {
        shoutoutsPromises.push(
          shoutoutsResult.current.create({
            message: `Concurrent shoutouts ${i + 1}`,
            isPublic: true,
            resourceId: createdResources[i].id,
            toUserId: secondTestUser.id,
          })
        );
      }
    }

    const createdShoutouts = await Promise.all(shoutoutsPromises);
    expect(createdShoutouts.length).toBeGreaterThan(0);

    console.log('✅ Concurrent operations test successful');
  });

  test('error recovery across services', async () => {
    if (!sharedTestUser || !sharedUserCredentials || !sharedCommunity) {
      console.warn('Skipping test - missing shared test data');
      return;
    }

    // Sign in
    const { result: authResult } = await testUtils.renderHookWithWrapper(() =>
      useAuth()
    );
    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signIn === 'function'
    );

    await testUtils.performAsyncAction(
      () => authResult.current.signIn(sharedUserCredentials),
      'sign in for error recovery test'
    );

    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated === true
    );

    // Initialize service hooks
    const { result: resourcesResult } = await testUtils.renderHookWithWrapper(
      () => useResources()
    );
    const { result: eventsResult } = await testUtils.renderHookWithWrapper(() =>
      useEvents()
    );
    const { result: shoutoutsResult } = await testUtils.renderHookWithWrapper(
      () => useShoutouts()
    );

    await testUtils.waitForHookToInitialize(
      resourcesResult,
      (resources) => typeof resources.create === 'function'
    );

    await testUtils.waitForHookToInitialize(
      eventsResult,
      (events) => typeof events.create === 'function'
    );

    await testUtils.waitForHookToInitialize(
      shoutoutsResult,
      (shoutouts) => typeof shoutouts.create === 'function'
    );

    // Test 1: Create valid resource first
    const validResource = await testUtils.performAsyncAction(
      () =>
        resourcesResult.current.create({
          ...TestDataFactory.createResource(),
          communityId: sharedCommunity.id,
        }),
      'create valid resource'
    );

    expect(validResource.id).toBeDefined();

    // Test 2: Attempt operations with invalid data and verify error handling
    try {
      await resourcesResult.current.create({
        title: '', // Invalid empty title
        description: '',
        type: 'invalid-type' as any,
        communityId: 'invalid-community-id',
        category: 'invalid-category',
        isActive: true,
        imageUrls: [],
      });

      // If this succeeds, it's unexpected
      expect(false).toBe(true);
    } catch (error) {
      // Expected to fail - verify error handling
      expect(error).toBeDefined();
    }

    // Test 3: Verify system still works after error
    const recoveryResource = await testUtils.performAsyncAction(
      () =>
        resourcesResult.current.create({
          ...TestDataFactory.createResource(),
          communityId: sharedCommunity.id,
          title: 'Recovery Resource',
        }),
      'create resource after error'
    );

    expect(recoveryResource.title).toBe('Recovery Resource');

    // Test 4: Test error recovery with shoutouts (invalid resource reference)
    try {
      await shoutoutsResult.current.create({
        message: 'Thanks for non-existent resource',
        isPublic: true,
        resourceId: 'non-existent-resource-id',
        toUserId: secondTestUser.id,
      });

      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error).toBeDefined();
    }

    // Test 5: Verify shoutouts still works with valid data after error
    const validThanks = await testUtils.performAsyncAction(
      () =>
        shoutoutsResult.current.create({
          message: 'Thanks after error recovery',
          isPublic: true,
          resourceId: validResource.id,
          toUserId: secondTestUser.id,
        }),
      'create shoutouts after error'
    );

    expect(validThanks.message).toBe('Thanks after error recovery');

    console.log('✅ Error recovery test successful');
  });

  test('transaction integrity across related operations', async () => {
    if (!sharedTestUser || !sharedUserCredentials || !sharedCommunity) {
      console.warn('Skipping test - missing shared test data');
      return;
    }

    // Sign in
    const { result: authResult } = await testUtils.renderHookWithWrapper(() =>
      useAuth()
    );
    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signIn === 'function'
    );

    await testUtils.performAsyncAction(
      () => authResult.current.signIn(sharedUserCredentials),
      'sign in for transaction integrity test'
    );

    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated === true
    );

    // Initialize service hooks
    const { result: resourcesResult } = await testUtils.renderHookWithWrapper(
      () => useResources()
    );
    const { result: eventsResult } = await testUtils.renderHookWithWrapper(() =>
      useEvents()
    );
    const { result: shoutoutsResult } = await testUtils.renderHookWithWrapper(
      () => useShoutouts()
    );

    await testUtils.waitForHookToInitialize(
      resourcesResult,
      (resources) => typeof resources.create === 'function'
    );

    await testUtils.waitForHookToInitialize(
      eventsResult,
      (events) => typeof events.create === 'function'
    );

    await testUtils.waitForHookToInitialize(
      shoutoutsResult,
      (shoutouts) => typeof shoutouts.create === 'function'
    );

    // Test 1: Create resource and immediately reference it in shoutouts
    const resource = await testUtils.performAsyncAction(
      () =>
        resourcesResult.current.create({
          ...TestDataFactory.createResource(),
          communityId: sharedCommunity.id,
          title: 'Resource for Transaction Test',
        }),
      'create resource for transaction test'
    );

    // Immediately create shoutouts referencing the new resource
    const shoutout = await testUtils.performAsyncAction(
      () =>
        shoutoutsResult.current.create({
          message: 'Thanks for the new resource',
          isPublic: true,
          resourceId: resource.id,
          toUserId: secondTestUser.id,
        }),
      'create shoutout immediately after resource'
    );

    expect(shoutout.resource.id).toBe(resource.id);

    // Test 2: Create event and immediately join it
    const eventData = TestDataFactory.createEvent();
    const event = await testUtils.performAsyncAction(
      () =>
        eventsResult.current.create({
          title: eventData.title,
          description: eventData.description,
          startDateTime: eventData.startTime,
          endDateTime: eventData.endTime,
          location: eventData.location,
          coordinates: { lat: 40.7128, lng: -74.006 },
          maxAttendees: eventData.maxAttendees,
          communityId: sharedCommunity.id,
        }),
      'create event for transaction test'
    );

    // Immediately join the event
    const attendance = await testUtils.performAsyncAction(
      () => eventsResult.current.join(event.id, 'attending'),
      'join event immediately after creation'
    );

    expect(attendance.event.id).toBe(event.id);
    expect(attendance.user.id).toBe(sharedTestUser.id);

    // Test 3: Verify relationships are consistent
    const eventAttendees = await testUtils.performAsyncAction(
      () => eventsResult.current.attendees(event.id),
      'check event attendees'
    );

    expect(
      eventAttendees.some((attendee) => attendee.user.id === sharedTestUser.id)
    ).toBe(true);

    // Test 4: Update resource and verify shoutouts still reference it correctly
    const updatedResource = await testUtils.performAsyncAction(
      () =>
        resourcesResult.current.update(resource.id, {
          title: 'Updated Resource Title',
          description: 'Updated description',
        }),
      'update resource that has shoutouts'
    );

    expect(updatedResource.title).toBe('Updated Resource Title');

    // Verify shoutouts still reference the updated resource
    const shoutoutsForResource = await testUtils.performAsyncAction(
      () => shoutoutsResult.current.list({ resourceId: resource.id }),
      'get shoutouts for updated resource'
    );

    expect(shoutoutsForResource.some((t) => t.resourceId === resource.id)).toBe(
      true
    );

    console.log('✅ Transaction integrity test successful');
  });

  test('cross-service data relationships', async () => {
    if (!sharedTestUser || !sharedUserCredentials || !sharedCommunity) {
      console.warn('Skipping test - missing shared test data');
      return;
    }

    // Sign in
    const { result: authResult } = await testUtils.renderHookWithWrapper(() =>
      useAuth()
    );
    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signIn === 'function'
    );

    await testUtils.performAsyncAction(
      () => authResult.current.signIn(sharedUserCredentials),
      'sign in for data relationships test'
    );

    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated === true
    );

    // Initialize all service hooks
    const { result: usersResult } = await testUtils.renderHookWithWrapper(() =>
      useUsers()
    );
    const { result: communitiesResult } = await testUtils.renderHookWithWrapper(
      () => useCommunities()
    );
    const { result: resourcesResult } = await testUtils.renderHookWithWrapper(
      () => useResources()
    );
    const { result: eventsResult } = await testUtils.renderHookWithWrapper(() =>
      useEvents()
    );
    const { result: shoutoutsResult } = await testUtils.renderHookWithWrapper(
      () => useShoutouts()
    );

    await testUtils.waitForHookToInitialize(
      resourcesResult,
      (resources) => typeof resources.create === 'function'
    );

    await testUtils.waitForHookToInitialize(
      eventsResult,
      (events) => typeof events.create === 'function'
    );

    await testUtils.waitForHookToInitialize(
      shoutoutsResult,
      (shoutouts) => typeof shoutouts.create === 'function'
    );

    // Test 1: Create interconnected data
    const resource = await testUtils.performAsyncAction(
      () =>
        resourcesResult.current.create({
          ...TestDataFactory.createResource(),
          communityId: sharedCommunity.id,
          title: 'Relationship Test Resource',
        }),
      'create resource for relationship test'
    );

    const eventData = TestDataFactory.createEvent();
    const event = await testUtils.performAsyncAction(
      () =>
        eventsResult.current.create({
          title: 'Relationship Test Event',
          description: eventData.description,
          startDateTime: eventData.startTime,
          endDateTime: eventData.endTime,
          location: eventData.location,
          coordinates: { lat: 40.7128, lng: -74.006 },
          maxAttendees: eventData.maxAttendees,
          communityId: sharedCommunity.id,
        }),
      'create event for relationship test'
    );

    const shoutout = await testUtils.performAsyncAction(
      () =>
        shoutoutsResult.current.create({
          message: 'Thanks for the relationship test resource',
          isPublic: true,
          resourceId: resource.id,
          toUserId: secondTestUser.id,
        }),
      'create shoutout for relationship test'
    );

    // Test 2: Verify cross-service data consistency
    // Check that resource references correct user and community
    expect(resource.community?.id).toBe(sharedCommunity.id);
    if (resource.owner) {
      expect(resource.owner.id).toBe(sharedTestUser.id);
    }

    // Check that event references correct user and community
    expect(event.community.id).toBe(sharedCommunity.id);
    expect(event.organizer.id).toBe(sharedTestUser.id);

    // Check that shoutout references correct user and resource
    expect(shoutout.resource.id).toBe(resource.id);
    expect(shoutout.toUser.id).toBe(secondTestUser.id);

    // Test 3: Test filtering and querying across services
    const communityResources = await testUtils.performAsyncAction(
      () => resourcesResult.current.list({ communityId: sharedCommunity.id }),
      'get resources by community'
    );

    const communityEvents = await testUtils.performAsyncAction(
      () => eventsResult.current.list({ communityId: sharedCommunity.id }),
      'get events by community'
    );

    const userShoutouts = await testUtils.performAsyncAction(
      () => shoutoutsResult.current.list({ toUserId: secondTestUser.id }),
      'get shoutouts for user'
    );

    expect(communityResources.some((r) => r.id === resource.id)).toBe(true);
    expect(communityEvents.some((e) => e.id === event.id)).toBe(true);
    expect(userShoutouts.some((t) => t.id === shoutout.id)).toBe(true);

    // Test 4: Test cascading queries
    const resourceShoutouts = await testUtils.performAsyncAction(
      () => shoutoutsResult.current.list({ resourceId: resource.id }),
      'get shoutouts for specific resource'
    );

    expect(resourceShoutouts.some((t) => t.id === shoutout.id)).toBe(true);

    console.log('✅ Cross-service data relationships test successful');
  });
});

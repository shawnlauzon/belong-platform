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
  useCommunities,
  useResources,
  useEvents,
  useShoutouts,
  useUsers,
} from "@belongnetwork/platform";
import {
  TestDataFactory,
  authHelper,
  cleanupHelper,
  testWrapperManager,
  testUtils,
} from "../helpers";

describe("Multi-Step Workflow Integration Tests", () => {
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

  test("complete user onboarding journey", async () => {
    // Step 1: User signs up
    const testUser = TestDataFactory.createUser();
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signUp === 'function'
    );

    const newUser = await testUtils.performAsyncAction(
      () => authResult.current.signUp(testUser),
      "user sign up"
    );

    expect(newUser).toMatchObject({
      email: testUser.email.toLowerCase(), // Auth system normalizes emails to lowercase
      firstName: testUser.firstName,
      lastName: testUser.lastName,
    });

    // Wait for authentication state to update
    await testUtils.waitForCondition(
      () => authResult.current.isAuthenticated === true
    );

    expect(authResult.current.isAuthenticated).toBe(true);
    expect(authResult.current.currentUser?.id).toBe(newUser.id);

    // Step 2: User updates their profile
    const { result: usersResult } = await testUtils.renderHookWithWrapper(() => useUsers());
    await testUtils.waitForHookToInitialize(
      usersResult,
      (users) => typeof users.update === 'function'
    );

    const updatedProfile = await testUtils.performAsyncAction(
      () => usersResult.current.update({
        id: newUser.id,
        email: newUser.email,
        firstName: "Updated",
        lastName: "Profile",
      }),
      "update user profile"
    );

    expect(updatedProfile.firstName).toBe("Updated");
    expect(updatedProfile.lastName).toBe("Profile");

    // Step 3: User discovers and lists communities
    const { result: communitiesResult } = await testUtils.renderHookWithWrapper(() => useCommunities());
    await testUtils.waitForHookToInitialize(
      communitiesResult,
      (communities) => typeof communities.list === 'function'
    );

    const availableCommunities = await testUtils.performAsyncAction(
      () => communitiesResult.current.list(),
      "discover communities"
    );

    expect(Array.isArray(availableCommunities)).toBe(true);

    // Step 4: User creates their first community
    const testCommunity = TestDataFactory.createCommunity();
    const createdCommunity = await testUtils.performAsyncAction(
      () => communitiesResult.current.create({
        ...testCommunity,
        organizerId: newUser.id, // Set the authenticated user as organizer
        parentId: null, // Create as root community
      }),
      "create first community"
    );

    expect(createdCommunity).toMatchObject({
      name: testCommunity.name,
      description: testCommunity.description,
      level: testCommunity.level,
    });

    // Step 5: User creates their first resource in the community
    const { result: resourcesResult } = await testUtils.renderHookWithWrapper(() => useResources());
    await testUtils.waitForHookToInitialize(
      resourcesResult,
      (resources) => typeof resources.create === 'function'
    );

    const testResource = TestDataFactory.createResource();
    const createdResource = await testUtils.performAsyncAction(
      () => resourcesResult.current.create({
        ...testResource,
        communityId: createdCommunity.id,
      }),
      "create first resource"
    );

    expect(createdResource).toMatchObject({
      title: testResource.title,
      description: testResource.description,
      type: testResource.type,
    });

    // Step 6: User signs out successfully
    await testUtils.performAsyncAction(
      () => authResult.current.signOut(),
      "sign out after onboarding"
    );

    expect(authResult.current.isAuthenticated).toBe(false);
    expect(authResult.current.currentUser).toBeNull();

    console.log("✅ Complete user onboarding journey successful");
  });

  test("community organizer workflow", async () => {
    // Step 1: Organizer signs up and creates community
    const organizerUser = TestDataFactory.createUser();
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signUp === 'function'
    );

    const organizer = await testUtils.performAsyncAction(
      () => authResult.current.signUp(organizerUser),
      "organizer sign up"
    );

    const { result: communitiesResult } = await testUtils.renderHookWithWrapper(() => useCommunities());
    await testUtils.waitForHookToInitialize(
      communitiesResult,
      (communities) => typeof communities.create === 'function'
    );

    const testCommunity = TestDataFactory.createCommunity();
    const community = await testUtils.performAsyncAction(
      () => communitiesResult.current.create({
        ...testCommunity,
        organizerId: organizer.id, // Set the authenticated user as organizer
        parentId: null, // Create as root community
      }),
      "organizer creates community"
    );

    // Step 2: Organizer creates events for the community
    const { result: eventsResult } = await testUtils.renderHookWithWrapper(() => useEvents());
    await testUtils.waitForHookToInitialize(
      eventsResult,
      (events) => typeof events.create === 'function'
    );

    const testEvent1 = TestDataFactory.createEvent();
    const testEvent2 = TestDataFactory.createEvent();

    const event1 = await testUtils.performAsyncAction(
      () => eventsResult.current.create({
        title: testEvent1.title,
        description: testEvent1.description,
        startDateTime: testEvent1.startTime,
        endDateTime: testEvent1.endTime,
        location: testEvent1.location,
        coordinates: { lat: 40.7128, lng: -74.0060 }, // Default NYC coordinates
        maxAttendees: testEvent1.maxAttendees,
        communityId: community.id,
      }),
      "create first event"
    );

    const event2 = await testUtils.performAsyncAction(
      () => eventsResult.current.create({
        title: testEvent2.title,
        description: testEvent2.description,
        startDateTime: testEvent2.startTime,
        endDateTime: testEvent2.endTime,
        location: testEvent2.location,
        coordinates: { lat: 40.7589, lng: -73.9851 }, // Default NYC coordinates  
        maxAttendees: testEvent2.maxAttendees,
        communityId: community.id,
      }),
      "create second event"
    );

    expect(event1.organizer?.id).toBe(organizer.id);
    expect(event2.organizer?.id).toBe(organizer.id);

    // Step 3: Organizer creates helpful resources
    const { result: resourcesResult } = await testUtils.renderHookWithWrapper(() => useResources());
    await testUtils.waitForHookToInitialize(
      resourcesResult,
      (resources) => typeof resources.create === 'function'
    );

    const testResource1 = TestDataFactory.createResource({ type: "request" });
    const testResource2 = TestDataFactory.createResource({ type: "offer" });

    const resource1 = await testUtils.performAsyncAction(
      () => resourcesResult.current.create({
        ...testResource1,
        communityId: community.id,
      }),
      "create request resource"
    );

    const resource2 = await testUtils.performAsyncAction(
      () => resourcesResult.current.create({
        ...testResource2,
        communityId: community.id,
      }),
      "create offer resource"
    );

    // Step 4: Organizer manages events - joins their own events
    await testUtils.performAsyncAction(
      () => eventsResult.current.join(event1.id, "attending"),
      "organizer joins first event"
    );

    await testUtils.performAsyncAction(
      () => eventsResult.current.join(event2.id, "attending"),
      "organizer joins second event"
    );

    // Step 5: Organizer views community activity - lists events and resources
    const communityEvents = await testUtils.performAsyncAction(
      () => eventsResult.current.list({ communityId: community.id }),
      "list community events"
    );

    const communityResources = await testUtils.performAsyncAction(
      () => resourcesResult.current.list({ communityId: community.id }),
      "list community resources"
    );

    expect(communityEvents.length).toBe(2);
    expect(communityResources.length).toBe(2);

    // Step 6: Organizer updates events as needed
    const updatedEvent = await testUtils.performAsyncAction(
      () => eventsResult.current.update(event1.id, {
        title: "Updated Event Title",
        maxAttendees: 150,
      }),
      "update event details"
    );

    expect(updatedEvent.title).toBe("Updated Event Title");
    expect(updatedEvent.maxAttendees).toBe(150);

    console.log("✅ Community organizer workflow successful");
  });

  test("content creation and interaction cycle", async () => {
    // Step 1: User A creates community and content
    const userA = TestDataFactory.createUser();
    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signUp === 'function'
    );

    const userAAccount = await testUtils.performAsyncAction(
      () => authResult.current.signUp(userA),
      "user A sign up"
    );

    // Create community
    const { result: communitiesResult } = await testUtils.renderHookWithWrapper(() => useCommunities());
    await testUtils.waitForHookToInitialize(
      communitiesResult,
      (communities) => typeof communities.create === 'function'
    );

    const testCommunityData = TestDataFactory.createCommunity();
    const community = await testUtils.performAsyncAction(
      () => communitiesResult.current.create({
        ...testCommunityData,
        organizerId: userAAccount.id, // Set the authenticated user as organizer
        parentId: null, // Create as root community
      }),
      "user A creates community"
    );

    // Create resource
    const { result: resourcesResult } = await testUtils.renderHookWithWrapper(() => useResources());
    await testUtils.waitForHookToInitialize(
      resourcesResult,
      (resources) => typeof resources.create === 'function'
    );

    const resource = await testUtils.performAsyncAction(
      () => resourcesResult.current.create({
        ...TestDataFactory.createResource({ type: "offer" }),
        communityId: community.id,
      }),
      "user A creates resource"
    );

    // Create event
    const { result: eventsResult } = await testUtils.renderHookWithWrapper(() => useEvents());
    await testUtils.waitForHookToInitialize(
      eventsResult,
      (events) => typeof events.create === 'function'
    );

    const eventData = TestDataFactory.createEvent();
    const event = await testUtils.performAsyncAction(
      () => eventsResult.current.create({
        title: eventData.title,
        description: eventData.description,
        startDateTime: eventData.startTime,
        endDateTime: eventData.endTime,
        location: eventData.location,
        coordinates: { lat: 40.7128, lng: -74.0060 }, // Default NYC coordinates
        maxAttendees: eventData.maxAttendees,
        communityId: community.id,
      }),
      "user A creates event"
    );

    // Sign out User A
    await authResult.current.signOut();

    // Step 2: User B discovers and interacts with content
    const userB = TestDataFactory.createUser();
    const userBAccount = await testUtils.performAsyncAction(
      () => authResult.current.signUp(userB),
      "user B sign up"
    );

    // User B discovers communities
    const availableCommunities = await testUtils.performAsyncAction(
      () => communitiesResult.current.list(),
      "user B discovers communities"
    );

    expect(availableCommunities.some(c => c.id === community.id)).toBe(true);

    // User B joins the event
    await testUtils.performAsyncAction(
      () => eventsResult.current.join(event.id, "attending"),
      "user B joins event"
    );

    // User B gives shoutout for the resource
    const { result: shoutoutsResult } = await testUtils.renderHookWithWrapper(() => useShoutouts());
    await testUtils.waitForHookToInitialize(
      shoutoutsResult,
      (shoutouts) => typeof shoutouts.create === 'function'
    );

    const shoutoutData = TestDataFactory.createShoutout();
    const shoutout = await testUtils.performAsyncAction(
      () => shoutoutsResult.current.create({
        message: shoutoutData.message,
        isPublic: shoutoutData.isPublic,
        resourceId: resource.id,
        toUserId: userAAccount.id,
      }),
      "user B gives shoutout"
    );

    expect(shoutout.toUser.id).toBe(userAAccount.id);
    expect(shoutout.resource.id).toBe(resource.id);

    // Sign out User B
    await authResult.current.signOut();

    // Step 3: User A checks activity and engagement
    await testUtils.performAsyncAction(
      () => authResult.current.signIn({
        email: userA.email,
        password: userA.password,
      }),
      "user A signs back in"
    );

    // Check event attendees
    const eventAttendees = await testUtils.performAsyncAction(
      () => eventsResult.current.attendees(event.id),
      "check event attendees"
    );

    expect(eventAttendees.length).toBeGreaterThan(0);
    expect(eventAttendees.some(attendee => attendee.user.id === userBAccount.id)).toBe(true);

    // Check shoutouts received
    const shoutoutsReceived = await testUtils.performAsyncAction(
      () => shoutoutsResult.current.list({ toUserId: userAAccount.id }),
      "check shoutouts received"
    );

    expect(shoutoutsReceived.length).toBeGreaterThan(0);
    expect(shoutoutsReceived.some(s => s.resourceId === resource.id)).toBe(true);

    console.log("✅ Content creation and interaction cycle successful");
  });

  test("multi-user collaboration workflow", async () => {
    // Step 1: Create multiple users
    const users = [
      TestDataFactory.createUser(),
      TestDataFactory.createUser(),
      TestDataFactory.createUser(),
    ];

    const { result: authResult } = await testUtils.renderHookWithWrapper(() => useAuth());
    await testUtils.waitForHookToInitialize(
      authResult,
      (auth) => typeof auth.signUp === 'function'
    );

    // Sign up all users
    const userAccounts = [];
    for (const user of users) {
      const account = await testUtils.performAsyncAction(
        () => authResult.current.signUp(user),
        `sign up user ${user.firstName}`
      );
      userAccounts.push({ account, credentials: { email: user.email, password: user.password } });
      await authResult.current.signOut();
    }

    // Step 2: First user creates community
    await testUtils.performAsyncAction(
      () => authResult.current.signIn(userAccounts[0].credentials),
      "sign in first user"
    );

    const { result: communitiesResult } = await testUtils.renderHookWithWrapper(() => useCommunities());
    await testUtils.waitForHookToInitialize(
      communitiesResult,
      (communities) => typeof communities.create === 'function'
    );

    const testCommunityData = TestDataFactory.createCommunity();
    const community = await testUtils.performAsyncAction(
      () => communitiesResult.current.create({
        ...testCommunityData,
        organizerId: userAccounts[0].account.id, // Set the authenticated user as organizer
        parentId: null, // Create as root community
      }),
      "first user creates community"
    );

    await authResult.current.signOut();

    // Step 3: Each user contributes content
    const { result: resourcesResult } = await testUtils.renderHookWithWrapper(() => useResources());
    await testUtils.waitForHookToInitialize(
      resourcesResult,
      (resources) => typeof resources.create === 'function'
    );

    const { result: eventsResult } = await testUtils.renderHookWithWrapper(() => useEvents());
    await testUtils.waitForHookToInitialize(
      eventsResult,
      (events) => typeof events.create === 'function'
    );

    const createdContent = [];

    for (let i = 0; i < userAccounts.length; i++) {
      await testUtils.performAsyncAction(
        () => authResult.current.signIn(userAccounts[i].credentials),
        `sign in user ${i + 1}`
      );

      // Each user creates a resource
      const resource = await testUtils.performAsyncAction(
        () => resourcesResult.current.create({
          ...TestDataFactory.createResource(),
          communityId: community.id,
        }),
        `user ${i + 1} creates resource`
      );

      // Every other user creates an event
      if (i % 2 === 0) {
        const eventData = TestDataFactory.createEvent();
        const event = await testUtils.performAsyncAction(
          () => eventsResult.current.create({
            title: eventData.title,
            description: eventData.description,
            startDateTime: eventData.startTime,
            endDateTime: eventData.endTime,
            location: eventData.location,
            coordinates: { lat: 40.7128, lng: -74.0060 }, // Default NYC coordinates
            maxAttendees: eventData.maxAttendees,
            communityId: community.id,
          }),
          `user ${i + 1} creates event`
        );
        createdContent.push({ type: 'event', item: event });
      }

      createdContent.push({ type: 'resource', item: resource });
      await authResult.current.signOut();
    }

    // Step 4: Cross-user interactions
    const { result: shoutoutsResult } = await testUtils.renderHookWithWrapper(() => useShoutouts());
    await testUtils.waitForHookToInitialize(
      shoutoutsResult,
      (shoutouts) => typeof shoutouts.create === 'function'
    );

    // Each user interacts with content from others
    for (let i = 0; i < userAccounts.length; i++) {
      await testUtils.performAsyncAction(
        () => authResult.current.signIn(userAccounts[i].credentials),
        `sign in user ${i + 1} for interactions`
      );

      // Join events created by others
      const eventsToJoin = createdContent.filter(c => 
        c.type === 'event' && 
        c.item.organizer.id !== userAccounts[i].account.id
      );

      for (const eventContent of eventsToJoin) {
        await testUtils.performAsyncAction(
          () => eventsResult.current.join(eventContent.item.id, "attending"),
          `user ${i + 1} joins event`
        );
      }

      // Give shoutouts for resources created by others
      const resourcesToShoutout = createdContent.filter(c => 
        c.type === 'resource' && 
        c.item.owner?.id !== userAccounts[i].account.id
      );

      if (resourcesToShoutout.length > 0) {
        const resourceToShoutout = resourcesToShoutout[0];
        await testUtils.performAsyncAction(
          () => shoutoutsResult.current.create({
            message: "Thanks for sharing this!",
            isPublic: true,
            resourceId: resourceToShoutout.item.id,
            toUserId: resourceToShoutout.item.owner?.id || userAccounts[0].account.id,
          }),
          `user ${i + 1} gives shoutout`
        );
      }

      await authResult.current.signOut();
    }

    // Step 5: Verify collaboration results
    await testUtils.performAsyncAction(
      () => authResult.current.signIn(userAccounts[0].credentials),
      "sign in first user to verify results"
    );

    // Check community has content from all users
    const communityResources = await testUtils.performAsyncAction(
      () => resourcesResult.current.list({ communityId: community.id }),
      "check all community resources"
    );

    const communityEvents = await testUtils.performAsyncAction(
      () => eventsResult.current.list({ communityId: community.id }),
      "check all community events"
    );

    expect(communityResources.length).toBe(userAccounts.length);
    expect(communityEvents.length).toBe(2); // Every other user created events

    // Check that events have multiple attendees
    for (const eventContent of createdContent.filter(c => c.type === 'event')) {
      const attendees = await testUtils.performAsyncAction(
        () => eventsResult.current.attendees(eventContent.item.id),
        "check event attendees"
      );
      expect(attendees.length).toBeGreaterThan(1);
    }

    console.log("✅ Multi-user collaboration workflow successful");
  });
});
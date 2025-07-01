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
  useCommunities,
  useAuth,
} from "../../../src";
import {
  TestDataFactory,
  authHelper,
  cleanupHelper,
  testWrapperManager,
  testUtils,
  commonExpectations,
} from "../helpers";

describe("Community Membership Integration", () => {
  const wrapper = testWrapperManager.getWrapper();

  beforeAll(() => {
    testWrapperManager.reset();
  });

  beforeEach(async () => {
    await cleanupHelper.ensureTestIsolation();
    // Add delay to prevent rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterEach(async () => {
    await cleanupHelper.cleanupBetweenTests();
  });

  afterAll(async () => {
    await cleanupHelper.cleanupAfterAllTests();
  });

  test("should allow user to join and leave community successfully", async () => {
    // Step 1: Create organizer and community
    const organizerSetup = await authHelper.createAndAuthenticateUser();
    const { result: communitiesResult } = await testUtils.renderHookWithWrapper(() => useCommunities());

    await testUtils.waitForHookToInitialize(
      communitiesResult,
      (communities) => typeof communities.create === 'function'
    );

    const communityData = TestDataFactory.createCommunity();
    const community = await testUtils.performAsyncAction(
      () => communitiesResult.current.create({
        ...communityData,
        organizerId: organizerSetup.user.userId,
        parentId: null,
      }),
      "organizer creates community"
    );

    // Step 2: Sign out organizer and create member user
    await authHelper.ensureSignedOut();
    const memberSetup = await authHelper.createAndAuthenticateUser();

    // Step 3: Member joins community
    const membership = await testUtils.performAsyncAction(
      () => communitiesResult.current.join(community.id, 'member'),
      "member joins community"
    );

    expect(membership).toMatchObject({
      communityId: community.id,
      userId: memberSetup.user.userId,
      role: 'member',
    });
    expect(membership.joinedAt).toBeInstanceOf(Date);

    // Step 4: Verify membership exists
    const memberships = await testUtils.performAsyncAction(
      () => communitiesResult.current.memberships(community.id),
      "fetch community memberships"
    );

    expect(memberships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          communityId: community.id,
          userId: memberSetup.user.userId,
          role: 'member',
        }),
      ])
    );

    // Step 5: Member leaves community
    await testUtils.performAsyncAction(
      () => communitiesResult.current.leave(community.id),
      "member leaves community"
    );

    // Step 6: Verify membership is removed
    const membershipsAfterLeaving = await testUtils.performAsyncAction(
      () => communitiesResult.current.memberships(community.id),
      "fetch memberships after leaving"
    );

    expect(membershipsAfterLeaving).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: memberSetup.user.userId,
        }),
      ])
    );
  });

  test("should prevent duplicate joins", async () => {
    // Step 1: Create organizer and community
    const organizerSetup = await authHelper.createAndAuthenticateUser();
    const { result: communitiesResult } = await testUtils.renderHookWithWrapper(() => useCommunities());

    await testUtils.waitForHookToInitialize(
      communitiesResult,
      (communities) => typeof communities.create === 'function'
    );

    const communityData = TestDataFactory.createCommunity();
    const community = await testUtils.performAsyncAction(
      () => communitiesResult.current.create({
        ...communityData,
        organizerId: organizerSetup.user.userId,
        parentId: null,
      }),
      "organizer creates community"
    );

    // Step 2: Create member user
    await authHelper.ensureSignedOut();
    const memberSetup = await authHelper.createAndAuthenticateUser();

    // Step 3: Member joins community
    await testUtils.performAsyncAction(
      () => communitiesResult.current.join(community.id, 'member'),
      "member joins community first time"
    );

    // Step 4: Attempt to join again - should fail
    await expect(
      communitiesResult.current.join(community.id, 'member')
    ).rejects.toThrow("User is already a member of this community");
  });

  test("should prevent non-members from leaving community", async () => {
    // Step 1: Create organizer and community
    const organizerSetup = await authHelper.createAndAuthenticateUser();
    const { result: communitiesResult } = await testUtils.renderHookWithWrapper(() => useCommunities());

    await testUtils.waitForHookToInitialize(
      communitiesResult,
      (communities) => typeof communities.create === 'function'
    );

    const communityData = TestDataFactory.createCommunity();
    const community = await testUtils.performAsyncAction(
      () => communitiesResult.current.create({
        ...communityData,
        organizerId: organizerSetup.user.userId,
        parentId: null,
      }),
      "organizer creates community"
    );

    // Step 2: Create non-member user
    await authHelper.ensureSignedOut();
    const nonMemberSetup = await authHelper.createAndAuthenticateUser();

    // Step 3: Non-member attempts to leave community - should fail
    await expect(
      communitiesResult.current.leave(community.id)
    ).rejects.toThrow("User is not a member of this community");
  });

  test("should prevent organizer from leaving their own community", async () => {
    // THIS IS THE BUG TEST - this should catch the business rule that e2e found
    
    // Step 1: Create organizer and community
    const organizerSetup = await authHelper.createAndAuthenticateUser();
    const { result: communitiesResult } = await testUtils.renderHookWithWrapper(() => useCommunities());

    await testUtils.waitForHookToInitialize(
      communitiesResult,
      (communities) => typeof communities.create === 'function'
    );

    const communityData = TestDataFactory.createCommunity();
    const community = await testUtils.performAsyncAction(
      () => communitiesResult.current.create({
        ...communityData,
        organizerId: organizerSetup.user.userId,
        parentId: null,
      }),
      "organizer creates community"
    );

    // Step 2: Organizer attempts to leave their own community - should fail
    await expect(
      communitiesResult.current.leave(community.id)
    ).rejects.toThrow("Organizer cannot leave their own community");
  });

  test("should allow different membership roles", async () => {
    // Step 1: Create organizer and community
    const organizerSetup = await authHelper.createAndAuthenticateUser();
    const { result: communitiesResult } = await testUtils.renderHookWithWrapper(() => useCommunities());

    await testUtils.waitForHookToInitialize(
      communitiesResult,
      (communities) => typeof communities.create === 'function'
    );

    const communityData = TestDataFactory.createCommunity();
    const community = await testUtils.performAsyncAction(
      () => communitiesResult.current.create({
        ...communityData,
        organizerId: organizerSetup.user.userId,
        parentId: null,
      }),
      "organizer creates community"
    );

    // Step 2: Create users and test different roles
    await authHelper.ensureSignedOut();
    const memberSetup = await authHelper.createAndAuthenticateUser();

    // Test member role
    const memberMembership = await testUtils.performAsyncAction(
      () => communitiesResult.current.join(community.id, 'member'),
      "user joins as member"
    );
    expect(memberMembership.role).toBe('member');

    // Leave and rejoin as admin
    await testUtils.performAsyncAction(
      () => communitiesResult.current.leave(community.id),
      "member leaves"
    );

    const adminMembership = await testUtils.performAsyncAction(
      () => communitiesResult.current.join(community.id, 'admin'),
      "user joins as admin"
    );
    expect(adminMembership.role).toBe('admin');
  });

  test("should handle user memberships across multiple communities", async () => {
    // Step 1: Create organizer and multiple communities
    const organizerSetup = await authHelper.createAndAuthenticateUser();
    const { result: communitiesResult } = await testUtils.renderHookWithWrapper(() => useCommunities());

    await testUtils.waitForHookToInitialize(
      communitiesResult,
      (communities) => typeof communities.create === 'function'
    );

    const community1Data = TestDataFactory.createCommunity();
    const community1 = await testUtils.performAsyncAction(
      () => communitiesResult.current.create({
        ...community1Data,
        organizerId: organizerSetup.user.userId,
        parentId: null,
      }),
      "create first community"
    );

    const community2Data = TestDataFactory.createCommunity();
    const community2 = await testUtils.performAsyncAction(
      () => communitiesResult.current.create({
        ...community2Data,
        organizerId: organizerSetup.user.userId,
        parentId: null,
      }),
      "create second community"
    );

    // Step 2: Create member user
    await authHelper.ensureSignedOut();
    const memberSetup = await authHelper.createAndAuthenticateUser();

    // Step 3: Join both communities
    await testUtils.performAsyncAction(
      () => communitiesResult.current.join(community1.id, 'member'),
      "join first community"
    );

    await testUtils.performAsyncAction(
      () => communitiesResult.current.join(community2.id, 'admin'),
      "join second community as admin"
    );

    // Step 4: Verify user memberships
    const userMemberships = await testUtils.performAsyncAction(
      () => communitiesResult.current.userMemberships(memberSetup.user.userId),
      "fetch user memberships"
    );

    expect(userMemberships).toHaveLength(2);
    expect(userMemberships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          communityId: community1.id,
          role: 'member',
        }),
        expect.objectContaining({
          communityId: community2.id,
          role: 'admin',
        }),
      ])
    );

    // Step 5: Leave one community
    await testUtils.performAsyncAction(
      () => communitiesResult.current.leave(community1.id),
      "leave first community"
    );

    // Step 6: Verify only one membership remains
    const remainingMemberships = await testUtils.performAsyncAction(
      () => communitiesResult.current.userMemberships(memberSetup.user.userId),
      "fetch remaining memberships"
    );

    expect(remainingMemberships).toHaveLength(1);
    expect(remainingMemberships[0]).toMatchObject({
      communityId: community2.id,
      role: 'admin',
    });
  });
});
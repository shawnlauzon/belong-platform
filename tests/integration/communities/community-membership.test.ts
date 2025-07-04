import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest';
import {
  useCreateCommunity,
  useJoinCommunity,
  useLeaveCommunity,
  useCommunityMembers,
  useUserCommunities,
} from '../../../src';
import {
  TestDataFactory,
  authHelper,
  cleanupHelper,
  testWrapperManager,
  testUtils,
} from '../helpers';

describe('Community Membership Integration', () => {
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

  test('should allow user to join and leave community successfully', async () => {
    // Create organizer and community
    const organizer = await authHelper.createAndAuthenticateUser();

    const communityData = TestDataFactory.createCommunity();
    const { result: communityHooks } = await testUtils.renderHookWithWrapper(
      () => ({
        createCommunity: useCreateCommunity(),
        communityMembers: useCommunityMembers(null), // Will update with actual ID later
      }),
    );

    const community = await testUtils.performAsyncAction(
      () =>
        communityHooks.current.createCommunity({
          ...communityData,
          organizerId: organizer.user.userId,
          parentId: null,
        }),
      'create community',
    );

    // Switch to member user
    await authHelper.signOutUser();
    const member = await authHelper.createAndAuthenticateUser();

    // Set up member operations
    const { result: memberHooks } = await testUtils.renderHookWithWrapper(
      () => ({
        joinCommunity: useJoinCommunity(),
        leaveCommunity: useLeaveCommunity(),
        communityMembers: useCommunityMembers(community.id),
      }),
    );

    // Member joins community
    const membership = await testUtils.performAsyncAction(
      () => memberHooks.current.joinCommunity(community.id, 'member'),
      'member joins community',
    );

    expect(membership).toMatchObject({
      communityId: community.id,
      userId: member.user.userId,
      role: 'member',
    });

    // Verify membership exists
    await testUtils.waitForCondition(
      () => {
        const memberships = memberHooks.current.communityMembers.data || [];
        return memberships.some(
          (m) => m.userId === member.user.userId && m.role === 'member',
        );
      },
      { timeout: 15000 },
    );

    // Member leaves community
    await testUtils.performAsyncAction(
      () => memberHooks.current.leaveCommunity(community.id),
      'member leaves community',
    );

    // Verify membership is removed
    await testUtils.waitForCondition(
      () => {
        const memberships = memberHooks.current.communityMembers.data || [];
        return !memberships.some((m) => m.userId === member.user.userId);
      },
      { timeout: 15000 },
    );
  });

  test('should prevent duplicate joins', async () => {
    // Step 1: Create organizer and community
    const organizerSetup = await authHelper.createAndAuthenticateUser();
    const { result: createCommunityResult } =
      await testUtils.renderHookWithWrapper(() => useCreateCommunity());

    const communityData = TestDataFactory.createCommunity();
    const community = await testUtils.performAsyncAction(
      () =>
        createCommunityResult.current({
          ...communityData,
          organizerId: organizerSetup.user.userId,
          parentId: null,
        }),
      'organizer creates community',
    );

    // Step 2: Create member user
    await authHelper.ensureSignedOut();
    const memberSetup = await authHelper.createAndAuthenticateUser();

    // Step 3: Member joins community
    const { result: joinCommunityResult } =
      await testUtils.renderHookWithWrapper(() => useJoinCommunity());
    await testUtils.performAsyncAction(
      () => joinCommunityResult.current(community.id, 'member'),
      'member joins community first time',
    );

    // Step 4: Attempt to join again - should fail
    await expect(
      joinCommunityResult.current(community.id, 'member'),
    ).rejects.toThrow('User is already a member of this community');
  });

  test('should prevent non-members from leaving community', async () => {
    // Step 1: Create organizer and community
    const organizerSetup = await authHelper.createAndAuthenticateUser();
    const { result: createCommunityResult } =
      await testUtils.renderHookWithWrapper(() => useCreateCommunity());

    const communityData = TestDataFactory.createCommunity();
    const community = await testUtils.performAsyncAction(
      () =>
        createCommunityResult.current({
          ...communityData,
          organizerId: organizerSetup.user.userId,
          parentId: null,
        }),
      'organizer creates community',
    );

    // Step 2: Create non-member user
    await authHelper.ensureSignedOut();
    const nonMemberSetup = await authHelper.createAndAuthenticateUser();

    // Step 3: Non-member attempts to leave community - should fail
    const { result: leaveCommunityResult } =
      await testUtils.renderHookWithWrapper(() => useLeaveCommunity());
    await expect(leaveCommunityResult.current(community.id)).rejects.toThrow(
      'User is not a member of this community',
    );
  });

  test('should prevent organizer from leaving their own community', async () => {
    // THIS IS THE BUG TEST - this should catch the business rule that e2e found

    // Step 1: Create organizer and community
    const organizerSetup = await authHelper.createAndAuthenticateUser();
    const { result: createCommunityResult } =
      await testUtils.renderHookWithWrapper(() => useCreateCommunity());

    const communityData = TestDataFactory.createCommunity();
    const community = await testUtils.performAsyncAction(
      () =>
        createCommunityResult.current({
          ...communityData,
          organizerId: organizerSetup.user.userId,
          parentId: null,
        }),
      'organizer creates community',
    );

    // Step 2: Organizer attempts to leave their own community - should fail
    const { result: leaveCommunityResult } =
      await testUtils.renderHookWithWrapper(() => useLeaveCommunity());
    await expect(leaveCommunityResult.current(community.id)).rejects.toThrow(
      'Organizer cannot leave their own community',
    );
  });

  test('should allow different membership roles', async () => {
    // Step 1: Create organizer and community
    const organizerSetup = await authHelper.createAndAuthenticateUser();
    const { result: createCommunityResult } =
      await testUtils.renderHookWithWrapper(() => useCreateCommunity());

    const communityData = TestDataFactory.createCommunity();
    const community = await testUtils.performAsyncAction(
      () =>
        createCommunityResult.current({
          ...communityData,
          organizerId: organizerSetup.user.userId,
          parentId: null,
        }),
      'organizer creates community',
    );

    // Step 2: Create users and test different roles
    await authHelper.ensureSignedOut();
    const memberSetup = await authHelper.createAndAuthenticateUser();

    // Test member role
    const { result: joinCommunityResult } =
      await testUtils.renderHookWithWrapper(() => useJoinCommunity());
    const memberMembership = await testUtils.performAsyncAction(
      () => joinCommunityResult.current(community.id, 'member'),
      'user joins as member',
    );
    expect(memberMembership.role).toBe('member');

    // Leave and rejoin as admin
    const { result: leaveCommunityResult } =
      await testUtils.renderHookWithWrapper(() => useLeaveCommunity());
    await testUtils.performAsyncAction(
      () => leaveCommunityResult.current(community.id),
      'member leaves',
    );

    const adminMembership = await testUtils.performAsyncAction(
      () => joinCommunityResult.current(community.id, 'admin'),
      'user joins as admin',
    );
    expect(adminMembership.role).toBe('admin');
  });

  test('should handle user memberships across multiple communities', async () => {
    // Step 1: Create organizer and multiple communities
    const organizerSetup = await authHelper.createAndAuthenticateUser();
    const { result: createCommunityResult } =
      await testUtils.renderHookWithWrapper(() => useCreateCommunity());

    const community1Data = TestDataFactory.createCommunity();
    const community1 = await testUtils.performAsyncAction(
      () =>
        createCommunityResult.current({
          ...community1Data,
          organizerId: organizerSetup.user.userId,
          parentId: null,
        }),
      'create first community',
    );

    const community2Data = TestDataFactory.createCommunity();
    const community2 = await testUtils.performAsyncAction(
      () =>
        createCommunityResult.current({
          ...community2Data,
          organizerId: organizerSetup.user.userId,
          parentId: null,
        }),
      'create second community',
    );

    // Step 2: Create member user
    await authHelper.ensureSignedOut();
    const memberSetup = await authHelper.createAndAuthenticateUser();

    // Step 3: Join both communities
    const { result: joinCommunityResult } =
      await testUtils.renderHookWithWrapper(() => useJoinCommunity());
    await testUtils.performAsyncAction(
      () => joinCommunityResult.current(community1.id, 'member'),
      'join first community',
    );

    await testUtils.performAsyncAction(
      () => joinCommunityResult.current(community2.id, 'admin'),
      'join second community as admin',
    );

    // Step 4: Verify user memberships
    const { result: userCommunitiesResult } =
      await testUtils.renderHookWithWrapper(() =>
        useUserCommunities(memberSetup.user.userId),
      );

    await testUtils.waitForHookToInitialize(
      userCommunitiesResult,
      (query) => query.isLoading !== undefined,
    );

    // Wait for the memberships to be loaded
    await testUtils.waitForCondition(
      () => {
        const memberships = userCommunitiesResult.current.data || [];
        console.log(
          '🔍 Current user memberships:',
          memberships.length,
          memberships.map((m) => ({
            communityId: m.communityId,
            role: m.role,
          })),
        );
        return memberships.length === 2;
      },
      { timeout: 15000 },
    );

    const userMemberships = userCommunitiesResult.current.data || [];

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
      ]),
    );

    // Step 5: Leave one community
    const { result: leaveCommunityResult } =
      await testUtils.renderHookWithWrapper(() => useLeaveCommunity());
    await testUtils.performAsyncAction(
      () => leaveCommunityResult.current(community1.id),
      'leave first community',
    );

    // Step 6: Verify only one membership remains
    // Wait for the membership to be removed
    await testUtils.waitForCondition(
      () => {
        const memberships = userCommunitiesResult.current.data || [];
        console.log(
          '🔍 Memberships after leaving one community:',
          memberships.length,
          memberships.map((m) => ({
            communityId: m.communityId,
            role: m.role,
          })),
        );
        return memberships.length === 1;
      },
      { timeout: 15000 },
    );

    const remainingMemberships = userCommunitiesResult.current.data || [];

    expect(remainingMemberships).toHaveLength(1);
    expect(remainingMemberships[0]).toMatchObject({
      communityId: community2.id,
      role: 'admin',
    });
  });
});

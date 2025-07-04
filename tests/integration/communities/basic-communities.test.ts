import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useCommunities,
  useCreateCommunity,
  useCurrentUser,
  useSignIn,
  useSignUp,
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
 * Basic Communities Integration Tests
 *
 * Tests the new communities hook patterns:
 * - useCommunities() - Returns React Query state { data, isLoading, error }
 * - useCreateCommunity() - Returns function (data) => Promise<Community>
 */

describe('Basic Communities Integration', () => {
  const wrapper = testWrapperManager.getWrapper();

  beforeAll(() => {
    testWrapperManager.reset();
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

  test('should be able to list communities using React Query pattern', async () => {
    const { result } = await testUtils.renderHookWithWrapper(() =>
      useCommunities(),
    );

    await testUtils.waitForHookToInitialize(
      result,
      (query) => query.isLoading !== undefined,
    );

    // Wait for query to complete
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 10000 },
    );

    // Check for errors first, then verify data structure
    if (result.current.error) {
      throw new Error(
        `Communities query failed: ${result.current.error.message || result.current.error}`,
      );
    }

    // useCommunities returns data directly (auto-fetching)
    expect(Array.isArray(result.current.data)).toBe(true);

    // If there are communities, verify structure
    if (result.current.data && result.current.data.length > 0) {
      const firstCommunity = result.current.data[0];
      expect(firstCommunity).toHaveProperty('id');
      expect(firstCommunity).toHaveProperty('name');
      expect(firstCommunity).toHaveProperty('level');
      commonExpectations.toBeValidId(firstCommunity.id);
    }
  });

  test('should validate hook signatures match API', async () => {
    const { result } = await testUtils.renderHookWithWrapper(() => ({
      communities: useCommunities(),
      createCommunity: useCreateCommunity(),
    }));

    await testUtils.waitForHookToInitialize(
      { current: result.current.communities },
      (query) => query.isLoading !== undefined,
    );

    // useCommunities returns React Query state
    expect(result.current.communities).toHaveProperty('data');
    expect(result.current.communities).toHaveProperty('isLoading');
    expect(result.current.communities).toHaveProperty('error');
    expect(typeof result.current.communities.isLoading).toBe('boolean');

    // useCreateCommunity returns a function
    expect(typeof result.current.createCommunity).toBe('function');

    console.log('✅ Communities hook signatures validated');
  });

  test('should create valid test data', async () => {
    const communityData = TestDataFactory.createCommunity();

    expect(typeof communityData.name).toBe('string');
    expect(communityData.name.length).toBeGreaterThan(0);
    expect(['neighborhood', 'city', 'region', 'state', 'country']).toContain(
      communityData.level,
    );
    expect(Array.isArray(communityData.hierarchyPath)).toBe(true);
    expect(typeof communityData.memberCount).toBe('number');
  });

  test('should attempt to create community with authenticated user using new hook pattern', async () => {
    const authSetup = await authHelper.createAndAuthenticateUser();
    const authUser = authSetup.user;

    // Set up hooks
    const { result: communitiesResult } = await testUtils.renderHookWithWrapper(
      () => useCommunities(),
    );
    const { result: createResult } = await testUtils.renderHookWithWrapper(() =>
      useCreateCommunity(),
    );

    await testUtils.waitForHookToInitialize(
      communitiesResult,
      (query) => query.isLoading !== undefined,
    );

    const communityData = TestDataFactory.createCommunity();

    const createdCommunity = await testUtils.performAsyncAction(
      () =>
        createResult.current({
          ...communityData,
          parentId: null,
        }),
      'create community with new hook pattern',
    );

    expect(createdCommunity).toMatchObject({
      id: expect.any(String),
      name: communityData.name,
      description: communityData.description,
      level: communityData.level,
    });

    commonExpectations.toBeValidId(createdCommunity.id);

    // Wait for the list to update (React Query should auto-refetch)
    await waitFor(
      () => {
        const communities = communitiesResult.current.data;
        const found = communities?.some(
          (community) => community.id === createdCommunity.id,
        );
        const isError = communitiesResult.current.isError;
        expect(found || isError).toBeTruthy();
      },
      { timeout: 10000 },
    );
    if (communitiesResult.current.isError) {
      throw communitiesResult.current.error;
    }
  });
});

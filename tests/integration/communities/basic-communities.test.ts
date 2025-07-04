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
import { useCommunities, useCreateCommunity } from '../../../src';
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

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    expect(Array.isArray(result.current)).toBe(true);

    // If there are communities, verify structure
    if (result.current.length > 0) {
      const firstCommunity = result.current[0];
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

    await waitFor(() => {
      expect(result.current.communities).toBeDefined();
    });

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

  test('should create community with authenticated user', async () => {
    const authSetup = await authHelper.createAndAuthenticateUser();
    const authUser = authSetup.user;

    const { result } = renderHook(
      () => ({
        communities: useCommunities(),
        createCommunity: useCreateCommunity(),
      }),
      { wrapper },
    );

    waitFor(() => {
      expect(result.current.communities).toBeDefined();
    });

    // Create a community
    const communityData = TestDataFactory.createCommunity();
    const createdCommunity = await testUtils.performAsyncAction(
      () =>
        result.current.createCommunity({
          ...communityData,
          parentId: null,
          organizerId: authUser.userId,
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
        const communityIds = result.current.communities.map((c) => c.id);
        expect(communityIds).toContain(createdCommunity.id);
      },
      { timeout: 10000 },
    );
  });
});

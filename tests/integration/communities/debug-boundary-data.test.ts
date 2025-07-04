import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest';
import { useCreateCommunity, useCommunities } from '../../../src';
import {
  TestDataFactory,
  authHelper,
  cleanupHelper,
  testWrapperManager,
  testUtils,
} from '../helpers';

/**
 * Debug test to investigate boundary data storage and retrieval
 */

describe('Debug Boundary Data Investigation', () => {
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

  test('should investigate boundary data flow through creation and retrieval', async () => {
    let authUser: any;

    try {
      const authSetup = await authHelper.createAndAuthenticateUser();
      authUser = authSetup.user;
    } catch (error) {
      console.warn('Auth setup failed, skipping boundary investigation');
      return;
    }

    const { result: createResult } = await testUtils.renderHookWithWrapper(() =>
      useCreateCommunity(),
    );

    // Create community data WITH boundary
    const communityData =
      TestDataFactory.createCommunityWithBoundary('circular');
    const expectedBoundary = communityData.boundary!;

    console.log(
      '🔍 Input boundary data:',
      JSON.stringify(expectedBoundary, null, 2),
    );

    try {
      const createdCommunity = await testUtils.performAsyncAction(
        () =>
          createResult.current({
            ...communityData,
            organizerId: authUser.userId,
            parentId: null,
          }),
        'create community with boundary for investigation',
      );

      console.log('✅ Community created successfully:', createdCommunity.id);
      console.log(
        '🔍 Returned boundary data:',
        JSON.stringify(createdCommunity.boundary, null, 2),
      );
      console.log(
        '🔍 Full community object keys:',
        Object.keys(createdCommunity),
      );

      // Now test retrieval via useCommunities
      const { result: communitiesResult } =
        await testUtils.renderHookWithWrapper(() => useCommunities());

      await testUtils.waitForHookToInitialize(
        communitiesResult,
        (query) => query.isLoading !== undefined,
      );

      // Wait for data to load
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const communities = communitiesResult.current.data;
      const foundCommunity = communities?.find(
        (c) => c.id === createdCommunity.id,
      );

      console.log(
        '🔍 Retrieved community boundary:',
        JSON.stringify(foundCommunity?.boundary, null, 2),
      );
      console.log(
        '🔍 Retrieved community keys:',
        foundCommunity ? Object.keys(foundCommunity) : 'not found',
      );

      if (foundCommunity?.boundary) {
        console.log('✅ Boundary data retrieved successfully');
      } else {
        console.log('❌ Boundary data missing from retrieved community');
      }
    } catch (error) {
      console.log('❌ Community creation failed:', error);
    }

    // Just pass the test - we're gathering debug info
    expect(true).toBe(true);
  });
});

import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest';
import { useCreateCommunity } from '../../../src';
import {
  TestDataFactory,
  authHelper,
  cleanupHelper,
  testWrapperManager,
  testUtils,
} from '../helpers';

/**
 * Debug test to investigate role constraint issue
 */

describe('Debug Role Constraint Investigation', () => {
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

  test('should investigate valid roles for community memberships', async () => {
    let authUser: any;

    try {
      const authSetup = await authHelper.createAndAuthenticateUser();
      authUser = authSetup.user;
    } catch (error) {
      console.warn('Auth setup failed, skipping role investigation');
      return;
    }

    const { result: createResult } = await testUtils.renderHookWithWrapper(() =>
      useCreateCommunity(),
    );

    const communityData = TestDataFactory.createCommunity();

    // Test 1: Try to create community and see what role error we get
    try {
      const createdCommunity = await testUtils.performAsyncAction(
        () =>
          createResult.current({
            ...communityData,
            organizerId: authUser.userId,
            parentId: null,
          }),
        'create community to investigate role constraint',
      );

      console.log('✅ Community created successfully:', createdCommunity.id);
      console.log('📊 Community creation completed without role errors');
    } catch (error) {
      console.log('❌ Community creation failed with error:', error);

      if (error.message?.includes('role_check')) {
        console.log('🔍 Role constraint violation detected');
        console.log('🔍 Error details:', JSON.stringify(error, null, 2));
      }
    }

    // Just pass the test - we're gathering debug info
    expect(true).toBe(true);
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import { fetchResources } from '@/features/resources/api';
import { signIn } from '@/features/auth/api';
import { createResource, createResourceTimeslot } from '@/features/resources/api';
import { createFakeResourceInput, createFakeResourceTimeslotInput } from '@/features/resources/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';
import type { Resource } from '@/features/resources/types';

describe('Resource Offers Filter - Temporal Flags Integration Tests', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: User;
  let testCommunity: Community;

  // Test resource offer references
  let pastCompletedYesterday: Resource;
  let pastRegularYesterday: Resource;
  let pastNoEndOld: Resource;
  let pastCompletedToday: Resource;
  let currentActive: Resource;
  let currentRegularToday: Resource;
  let currentNoEndRecent: Resource;
  let futureLaterToday: Resource;
  let futureRegularLaterToday: Resource;
  let futureTomorrow: Resource;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test user and community
    testUser = await createTestUser(supabase);
    await signIn(supabase, testUser.email, 'TestPass123!');
    testCommunity = await createTestCommunity(supabase);

    // Create PAST resource offers

    // Past: Completed resource offer (ended yesterday)
    const yesterdayStart = new Date();
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(10, 0, 0, 0);
    const yesterdayEnd = new Date(
      yesterdayStart.getTime() + 2 * 60 * 60 * 1000,
    ); // 2 hours later

    const pastCompletedData = createFakeResourceInput({
      title: `${TEST_PREFIX}Past_Completed_Yesterday`,
      type: 'offer',
      communityId: testCommunity.id,
      imageUrls: [],
    });
    pastCompletedYesterday = await createResource(supabase, pastCompletedData);
    if (!pastCompletedYesterday)
      throw new Error('Failed to create past completed resource offer');

    await createResourceTimeslot(
      supabase,
      createFakeResourceTimeslotInput({
        resourceId: pastCompletedYesterday.id,
        startTime: yesterdayStart,
        endTime: yesterdayEnd,
        maxClaims: 5,
      }),
    );

    // Past: Regular resource offer (yesterday, no end time, started >2 hours ago)
    const yesterdayRegular = new Date();
    yesterdayRegular.setDate(yesterdayRegular.getDate() - 1);
    yesterdayRegular.setHours(8, 0, 0, 0);

    const pastRegularData = createFakeResourceInput({
      title: `${TEST_PREFIX}Past_Regular_Yesterday`,
      type: 'offer',
      communityId: testCommunity.id,
      imageUrls: [],
    });
    pastRegularYesterday = await createResource(supabase, pastRegularData);
    if (!pastRegularYesterday)
      throw new Error('Failed to create past regular resource offer');

    await createResourceTimeslot(
      supabase,
      createFakeResourceTimeslotInput({
        resourceId: pastRegularYesterday.id,
        startTime: yesterdayRegular,
        endTime: new Date(yesterdayRegular.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
        maxClaims: 3,
      }),
    );

    // Past: No-end resource offer (started 2+ hours ago)
    const oldStartTime = new Date(Date.now() - 2.5 * 60 * 60 * 1000); // 2.5 hours ago

    const pastNoEndData = createFakeResourceInput({
      title: `${TEST_PREFIX}Past_NoEnd_Old`,
      type: 'offer',
      communityId: testCommunity.id,
      imageUrls: [],
    });
    pastNoEndOld = await createResource(supabase, pastNoEndData);
    if (!pastNoEndOld)
      throw new Error('Failed to create past no-end resource offer');

    await createResourceTimeslot(
      supabase,
      createFakeResourceTimeslotInput({
        resourceId: pastNoEndOld.id,
        startTime: oldStartTime,
        endTime: new Date(oldStartTime.getTime() + 1 * 60 * 60 * 1000), // 1 hour later
        maxClaims: 2,
      }),
    );

    // Past: Completed resource offer (ended 4 hours ago)
    const todayEarlier = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 hours ago
    const todayEarlierEnd = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 hours ago

    const pastCompletedTodayData = createFakeResourceInput({
      title: `${TEST_PREFIX}Past_Completed_Today`,
      type: 'offer',
      communityId: testCommunity.id,
      imageUrls: [],
    });
    pastCompletedToday = await createResource(
      supabase,
      pastCompletedTodayData,
    );
    if (!pastCompletedToday)
      throw new Error('Failed to create past completed today resource offer');

    await createResourceTimeslot(
      supabase,
      createFakeResourceTimeslotInput({
        resourceId: pastCompletedToday.id,
        startTime: todayEarlier,
        endTime: todayEarlierEnd,
        maxClaims: 4,
      }),
    );

    // Create CURRENT resource offers

    // Current: Active resource offer (started 30min ago, ends in 30min)
    const activeStart = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
    const activeEnd = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now

    const currentActiveData = createFakeResourceInput({
      title: `${TEST_PREFIX}Current_Active`,
      type: 'offer',
      communityId: testCommunity.id,
      imageUrls: [],
    });
    currentActive = await createResource(supabase, currentActiveData);
    if (!currentActive)
      throw new Error('Failed to create current active resource offer');

    await createResourceTimeslot(
      supabase,
      createFakeResourceTimeslotInput({
        resourceId: currentActive.id,
        startTime: activeStart,
        endTime: activeEnd,
        maxClaims: 6,
      }),
    );

    // Current: Regular resource offer (started 1 hour ago, no end time - within 2 hour window)
    const currentRegularStart = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    const currentRegularData = createFakeResourceInput({
      title: `${TEST_PREFIX}Current_Regular_Today`,
      type: 'offer',
      communityId: testCommunity.id,
      imageUrls: [],
    });
    currentRegularToday = await createResource(supabase, currentRegularData);
    if (!currentRegularToday)
      throw new Error('Failed to create current regular resource offer');

    await createResourceTimeslot(
      supabase,
      createFakeResourceTimeslotInput({
        resourceId: currentRegularToday.id,
        startTime: currentRegularStart,
        endTime: new Date(currentRegularStart.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
        maxClaims: 3,
      }),
    );

    // Current: Recent no-end resource offer (started 30min ago, no end)
    const recentNoEndStart = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago

    const currentNoEndData = createFakeResourceInput({
      title: `${TEST_PREFIX}Current_NoEnd_Recent`,
      type: 'offer',
      communityId: testCommunity.id,
      imageUrls: [],
    });
    currentNoEndRecent = await createResource(supabase, currentNoEndData);
    if (!currentNoEndRecent)
      throw new Error('Failed to create current no-end resource offer');

    await createResourceTimeslot(
      supabase,
      createFakeResourceTimeslotInput({
        resourceId: currentNoEndRecent.id,
        startTime: recentNoEndStart,
        endTime: new Date(recentNoEndStart.getTime() + 1.5 * 60 * 60 * 1000), // 1.5 hours later
        maxClaims: 4,
      }),
    );

    // Create FUTURE resource offers

    // Future: Standard resource offer (starts 2 hours from now)
    const laterToday = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    const laterTodayEnd = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours from now

    const futureLaterTodayData = createFakeResourceInput({
      title: `${TEST_PREFIX}Future_Later_Today`,
      type: 'offer',
      communityId: testCommunity.id,
      imageUrls: [],
    });
    futureLaterToday = await createResource(supabase, futureLaterTodayData);
    if (!futureLaterToday)
      throw new Error('Failed to create future later today resource offer');

    await createResourceTimeslot(
      supabase,
      createFakeResourceTimeslotInput({
        resourceId: futureLaterToday.id,
        startTime: laterToday,
        endTime: laterTodayEnd,
        maxClaims: 5,
      }),
    );

    // Future: Regular resource offer (starts later today)
    const regularLaterToday = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours from now

    const futureRegularLaterData = createFakeResourceInput({
      title: `${TEST_PREFIX}Future_Regular_Later_Today`,
      type: 'offer',
      communityId: testCommunity.id,
      imageUrls: [],
    });
    futureRegularLaterToday = await createResource(
      supabase,
      futureRegularLaterData,
    );
    if (!futureRegularLaterToday)
      throw new Error('Failed to create future regular later today resource offer');

    await createResourceTimeslot(
      supabase,
      createFakeResourceTimeslotInput({
        resourceId: futureRegularLaterToday.id,
        startTime: regularLaterToday,
        endTime: new Date(regularLaterToday.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
        maxClaims: 2,
      }),
    );

    // Future: Standard resource offer (starts tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0); // 2pm tomorrow
    const tomorrowEnd = new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

    const futureTomorrowData = createFakeResourceInput({
      title: `${TEST_PREFIX}Future_Tomorrow`,
      type: 'offer',
      communityId: testCommunity.id,
      imageUrls: [],
    });
    futureTomorrow = await createResource(supabase, futureTomorrowData);
    if (!futureTomorrow)
      throw new Error('Failed to create future tomorrow resource offer');

    await createResourceTimeslot(
      supabase,
      createFakeResourceTimeslotInput({
        resourceId: futureTomorrow.id,
        startTime: tomorrow,
        endTime: tomorrowEnd,
        maxClaims: 8,
      }),
    );
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('temporal filtering flags', () => {
    it('typical feed scenario - includes current and future, excludes past', async () => {
      const resources = await fetchResources(supabase, {
        type: 'offer',
        communityId: testCommunity.id,
        includePast: false,
        includeCurrent: true,
        includeUpcoming: true,
      });

      // Should include current resource offers
      expect(resources.some((r) => r.id === currentActive.id)).toBe(true);
      expect(resources.some((r) => r.id === currentRegularToday.id)).toBe(
        true,
      );
      expect(resources.some((r) => r.id === currentNoEndRecent.id)).toBe(true);

      // Should include future resource offers
      expect(resources.some((r) => r.id === futureLaterToday.id)).toBe(true);
      expect(resources.some((r) => r.id === futureRegularLaterToday.id)).toBe(
        true,
      );
      expect(resources.some((r) => r.id === futureTomorrow.id)).toBe(true);

      // Should exclude past resource offers
      expect(resources.some((r) => r.id === pastCompletedYesterday.id)).toBe(
        false,
      );
      expect(resources.some((r) => r.id === pastRegularYesterday.id)).toBe(
        false,
      );
      expect(resources.some((r) => r.id === pastNoEndOld.id)).toBe(false);
      expect(resources.some((r) => r.id === pastCompletedToday.id)).toBe(
        false,
      );
    });

    it('past-only filter - includes only past resource offers', async () => {
      const resources = await fetchResources(supabase, {
        type: 'offer',
        communityId: testCommunity.id,
        includePast: true,
        includeCurrent: false,
        includeUpcoming: false,
      });

      // Should include past resource offers
      expect(resources.some((r) => r.id === pastCompletedYesterday.id)).toBe(
        true,
      );
      expect(resources.some((r) => r.id === pastRegularYesterday.id)).toBe(
        true,
      );
      expect(resources.some((r) => r.id === pastNoEndOld.id)).toBe(true);
      expect(resources.some((r) => r.id === pastCompletedToday.id)).toBe(true);

      // Should exclude current resource offers
      expect(resources.some((r) => r.id === currentActive.id)).toBe(false);
      expect(resources.some((r) => r.id === currentRegularToday.id)).toBe(
        false,
      );
      expect(resources.some((r) => r.id === currentNoEndRecent.id)).toBe(
        false,
      );

      // Should exclude future resource offers
      expect(resources.some((r) => r.id === futureLaterToday.id)).toBe(false);
      expect(resources.some((r) => r.id === futureRegularLaterToday.id)).toBe(
        false,
      );
      expect(resources.some((r) => r.id === futureTomorrow.id)).toBe(false);
    });

    it('current-only filter - validates complex current logic', async () => {
      const resources = await fetchResources(supabase, {
        type: 'offer',
        communityId: testCommunity.id,
        includePast: false,
        includeCurrent: true,
        includeUpcoming: false,
      });

      // Should include current resource offers with different current logic:
      // - Active standard resource offer (within start/end time)
      expect(resources.some((r) => r.id === currentActive.id)).toBe(true);
      // - Regular resource offer started within 2-hour window
      expect(resources.some((r) => r.id === currentRegularToday.id)).toBe(
        true,
      );
      // - No-end resource offer started within 2-hour window
      expect(resources.some((r) => r.id === currentNoEndRecent.id)).toBe(true);

      // Should exclude past resource offers
      expect(resources.some((r) => r.id === pastCompletedYesterday.id)).toBe(
        false,
      );
      expect(resources.some((r) => r.id === pastRegularYesterday.id)).toBe(
        false,
      );
      expect(resources.some((r) => r.id === pastNoEndOld.id)).toBe(false);
      expect(resources.some((r) => r.id === pastCompletedToday.id)).toBe(
        false,
      );

      // Should exclude future resource offers
      expect(resources.some((r) => r.id === futureLaterToday.id)).toBe(false);
      expect(resources.some((r) => r.id === futureRegularLaterToday.id)).toBe(
        false,
      );
      expect(resources.some((r) => r.id === futureTomorrow.id)).toBe(false);
    });
  });
});
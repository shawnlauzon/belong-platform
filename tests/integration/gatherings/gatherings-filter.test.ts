import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import { fetchGatherings } from '@/features/gatherings/api';
import { signIn } from '@/features/auth/api';
import { createGathering } from '@/features/gatherings/api';
import { createFakeGatheringInput } from '@/features/gatherings/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';
import type { Gathering } from '@/features/gatherings/types';

describe('Gatherings Filter - Temporal Flags Integration Tests', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: User;
  let testCommunity: Community;

  // Test gathering references
  let pastCompletedYesterday: Gathering;
  let pastRegularYesterday: Gathering;
  let pastNoEndOld: Gathering;
  let pastCompletedToday: Gathering;
  let currentActive: Gathering;
  let currentRegularToday: Gathering;
  let currentNoEndRecent: Gathering;
  let futureLaterToday: Gathering;
  let futureRegularLaterToday: Gathering;
  let futureTomorrow: Gathering;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test user and community
    testUser = await createTestUser(supabase);
    await signIn(supabase, testUser.email, 'TestPass123!');
    testCommunity = await createTestCommunity(supabase);

    // Create PAST gatherings

    // Past: Completed gathering (ended yesterday)
    const yesterdayStart = new Date();
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(10, 0, 0, 0);
    const yesterdayEnd = new Date(
      yesterdayStart.getTime() + 2 * 60 * 60 * 1000,
    ); // 2 hours later

    const pastCompletedData = createFakeGatheringInput({
      title: `${TEST_PREFIX}Past_Completed_Yesterday`,
      communityId: testCommunity.id,
      organizerId: testUser.id,
      startDateTime: yesterdayStart,
      endDateTime: yesterdayEnd,
      imageUrls: [],
    });
    pastCompletedYesterday = await createGathering(supabase, pastCompletedData);
    if (!pastCompletedYesterday)
      throw new Error('Failed to create past completed gathering');

    // Past: Regular gathering (yesterday, no end time, started >2 hours ago)
    const yesterdayRegular = new Date();
    yesterdayRegular.setDate(yesterdayRegular.getDate() - 1);
    yesterdayRegular.setHours(8, 0, 0, 0);

    const pastRegularData = createFakeGatheringInput({
      title: `${TEST_PREFIX}Past_Regular_Yesterday`,
      communityId: testCommunity.id,
      organizerId: testUser.id,
      startDateTime: yesterdayRegular,
      endDateTime: undefined,
      imageUrls: [],
    });
    pastRegularYesterday = await createGathering(supabase, pastRegularData);
    if (!pastRegularYesterday)
      throw new Error('Failed to create past regular gathering');

    // Past: No-end gathering (started 2+ hours ago)
    const oldStartTime = new Date(Date.now() - 2.5 * 60 * 60 * 1000); // 2.5 hours ago

    const pastNoEndData = createFakeGatheringInput({
      title: `${TEST_PREFIX}Past_NoEnd_Old`,
      communityId: testCommunity.id,
      organizerId: testUser.id,
      startDateTime: oldStartTime,
      endDateTime: undefined,
      imageUrls: [],
    });
    pastNoEndOld = await createGathering(supabase, pastNoEndData);
    if (!pastNoEndOld)
      throw new Error('Failed to create past no-end gathering');

    // Past: Completed gathering (ended 4 hours ago)
    const todayEarlier = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 hours ago
    const todayEarlierEnd = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 hours ago

    const pastCompletedTodayData = createFakeGatheringInput({
      title: `${TEST_PREFIX}Past_Completed_Today`,
      communityId: testCommunity.id,
      organizerId: testUser.id,
      startDateTime: todayEarlier,
      endDateTime: todayEarlierEnd,
      imageUrls: [],
    });
    pastCompletedToday = await createGathering(
      supabase,
      pastCompletedTodayData,
    );
    if (!pastCompletedToday)
      throw new Error('Failed to create past completed today gathering');

    // Create CURRENT gatherings

    // Current: Active gathering (started 30min ago, ends in 30min)
    const activeStart = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
    const activeEnd = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now

    const currentActiveData = createFakeGatheringInput({
      title: `${TEST_PREFIX}Current_Active`,
      communityId: testCommunity.id,
      organizerId: testUser.id,
      startDateTime: activeStart,
      endDateTime: activeEnd,
      imageUrls: [],
    });
    currentActive = await createGathering(supabase, currentActiveData);
    if (!currentActive)
      throw new Error('Failed to create current active gathering');

    // Current: Regular gathering (started 1 hour ago, no end time - within 2 hour window)
    const currentRegularStart = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    const currentRegularData = createFakeGatheringInput({
      title: `${TEST_PREFIX}Current_Regular_Today`,
      communityId: testCommunity.id,
      organizerId: testUser.id,
      startDateTime: currentRegularStart,
      endDateTime: undefined,
      imageUrls: [],
    });
    currentRegularToday = await createGathering(supabase, currentRegularData);
    if (!currentRegularToday)
      throw new Error('Failed to create current regular gathering');

    // Current: Recent no-end gathering (started 30min ago, no end)
    const recentNoEndStart = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago

    const currentNoEndData = createFakeGatheringInput({
      title: `${TEST_PREFIX}Current_NoEnd_Recent`,
      communityId: testCommunity.id,
      organizerId: testUser.id,
      startDateTime: recentNoEndStart,
      endDateTime: undefined,
      imageUrls: [],
    });
    currentNoEndRecent = await createGathering(supabase, currentNoEndData);
    if (!currentNoEndRecent)
      throw new Error('Failed to create current no-end gathering');

    // Create FUTURE gatherings

    // Future: Standard gathering (starts 2 hours from now)
    const laterToday = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    const laterTodayEnd = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours from now

    const futureLaterTodayData = createFakeGatheringInput({
      title: `${TEST_PREFIX}Future_Later_Today`,
      communityId: testCommunity.id,
      organizerId: testUser.id,
      startDateTime: laterToday,
      endDateTime: laterTodayEnd,
      imageUrls: [],
    });
    futureLaterToday = await createGathering(supabase, futureLaterTodayData);
    if (!futureLaterToday)
      throw new Error('Failed to create future later today gathering');

    // Future: Regular gathering (starts later today)
    const regularLaterToday = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours from now

    const futureRegularLaterData = createFakeGatheringInput({
      title: `${TEST_PREFIX}Future_Regular_Later_Today`,
      communityId: testCommunity.id,
      organizerId: testUser.id,
      startDateTime: regularLaterToday,
      endDateTime: undefined,
      imageUrls: [],
    });
    futureRegularLaterToday = await createGathering(
      supabase,
      futureRegularLaterData,
    );
    if (!futureRegularLaterToday)
      throw new Error('Failed to create future regular later today gathering');

    // Future: Standard gathering (starts tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0); // 2pm tomorrow
    const tomorrowEnd = new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

    const futureTomorrowData = createFakeGatheringInput({
      title: `${TEST_PREFIX}Future_Tomorrow`,
      communityId: testCommunity.id,
      organizerId: testUser.id,
      startDateTime: tomorrow,
      endDateTime: tomorrowEnd,
      imageUrls: [],
    });
    futureTomorrow = await createGathering(supabase, futureTomorrowData);
    if (!futureTomorrow)
      throw new Error('Failed to create future tomorrow gathering');
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('temporal filtering flags', () => {
    it('typical feed scenario - includes current and future, excludes past', async () => {
      const gatherings = await fetchGatherings(supabase, {
        communityId: testCommunity.id,
        includePast: false,
        includeCurrent: true,
        includeFuture: true,
      });

      // Should include current gatherings
      expect(gatherings.some((g) => g.id === currentActive.id)).toBe(true);
      expect(gatherings.some((g) => g.id === currentRegularToday.id)).toBe(
        true,
      );
      expect(gatherings.some((g) => g.id === currentNoEndRecent.id)).toBe(true);

      // Should include future gatherings
      expect(gatherings.some((g) => g.id === futureLaterToday.id)).toBe(true);
      expect(gatherings.some((g) => g.id === futureRegularLaterToday.id)).toBe(
        true,
      );
      expect(gatherings.some((g) => g.id === futureTomorrow.id)).toBe(true);

      // Should exclude past gatherings
      expect(gatherings.some((g) => g.id === pastCompletedYesterday.id)).toBe(
        false,
      );
      expect(gatherings.some((g) => g.id === pastRegularYesterday.id)).toBe(
        false,
      );
      expect(gatherings.some((g) => g.id === pastNoEndOld.id)).toBe(false);
      expect(gatherings.some((g) => g.id === pastCompletedToday.id)).toBe(
        false,
      );
    });

    it('past-only filter - includes only past gatherings', async () => {
      const gatherings = await fetchGatherings(supabase, {
        communityId: testCommunity.id,
        includePast: true,
        includeCurrent: false,
        includeFuture: false,
      });

      // Should include past gatherings
      expect(gatherings.some((g) => g.id === pastCompletedYesterday.id)).toBe(
        true,
      );
      expect(gatherings.some((g) => g.id === pastRegularYesterday.id)).toBe(
        true,
      );
      expect(gatherings.some((g) => g.id === pastNoEndOld.id)).toBe(true);
      expect(gatherings.some((g) => g.id === pastCompletedToday.id)).toBe(true);

      // Should exclude current gatherings
      expect(gatherings.some((g) => g.id === currentActive.id)).toBe(false);
      expect(gatherings.some((g) => g.id === currentRegularToday.id)).toBe(
        false,
      );
      expect(gatherings.some((g) => g.id === currentNoEndRecent.id)).toBe(
        false,
      );

      // Should exclude future gatherings
      expect(gatherings.some((g) => g.id === futureLaterToday.id)).toBe(false);
      expect(gatherings.some((g) => g.id === futureRegularLaterToday.id)).toBe(
        false,
      );
      expect(gatherings.some((g) => g.id === futureTomorrow.id)).toBe(false);
    });

    it('current-only filter - validates complex current logic', async () => {
      const gatherings = await fetchGatherings(supabase, {
        communityId: testCommunity.id,
        includePast: false,
        includeCurrent: true,
        includeFuture: false,
      });

      // Should include current gatherings with different current logic:
      // - Active standard gathering (within start/end time)
      expect(gatherings.some((g) => g.id === currentActive.id)).toBe(true);
      // - Regular gathering started within 2-hour window
      expect(gatherings.some((g) => g.id === currentRegularToday.id)).toBe(
        true,
      );
      // - No-end gathering started within 2-hour window
      expect(gatherings.some((g) => g.id === currentNoEndRecent.id)).toBe(true);

      // Should exclude past gatherings
      expect(gatherings.some((g) => g.id === pastCompletedYesterday.id)).toBe(
        false,
      );
      expect(gatherings.some((g) => g.id === pastRegularYesterday.id)).toBe(
        false,
      );
      expect(gatherings.some((g) => g.id === pastNoEndOld.id)).toBe(false);
      expect(gatherings.some((g) => g.id === pastCompletedToday.id)).toBe(
        false,
      );

      // Should exclude future gatherings
      expect(gatherings.some((g) => g.id === futureLaterToday.id)).toBe(false);
      expect(gatherings.some((g) => g.id === futureRegularLaterToday.id)).toBe(
        false,
      );
      expect(gatherings.some((g) => g.id === futureTomorrow.id)).toBe(false);
    });
  });
});

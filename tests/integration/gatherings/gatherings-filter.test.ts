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
  let pastAllDayYesterday: Gathering;
  let pastNoEndOld: Gathering;
  let pastCompletedToday: Gathering;
  let currentActive: Gathering;
  let currentAllDayToday: Gathering;
  let currentNoEndRecent: Gathering;
  let futureLaterToday: Gathering;
  let futureAllDayLaterToday: Gathering;
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
    const yesterdayEnd = new Date(yesterdayStart.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

    const pastCompletedData = createFakeGatheringInput({
      title: `${TEST_PREFIX}Past_Completed_Yesterday`,
      communityId: testCommunity.id,
      organizerId: testUser.id,
      startDateTime: yesterdayStart,
      endDateTime: yesterdayEnd,
      isAllDay: false,
    });
    pastCompletedYesterday = await createGathering(supabase, pastCompletedData);
    if (!pastCompletedYesterday) throw new Error('Failed to create past completed gathering');

    // Past: All-day gathering (yesterday)
    const yesterdayAllDay = new Date();
    yesterdayAllDay.setDate(yesterdayAllDay.getDate() - 1);
    yesterdayAllDay.setHours(0, 0, 0, 0);

    const pastAllDayData = createFakeGatheringInput({
      title: `${TEST_PREFIX}Past_AllDay_Yesterday`,
      communityId: testCommunity.id,
      organizerId: testUser.id,
      startDateTime: yesterdayAllDay,
      endDateTime: undefined,
      isAllDay: true,
    });
    pastAllDayYesterday = await createGathering(supabase, pastAllDayData);
    if (!pastAllDayYesterday) throw new Error('Failed to create past all-day gathering');

    // Past: No-end gathering (started 2+ hours ago)
    const oldStartTime = new Date(Date.now() - 2.5 * 60 * 60 * 1000); // 2.5 hours ago

    const pastNoEndData = createFakeGatheringInput({
      title: `${TEST_PREFIX}Past_NoEnd_Old`,
      communityId: testCommunity.id,
      organizerId: testUser.id,
      startDateTime: oldStartTime,
      endDateTime: undefined,
      isAllDay: false,
    });
    pastNoEndOld = await createGathering(supabase, pastNoEndData);
    if (!pastNoEndOld) throw new Error('Failed to create past no-end gathering');

    // Past: Completed gathering (ended earlier today)
    const todayEarlier = new Date();
    todayEarlier.setHours(8, 0, 0, 0); // 8am today
    const todayEarlierEnd = new Date();
    todayEarlierEnd.setHours(10, 0, 0, 0); // 10am today

    const pastCompletedTodayData = createFakeGatheringInput({
      title: `${TEST_PREFIX}Past_Completed_Today`,
      communityId: testCommunity.id,
      organizerId: testUser.id,
      startDateTime: todayEarlier,
      endDateTime: todayEarlierEnd,
      isAllDay: false,
    });
    pastCompletedToday = await createGathering(supabase, pastCompletedTodayData);
    if (!pastCompletedToday) throw new Error('Failed to create past completed today gathering');

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
      isAllDay: false,
    });
    currentActive = await createGathering(supabase, currentActiveData);
    if (!currentActive) throw new Error('Failed to create current active gathering');

    // Current: All-day gathering (today)
    const todayAllDay = new Date();
    todayAllDay.setHours(0, 0, 0, 0);

    const currentAllDayData = createFakeGatheringInput({
      title: `${TEST_PREFIX}Current_AllDay_Today`,
      communityId: testCommunity.id,
      organizerId: testUser.id,
      startDateTime: todayAllDay,
      endDateTime: undefined,
      isAllDay: true,
    });
    currentAllDayToday = await createGathering(supabase, currentAllDayData);
    if (!currentAllDayToday) throw new Error('Failed to create current all-day gathering');

    // Current: Recent no-end gathering (started 30min ago, no end)
    const recentNoEndStart = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago

    const currentNoEndData = createFakeGatheringInput({
      title: `${TEST_PREFIX}Current_NoEnd_Recent`,
      communityId: testCommunity.id,
      organizerId: testUser.id,
      startDateTime: recentNoEndStart,
      endDateTime: undefined,
      isAllDay: false,
    });
    currentNoEndRecent = await createGathering(supabase, currentNoEndData);
    if (!currentNoEndRecent) throw new Error('Failed to create current no-end gathering');

    // Create FUTURE gatherings

    // Future: Standard gathering (starts later today)
    const laterToday = new Date();
    laterToday.setHours(18, 0, 0, 0); // 6pm today
    const laterTodayEnd = new Date();
    laterTodayEnd.setHours(20, 0, 0, 0); // 8pm today

    const futureLaterTodayData = createFakeGatheringInput({
      title: `${TEST_PREFIX}Future_Later_Today`,
      communityId: testCommunity.id,
      organizerId: testUser.id,
      startDateTime: laterToday,
      endDateTime: laterTodayEnd,
      isAllDay: false,
    });
    futureLaterToday = await createGathering(supabase, futureLaterTodayData);
    if (!futureLaterToday) throw new Error('Failed to create future later today gathering');

    // Future: All-day gathering (starts later today but all-day)
    const allDayLaterToday = new Date();
    allDayLaterToday.setHours(12, 0, 0, 0); // Noon today (but all-day)

    const futureAllDayLaterData = createFakeGatheringInput({
      title: `${TEST_PREFIX}Future_AllDay_Later_Today`,
      communityId: testCommunity.id,
      organizerId: testUser.id,
      startDateTime: allDayLaterToday,
      endDateTime: undefined,
      isAllDay: true,
    });
    futureAllDayLaterToday = await createGathering(supabase, futureAllDayLaterData);
    if (!futureAllDayLaterToday) throw new Error('Failed to create future all-day later today gathering');

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
      isAllDay: false,
    });
    futureTomorrow = await createGathering(supabase, futureTomorrowData);
    if (!futureTomorrow) throw new Error('Failed to create future tomorrow gathering');
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('temporal filtering flags', () => {
    it('typical feed scenario - includes current and future, excludes past', async () => {
      await signIn(supabase, testUser.email, 'TestPass123!');

      const gatherings = await fetchGatherings(supabase, {
        communityId: testCommunity.id,
        includePast: false,
        includeCurrent: true,
        includeFuture: true,
      });

      // Should include current gatherings
      expect(gatherings.some(g => g.id === currentActive.id)).toBe(true);
      expect(gatherings.some(g => g.id === currentAllDayToday.id)).toBe(true);
      expect(gatherings.some(g => g.id === currentNoEndRecent.id)).toBe(true);

      // Should include future gatherings
      expect(gatherings.some(g => g.id === futureLaterToday.id)).toBe(true);
      expect(gatherings.some(g => g.id === futureAllDayLaterToday.id)).toBe(true);
      expect(gatherings.some(g => g.id === futureTomorrow.id)).toBe(true);

      // Should exclude past gatherings
      expect(gatherings.some(g => g.id === pastCompletedYesterday.id)).toBe(false);
      expect(gatherings.some(g => g.id === pastAllDayYesterday.id)).toBe(false);
      expect(gatherings.some(g => g.id === pastNoEndOld.id)).toBe(false);
      expect(gatherings.some(g => g.id === pastCompletedToday.id)).toBe(false);
    });

    it('past-only filter - includes only past gatherings', async () => {
      await signIn(supabase, testUser.email, 'TestPass123!');

      const gatherings = await fetchGatherings(supabase, {
        communityId: testCommunity.id,
        includePast: true,
        includeCurrent: false,
        includeFuture: false,
      });

      // Should include past gatherings
      expect(gatherings.some(g => g.id === pastCompletedYesterday.id)).toBe(true);
      expect(gatherings.some(g => g.id === pastAllDayYesterday.id)).toBe(true);
      expect(gatherings.some(g => g.id === pastNoEndOld.id)).toBe(true);
      expect(gatherings.some(g => g.id === pastCompletedToday.id)).toBe(true);

      // Should exclude current gatherings
      expect(gatherings.some(g => g.id === currentActive.id)).toBe(false);
      expect(gatherings.some(g => g.id === currentAllDayToday.id)).toBe(false);
      expect(gatherings.some(g => g.id === currentNoEndRecent.id)).toBe(false);

      // Should exclude future gatherings
      expect(gatherings.some(g => g.id === futureLaterToday.id)).toBe(false);
      expect(gatherings.some(g => g.id === futureAllDayLaterToday.id)).toBe(false);
      expect(gatherings.some(g => g.id === futureTomorrow.id)).toBe(false);
    });

    it('current-only filter - validates complex current logic', async () => {
      await signIn(supabase, testUser.email, 'TestPass123!');

      const gatherings = await fetchGatherings(supabase, {
        communityId: testCommunity.id,
        includePast: false,
        includeCurrent: true,
        includeFuture: false,
      });

      // Should include current gatherings with different current logic:
      // - Active standard gathering (within start/end time)
      expect(gatherings.some(g => g.id === currentActive.id)).toBe(true);
      // - All-day gathering for today
      expect(gatherings.some(g => g.id === currentAllDayToday.id)).toBe(true);
      // - No-end gathering started within 1 hour
      expect(gatherings.some(g => g.id === currentNoEndRecent.id)).toBe(true);

      // Should exclude past gatherings
      expect(gatherings.some(g => g.id === pastCompletedYesterday.id)).toBe(false);
      expect(gatherings.some(g => g.id === pastAllDayYesterday.id)).toBe(false);
      expect(gatherings.some(g => g.id === pastNoEndOld.id)).toBe(false);
      expect(gatherings.some(g => g.id === pastCompletedToday.id)).toBe(false);

      // Should exclude future gatherings
      expect(gatherings.some(g => g.id === futureLaterToday.id)).toBe(false);
      expect(gatherings.some(g => g.id === futureAllDayLaterToday.id)).toBe(false);
      expect(gatherings.some(g => g.id === futureTomorrow.id)).toBe(false);
    });
  });
});
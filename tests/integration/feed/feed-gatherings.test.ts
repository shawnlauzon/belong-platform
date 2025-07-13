import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestGathering,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import { fetchFeed } from '@/features/feed/api';
import { getGatheringItems } from '@/features/feed/types';
import { signIn } from '@/features/auth/api';
import { createGathering } from '@/features/gatherings/api';
import { createFakeGatheringInput } from '@/features/gatherings/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';

describe('Feed API - Gatherings Integration Tests', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: User;
  let testCommunity: Community;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test user and community
    testUser = await createTestUser(supabase);
    await signIn(supabase, testUser.email, 'TestPass123!');
    testCommunity = await createTestCommunity(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('temporal filtering', () => {
    it('only returns current and upcoming gatherings, not past ones', async () => {
      // Sign in as testUser 
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create timed gatherings with different dates
      const pastGatheringData = createFakeGatheringInput({
        title: `${TEST_PREFIX}Past_Timed_${Date.now()}`,
        description: `${TEST_PREFIX} past timed gathering`,
        communityId: testCommunity.id,
        organizerId: testUser.id,
        startDateTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        endDateTime: new Date(Date.now() - 23 * 60 * 60 * 1000), // Yesterday + 1 hour
        isAllDay: false, // Explicitly set for timed gathering
      });

      const pastGathering = await createGathering(supabase, pastGatheringData);
      if (!pastGathering) throw new Error('Failed to create past gathering');

      const currentGatheringData = createFakeGatheringInput({
        title: `${TEST_PREFIX}Current_Timed_${Date.now()}`,
        description: `${TEST_PREFIX} current timed gathering`,
        communityId: testCommunity.id,
        organizerId: testUser.id,
        startDateTime: new Date(), // Now
        endDateTime: new Date(Date.now() + 60 * 60 * 1000), // Now + 1 hour
        isAllDay: false, // Explicitly set for timed gathering
      });

      const currentGathering = await createGathering(supabase, currentGatheringData);
      if (!currentGathering) throw new Error('Failed to create current gathering');

      // Fetch the feed
      const feed = await fetchFeed(supabase);

      // Filter gatherings from the feed using type-safe function
      const gatheringItems = getGatheringItems(feed.items);

      // Verify that past gathering is NOT in the feed
      expect(
        gatheringItems.some((item) => item.data.id === pastGathering.id),
      ).toBe(false);

      // Verify that current gathering IS in the feed
      expect(
        gatheringItems.some((item) => item.data.id === currentGathering.id),
      ).toBe(true);

      // All returned gatherings should have start dates in the future or current
      const now = new Date();
      gatheringItems.forEach((item) => {
        const startDate = new Date(item.data.startDateTime);
        expect(startDate.getTime()).toBeGreaterThanOrEqual(now.getTime() - 5000); // Allow 5 second tolerance for test execution time
      });
    });

    it('shows ongoing events without end time that started less than an hour ago', async () => {
      // Sign in as testUser 
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create a timed gathering that started 30 minutes ago with no end time (ongoing)
      const ongoingGatheringData = createFakeGatheringInput({
        title: `${TEST_PREFIX}Ongoing_Timed_${Date.now()}`,
        description: `${TEST_PREFIX} ongoing timed gathering`,
        communityId: testCommunity.id,
        organizerId: testUser.id,
        startDateTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        endDateTime: undefined, // No end time - ongoing event
        isAllDay: false, // Explicitly set for timed gathering
      });

      const ongoingGathering = await createGathering(supabase, ongoingGatheringData);
      if (!ongoingGathering) throw new Error('Failed to create ongoing gathering');

      // Create a timed gathering that started 2 hours ago with no end time (should be filtered out)
      const oldGatheringData = createFakeGatheringInput({
        title: `${TEST_PREFIX}Old_Timed_${Date.now()}`,
        description: `${TEST_PREFIX} old timed gathering`,
        communityId: testCommunity.id,
        organizerId: testUser.id,
        startDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        endDateTime: undefined, // No end time - ongoing event
        isAllDay: false, // Explicitly set for timed gathering
      });

      const oldGathering = await createGathering(supabase, oldGatheringData);
      if (!oldGathering) throw new Error('Failed to create old gathering');

      // Fetch the feed
      const feed = await fetchFeed(supabase);

      // Filter gatherings from the feed using type-safe function
      const gatheringItems = getGatheringItems(feed.items);

      // Verify that recent ongoing gathering (30 min ago, no end time) IS in the feed
      expect(
        gatheringItems.some((item) => item.data.id === ongoingGathering.id),
      ).toBe(true);

      // Verify that old ongoing gathering (2 hours ago, no end time) is NOT in the feed
      expect(
        gatheringItems.some((item) => item.data.id === oldGathering.id),
      ).toBe(false);

      // Find the ongoing gathering in the feed and verify its properties
      const ongoingItem = gatheringItems.find((item) => item.data.id === ongoingGathering.id);
      if (ongoingItem) {
        expect(ongoingItem.data.endDateTime).toBeNull();
        const startTime = new Date(ongoingItem.data.startDateTime);
        const minutesAgo = (Date.now() - startTime.getTime()) / (1000 * 60);
        expect(minutesAgo).toBeLessThan(60); // Should be less than an hour old
      }
    });

    it('shows all-day gatherings for the current day', async () => {
      // Sign in as testUser 
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create an all-day gathering for today starting at 10am
      const today = new Date();
      today.setHours(10, 0, 0, 0); // 10am today
      
      const todayAllDayData = createFakeGatheringInput({
        title: `${TEST_PREFIX}AllDay_Today_${Date.now()}`,
        description: `${TEST_PREFIX} all-day gathering for today`,
        communityId: testCommunity.id,
        organizerId: testUser.id,
        startDateTime: today,
        endDateTime: undefined,
        isAllDay: true,
      });

      const todayAllDay = await createGathering(supabase, todayAllDayData);
      if (!todayAllDay) throw new Error('Failed to create today all-day gathering');

      // Create an all-day gathering for yesterday (should be filtered out)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(14, 30, 0, 0); // 2:30pm yesterday
      
      const yesterdayAllDayData = createFakeGatheringInput({
        title: `${TEST_PREFIX}AllDay_Yesterday_${Date.now()}`,
        description: `${TEST_PREFIX} all-day gathering for yesterday`,
        communityId: testCommunity.id,
        organizerId: testUser.id,
        startDateTime: yesterday,
        endDateTime: undefined,
        isAllDay: true,
      });

      const yesterdayAllDay = await createGathering(supabase, yesterdayAllDayData);
      if (!yesterdayAllDay) throw new Error('Failed to create yesterday all-day gathering');

      // Fetch the feed
      const feed = await fetchFeed(supabase);

      // Filter gatherings from the feed using type-safe function
      const gatheringItems = getGatheringItems(feed.items);

      // Verify that today's all-day gathering IS in the feed
      expect(
        gatheringItems.some((item) => item.data.id === todayAllDay.id),
      ).toBe(true);

      // Verify that yesterday's all-day gathering is NOT in the feed
      expect(
        gatheringItems.some((item) => item.data.id === yesterdayAllDay.id),
      ).toBe(false);

      // Find the all-day gathering in the feed and verify its properties
      const allDayItem = gatheringItems.find((item) => item.data.id === todayAllDay.id);
      if (allDayItem) {
        expect(allDayItem.data.isAllDay).toBe(true);
        expect(allDayItem.data.endDateTime).toBeNull();
      }
    });
  });
});
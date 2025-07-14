import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
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
        imageUrls: [],
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
        imageUrls: [],
      });

      const currentGathering = await createGathering(
        supabase,
        currentGatheringData,
      );
      if (!currentGathering)
        throw new Error('Failed to create current gathering');

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
        expect(startDate.getTime()).toBeGreaterThanOrEqual(
          now.getTime() - 5000,
        ); // Allow 5 second tolerance for test execution time
      });
    });

    it('shows ongoing events without end time that started less than 2 hours ago', async () => {
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
        imageUrls: [],
      });

      const ongoingGathering = await createGathering(
        supabase,
        ongoingGatheringData,
      );
      if (!ongoingGathering)
        throw new Error('Failed to create ongoing gathering');

      // Create a timed gathering that started 2 hours ago with no end time (should be filtered out)
      const oldGatheringData = createFakeGatheringInput({
        title: `${TEST_PREFIX}Old_Timed_${Date.now()}`,
        description: `${TEST_PREFIX} old timed gathering`,
        communityId: testCommunity.id,
        organizerId: testUser.id,
        startDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        endDateTime: undefined, // No end time - ongoing event
        imageUrls: [],
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
      const ongoingItem = gatheringItems.find(
        (item) => item.data.id === ongoingGathering.id,
      );
      if (ongoingItem) {
        expect(ongoingItem.data.endDateTime).toBeUndefined();
        const startTime = new Date(ongoingItem.data.startDateTime);
        const minutesAgo = (Date.now() - startTime.getTime()) / (1000 * 60);
        expect(minutesAgo).toBeLessThan(120); // Should be less than 2 hours old
      }
    });

    it('shows future gatherings without end time', async () => {
      // Sign in as testUser
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create a gathering that starts in 1 hour with no end time (future)
      const futureGatheringData = createFakeGatheringInput({
        title: `${TEST_PREFIX}Future_${Date.now()}`,
        description: `${TEST_PREFIX} future gathering`,
        communityId: testCommunity.id,
        organizerId: testUser.id,
        startDateTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        endDateTime: undefined,
        imageUrls: [],
      });

      const futureGathering = await createGathering(supabase, futureGatheringData);
      if (!futureGathering)
        throw new Error('Failed to create future gathering');

      // Create a gathering that started 3 hours ago with no end time (should be filtered out)
      const pastGatheringData = createFakeGatheringInput({
        title: `${TEST_PREFIX}Past_NoEnd_${Date.now()}`,
        description: `${TEST_PREFIX} past gathering without end time`,
        communityId: testCommunity.id,
        organizerId: testUser.id,
        startDateTime: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        endDateTime: undefined,
        imageUrls: [],
      });

      const pastGathering = await createGathering(
        supabase,
        pastGatheringData,
      );
      if (!pastGathering)
        throw new Error('Failed to create past gathering');

      // Fetch the feed
      const feed = await fetchFeed(supabase);

      // Filter gatherings from the feed using type-safe function
      const gatheringItems = getGatheringItems(feed.items);

      // Verify that future gathering IS in the feed
      expect(
        gatheringItems.some((item) => item.data.id === futureGathering.id),
      ).toBe(true);

      // Verify that past gathering (3 hours ago, outside 2-hour window) is NOT in the feed
      expect(
        gatheringItems.some((item) => item.data.id === pastGathering.id),
      ).toBe(false);

      // Find the future gathering in the feed and verify its properties
      const futureItem = gatheringItems.find(
        (item) => item.data.id === futureGathering.id,
      );
      if (futureItem) {
        expect(futureItem.data.endDateTime).toBeUndefined();
        const startTime = new Date(futureItem.data.startDateTime);
        expect(startTime.getTime()).toBeGreaterThan(Date.now()); // Should be in the future
      }
    });
  });
});

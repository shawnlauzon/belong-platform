import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import { fetchFeed } from '@/features/feed/api';
import { getResourceItems } from '@/features/feed/types';
import { signIn } from '@/features/auth/api';
import { createResource, createResourceTimeslot } from '@/features/resources/api';
import { createFakeResourceInput, createFakeResourceTimeslotInput } from '@/features/resources/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';

describe('Feed API - Resource Offers Integration Tests', () => {
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
    it('only returns current and upcoming resource offers, not past ones', async () => {
      // Sign in as testUser
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create timed resource offers with different dates
      const pastResourceData = createFakeResourceInput({
        title: `${TEST_PREFIX}Past_Timed_${Date.now()}`,
        description: `${TEST_PREFIX} past timed resource offer`,
        type: 'offer',
        communityIds: [testCommunity.id],
        imageUrls: [],
      });

      const pastResource = await createResource(supabase, pastResourceData);
      if (!pastResource) throw new Error('Failed to create past resource offer');

      // Create timeslot that ended yesterday
      await createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: pastResource.id,
          startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          endTime: new Date(Date.now() - 23 * 60 * 60 * 1000), // Yesterday + 1 hour
          maxClaims: 5,
        }),
      );

      const currentResourceData = createFakeResourceInput({
        title: `${TEST_PREFIX}Current_Timed_${Date.now()}`,
        description: `${TEST_PREFIX} current timed resource offer`,
        type: 'offer',
        communityIds: [testCommunity.id],
        imageUrls: [],
      });

      const currentResource = await createResource(
        supabase,
        currentResourceData,
      );
      if (!currentResource)
        throw new Error('Failed to create current resource offer');

      // Create timeslot that is currently active
      await createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: currentResource.id,
          startTime: new Date(), // Now
          endTime: new Date(Date.now() + 60 * 60 * 1000), // Now + 1 hour
          maxClaims: 3,
        }),
      );

      // Fetch the feed
      const feed = await fetchFeed(supabase);

      // Filter resource offers from the feed using type-safe function
      const resourceItems = getResourceItems(feed.items);

      // Verify that past resource offer is NOT in the feed
      expect(
        resourceItems.some((item) => item.data.id === pastResource.id),
      ).toBe(false);

      // Verify that current resource offer IS in the feed
      expect(
        resourceItems.some((item) => item.data.id === currentResource.id),
      ).toBe(true);

      // All returned resource offers should have timeslots with start dates in the future or current
      resourceItems.forEach((item) => {
        if (item.data.type === 'offer') {
          // Check if this resource has timeslots that are current or future
          // This is a simplified check - in reality the feed logic would filter based on timeslots
          const isRelevant = item.data.id === currentResource.id;
          expect(isRelevant || item.data.id !== pastResource.id).toBe(true);
        }
      });
    });

    it('shows currently active resource offers', async () => {
      // Sign in as testUser
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create a currently active resource offer (started 30 minutes ago, ends in 30 minutes)
      const activeResourceData = createFakeResourceInput({
        title: `${TEST_PREFIX}Active_Timed_${Date.now()}`,
        description: `${TEST_PREFIX} active timed resource offer`,
        type: 'offer',
        communityIds: [testCommunity.id],
        imageUrls: [],
      });

      const activeResource = await createResource(
        supabase,
        activeResourceData,
      );
      if (!activeResource)
        throw new Error('Failed to create active resource offer');

      // Create timeslot that is currently active
      await createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: activeResource.id,
          startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          endTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
          maxClaims: 4,
        }),
      );

      // Create a completed resource offer (ended 30 minutes ago)
      const completedResourceData = createFakeResourceInput({
        title: `${TEST_PREFIX}Completed_Timed_${Date.now()}`,
        description: `${TEST_PREFIX} completed timed resource offer`,
        type: 'offer',
        communityIds: [testCommunity.id],
        imageUrls: [],
      });

      const completedResource = await createResource(supabase, completedResourceData);
      if (!completedResource) throw new Error('Failed to create completed resource offer');

      // Create timeslot that ended 30 minutes ago
      await createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: completedResource.id,
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          endTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          maxClaims: 2,
        }),
      );

      // Fetch the feed
      const feed = await fetchFeed(supabase);

      // Filter resource offers from the feed using type-safe function
      const resourceItems = getResourceItems(feed.items);

      // Verify that active resource offer IS in the feed
      expect(
        resourceItems.some((item) => item.data.id === activeResource.id),
      ).toBe(true);

      // Verify that completed resource offer is NOT in the feed
      expect(
        resourceItems.some((item) => item.data.id === completedResource.id),
      ).toBe(false);

      // Find the active resource offer in the feed and verify its properties
      const activeItem = resourceItems.find(
        (item) => item.data.id === activeResource.id,
      );
      if (activeItem) {
        expect(activeItem.data.type).toBe('offer');
      }
    });

    it('shows future resource offers', async () => {
      // Sign in as testUser
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create a resource offer that starts in 1 hour (future)
      const futureResourceData = createFakeResourceInput({
        title: `${TEST_PREFIX}Future_${Date.now()}`,
        description: `${TEST_PREFIX} future resource offer`,
        type: 'offer',
        communityIds: [testCommunity.id],
        imageUrls: [],
      });

      const futureResource = await createResource(supabase, futureResourceData);
      if (!futureResource)
        throw new Error('Failed to create future resource offer');

      // Create timeslot that starts in 1 hour
      await createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: futureResource.id,
          startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
          endTime: new Date(Date.now() + 120 * 60 * 1000), // 2 hours from now
          maxClaims: 6,
        }),
      );

      // Create a resource offer that ended 1 hour ago (should be filtered out)
      const pastResourceData = createFakeResourceInput({
        title: `${TEST_PREFIX}Past_Ended_${Date.now()}`,
        description: `${TEST_PREFIX} past resource offer that ended`,
        type: 'offer',
        communityIds: [testCommunity.id],
        imageUrls: [],
      });

      const pastResource = await createResource(
        supabase,
        pastResourceData,
      );
      if (!pastResource)
        throw new Error('Failed to create past resource offer');

      // Create timeslot that ended 1 hour ago
      await createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: pastResource.id,
          startTime: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
          endTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          maxClaims: 3,
        }),
      );

      // Fetch the feed
      const feed = await fetchFeed(supabase);

      // Filter resource offers from the feed using type-safe function
      const resourceItems = getResourceItems(feed.items);

      // Verify that future resource offer IS in the feed
      expect(
        resourceItems.some((item) => item.data.id === futureResource.id),
      ).toBe(true);

      // Verify that past resource offer is NOT in the feed
      expect(
        resourceItems.some((item) => item.data.id === pastResource.id),
      ).toBe(false);

      // Find the future resource offer in the feed and verify its properties
      const futureItem = resourceItems.find(
        (item) => item.data.id === futureResource.id,
      );
      if (futureItem) {
        expect(futureItem.data.type).toBe('offer');
      }
    });
  });
});
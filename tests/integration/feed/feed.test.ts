import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  createTestShoutout,
} from '../helpers/test-data';
import { createResourceTimeslot } from '@/features/resources/api';
import { createFakeResourceTimeslotInput } from '@/features/resources/__fakes__';
import { cleanupAllTestData } from '../helpers/cleanup';
import { fetchFeed } from '@/features/feed/api';
import { signIn } from '@/features/auth/api';
import { joinCommunity, leaveCommunity } from '@/features/communities/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';
import type { Resource } from '@/features/resources/types';
import type { Shoutout } from '@/features/shoutouts/types';

describe('Feed API - Integration Tests', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: User;
  let testUser2: User;
  let testCommunity1: Community;
  let testCommunity2: Community;
  let testResource1: Resource;
  let testResource1a: Resource;
  let testResource2: Resource;
  let testShoutout1: Shoutout;
  let testShoutout1a: Shoutout;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test users
    testUser = await createTestUser(supabase);

    // Create test communities
    testCommunity1 = await createTestCommunity(supabase);
    testCommunity2 = await createTestCommunity(supabase);

    // Create resources in both communities with available timeslots
    testResource1 = await createTestResource(
      supabase,
      testCommunity1.id,
      'offer',
      'event',
    );
    // Add timeslot to testResource1
    await createResourceTimeslot(
      supabase,
      createFakeResourceTimeslotInput({
        resourceId: testResource1.id,
        startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        endTime: new Date(Date.now() + 120 * 60 * 1000), // 2 hours from now
        maxClaims: 5,
      }),
    );
    testResource1a = await createTestResource(
      supabase,
      testCommunity1.id,
      'offer',
      'event',
    );

    // Add timeslot to testResource1a
    await createResourceTimeslot(
      supabase,
      createFakeResourceTimeslotInput({
        resourceId: testResource1a.id,
        startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        endTime: new Date(Date.now() + 120 * 60 * 1000), // 2 hours from now
        maxClaims: 5,
      }),
    );

    testResource2 = await createTestResource(
      supabase,
      testCommunity2.id,
      'offer',
      'event',
    );
    // Add timeslot to testResource2
    await createResourceTimeslot(
      supabase,
      createFakeResourceTimeslotInput({
        resourceId: testResource2.id,
        startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        endTime: new Date(Date.now() + 120 * 60 * 1000), // 2 hours from now
        maxClaims: 3,
      }),
    );

    testUser2 = await createTestUser(supabase);

    // Join communities so testUser2 can create shoutouts
    await joinCommunity(supabase, testCommunity1.id);

    // Create shoutouts for the resources (testUser2 thanking testUser)
    testShoutout1 = await createTestShoutout({
      supabase,
      receiverId: testUser.id,
      resourceId: testResource1.id,
      communityId: testCommunity1.id,
    });
    testShoutout1a = await createTestShoutout({
      supabase,
      receiverId: testUser.id,
      resourceId: testResource1a.id,
      communityId: testCommunity1.id,
    });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('fetchFeed', () => {
    it('fetches feed for user with multiple communities', async () => {
      const feed = await fetchFeed(supabase);

      expect(feed).toBeTruthy();
      expect(feed.items).toBeTruthy();
      expect(Array.isArray(feed.items)).toBe(true);
      expect(feed.items.length).toBeGreaterThan(0);

      // Verify feed contains resources, gatherings, and shoutouts from user's communities
      const resourceItems = feed.items.filter(
        (item) => item.type === 'resource',
      );
      const shoutoutItems = feed.items.filter(
        (item) => item.type === 'shoutout',
      );

      expect(resourceItems.length).toBeGreaterThan(0);
      expect(shoutoutItems.length).toBeGreaterThan(0);

      // Verify our test resources are included
      expect(resourceItems.some((item) => item.id === testResource1.id)).toBe(
        true,
      );
      expect(resourceItems.some((item) => item.id === testResource2.id)).toBe(
        false,
      );

      // Verify our test shoutouts are included
      expect(shoutoutItems.some((item) => item.id === testShoutout1.id)).toBe(
        true,
      );
      expect(shoutoutItems.some((item) => item.id === testShoutout1a.id)).toBe(
        true,
      );
    });

    it('filters content based on community membership', async () => {
      // testUser2 should not be a member at this point, so join community1
      await joinCommunity(supabase, testCommunity2.id);

      try {
        const feed = await fetchFeed(supabase);

        expect(feed).toBeTruthy();
        expect(feed.items).toBeTruthy();
        expect(Array.isArray(feed.items)).toBe(true);
        expect(feed.items.length).toBeGreaterThan(0);

        // Verify feed only contains content from community1
        const resourceItems = feed.items.filter(
          (item) => item.type === 'resource',
        );
        const shoutoutItems = feed.items.filter(
          (item) => item.type === 'shoutout',
        );

        // Should contain content from community1
        expect(resourceItems.some((item) => item.id === testResource1.id)).toBe(
          true,
        );
        expect(shoutoutItems.some((item) => item.id === testShoutout1.id)).toBe(
          true,
        );
        expect(
          shoutoutItems.some((item) => item.id === testShoutout1a.id),
        ).toBe(true);

        // Should contain content from community2 also
        expect(resourceItems.some((item) => item.id === testResource2.id)).toBe(
          true,
        );
      } finally {
        // Clean up: leave the community
        await leaveCommunity(supabase, testCommunity1.id);
      }
    });

    it('throws for unauthenticated user', async () => {
      // Sign out to test unauthenticated access
      await supabase.auth.signOut();

      // Should throw for unauthenticated user
      await expect(fetchFeed(supabase)).rejects.toThrowError();

      // Sign back in for cleanup
      await signIn(supabase, testUser2.email, 'TestPass123!');
    });
  });
});

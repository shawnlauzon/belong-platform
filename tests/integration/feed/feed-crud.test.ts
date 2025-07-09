import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  createTestEvent,
  createTestShoutout,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import { fetchFeed } from '@/features/feed/api';
import { signIn } from '@/features/auth/api';
import { joinCommunity } from '@/features/communities/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { UserDetail } from '@/features/users/types';
import type { CommunityInfo } from '@/features/communities/types';
import type { ResourceInfo } from '@/features/resources/types';
import type { EventInfo } from '@/features/events/types';

describe('Feed API - Integration Tests', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: UserDetail;
  let testUser2: UserDetail;
  let testCommunity1: CommunityInfo;
  let testCommunity2: CommunityInfo;
  let testResource1: ResourceInfo;
  let testResource2: ResourceInfo;
  let testEvent1: EventInfo;
  let testEvent2: EventInfo;
  let testShoutout1: any;
  let testShoutout2: any;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test users
    testUser = await createTestUser(supabase);
    testUser2 = await createTestUser(supabase);

    // Sign in as testUser to create communities
    await signIn(supabase, testUser.email, 'TestPass123!');

    // Create test communities
    testCommunity1 = await createTestCommunity(supabase);
    testCommunity2 = await createTestCommunity(supabase);

    // Create resources in both communities
    testResource1 = await createTestResource(
      supabase,
      testUser.id,
      testCommunity1.id,
    );
    testResource2 = await createTestResource(
      supabase,
      testUser.id,
      testCommunity2.id,
    );

    // Create events in both communities
    testEvent1 = await createTestEvent(
      supabase,
      testUser.id,
      testCommunity1.id,
    );
    testEvent2 = await createTestEvent(
      supabase,
      testUser.id,
      testCommunity2.id,
    );

    // Create shoutouts for the resources (testUser2 thanking testUser)
    testShoutout1 = await createTestShoutout(
      supabase,
      testUser2.id,
      testUser.id,
      testResource1.id,
    );
    testShoutout2 = await createTestShoutout(
      supabase,
      testUser2.id,
      testUser.id,
      testResource2.id,
    );
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('fetchFeed', () => {
    it('fetches feed for user with multiple communities', async () => {
      // Sign in as testUser (who created the communities and is automatically a member)
      await signIn(supabase, testUser.email, 'TestPass123!');

      const feed = await fetchFeed(supabase);

      expect(feed).toBeTruthy();
      expect(feed.items).toBeTruthy();
      expect(Array.isArray(feed.items)).toBe(true);
      expect(feed.items.length).toBeGreaterThan(0);

      // Verify feed contains resources, events, and shoutouts from user's communities
      const resourceItems = feed.items.filter((item) => item.type === 'resource');
      const eventItems = feed.items.filter((item) => item.type === 'event');
      const shoutoutItems = feed.items.filter((item) => item.type === 'shoutout');

      expect(resourceItems.length).toBeGreaterThan(0);
      expect(eventItems.length).toBeGreaterThan(0);
      expect(shoutoutItems.length).toBeGreaterThan(0);

      // Verify our test resources are included
      expect(resourceItems.some((item) => item.data.id === testResource1.id)).toBe(true);
      expect(resourceItems.some((item) => item.data.id === testResource2.id)).toBe(true);

      // Verify our test events are included
      expect(eventItems.some((item) => item.data.id === testEvent1.id)).toBe(true);
      expect(eventItems.some((item) => item.data.id === testEvent2.id)).toBe(true);

      // Verify our test shoutouts are included
      expect(shoutoutItems.some((item) => item.data.id === testShoutout1.id)).toBe(true);
      expect(shoutoutItems.some((item) => item.data.id === testShoutout2.id)).toBe(true);

      // Verify items are sorted by createdAt (newest first)
      for (let i = 0; i < feed.items.length - 1; i++) {
        const currentDate = new Date(feed.items[i].data.createdAt);
        const nextDate = new Date(feed.items[i + 1].data.createdAt);
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
      }
    });

    it('returns empty feed for user with no communities', async () => {
      // Sign in as testUser2 (who is not a member of any communities)
      await signIn(supabase, testUser2.email, 'TestPass123!');

      const feed = await fetchFeed(supabase);

      expect(feed).toBeTruthy();
      expect(feed.items).toBeTruthy();
      expect(Array.isArray(feed.items)).toBe(true);
      expect(feed.items.length).toBe(0);
      expect(feed.hasMore).toBe(false);
    });

    it('filters content based on community membership', async () => {
      // Sign in as testUser2 and join only community1
      await signIn(supabase, testUser2.email, 'TestPass123!');
      
      // Try to join community, ignore error if already a member
      try {
        await joinCommunity(supabase, testCommunity1.id);
      } catch (error: any) {
        // Ignore duplicate key error (already a member)
        if (error.code !== '23505') {
          throw error;
        }
      }

      const feed = await fetchFeed(supabase);

      expect(feed).toBeTruthy();
      expect(feed.items).toBeTruthy();
      expect(Array.isArray(feed.items)).toBe(true);
      expect(feed.items.length).toBeGreaterThan(0);

      // Verify feed only contains content from community1
      const resourceItems = feed.items.filter((item) => item.type === 'resource');
      const eventItems = feed.items.filter((item) => item.type === 'event');
      const shoutoutItems = feed.items.filter((item) => item.type === 'shoutout');

      // Should contain content from community1
      expect(resourceItems.some((item) => item.data.id === testResource1.id)).toBe(true);
      expect(eventItems.some((item) => item.data.id === testEvent1.id)).toBe(true);
      expect(shoutoutItems.some((item) => item.data.id === testShoutout1.id)).toBe(true);

      // Should NOT contain content from community2 (not a member)
      expect(resourceItems.some((item) => item.data.id === testResource2.id)).toBe(false);
      expect(eventItems.some((item) => item.data.id === testEvent2.id)).toBe(false);
      expect(shoutoutItems.some((item) => item.data.id === testShoutout2.id)).toBe(false);

      // Verify all items are from community1
      feed.items.forEach((item) => {
        expect(item.data.communityId).toBe(testCommunity1.id);
      });
    });

    it('returns empty feed for unauthenticated user', async () => {
      // Sign out to test unauthenticated access
      await supabase.auth.signOut();

      // Should return empty feed for unauthenticated user (graceful degradation)
      const feed = await fetchFeed(supabase);
      expect(feed).toBeTruthy();
      expect(feed.items).toBeTruthy();
      expect(Array.isArray(feed.items)).toBe(true);
      expect(feed.items.length).toBe(0);
      expect(feed.hasMore).toBe(false);

      // Sign back in for cleanup
      await signIn(supabase, testUser.email, 'TestPass123!');
    });

    it('aggregates content from multiple communities correctly', async () => {
      // Sign in as testUser2 and join both communities
      await signIn(supabase, testUser2.email, 'TestPass123!');
      
      // Try to join communities, ignore errors if already a member
      try {
        await joinCommunity(supabase, testCommunity1.id);
      } catch (error: any) {
        // Ignore duplicate key error (already a member)
        if (error.code !== '23505') {
          throw error;
        }
      }
      
      try {
        await joinCommunity(supabase, testCommunity2.id);
      } catch (error: any) {
        // Ignore duplicate key error (already a member)
        if (error.code !== '23505') {
          throw error;
        }
      }

      const feed = await fetchFeed(supabase);

      expect(feed).toBeTruthy();
      expect(feed.items).toBeTruthy();
      expect(Array.isArray(feed.items)).toBe(true);
      expect(feed.items.length).toBeGreaterThan(0);

      // Verify feed contains content from both communities
      const resourceItems = feed.items.filter((item) => item.type === 'resource');
      const eventItems = feed.items.filter((item) => item.type === 'event');
      const shoutoutItems = feed.items.filter((item) => item.type === 'shoutout');

      // Should contain content from both communities
      expect(resourceItems.some((item) => item.data.id === testResource1.id)).toBe(true);
      expect(resourceItems.some((item) => item.data.id === testResource2.id)).toBe(true);
      expect(eventItems.some((item) => item.data.id === testEvent1.id)).toBe(true);
      expect(eventItems.some((item) => item.data.id === testEvent2.id)).toBe(true);
      expect(shoutoutItems.some((item) => item.data.id === testShoutout1.id)).toBe(true);
      expect(shoutoutItems.some((item) => item.data.id === testShoutout2.id)).toBe(true);

      // Verify community distribution
      const community1Items = feed.items.filter((item) => item.data.communityId === testCommunity1.id);
      const community2Items = feed.items.filter((item) => item.data.communityId === testCommunity2.id);

      expect(community1Items.length).toBeGreaterThan(0);
      expect(community2Items.length).toBeGreaterThan(0);
    });

    it('returns proper feed structure', async () => {
      // Sign in as testUser (who has communities)
      await signIn(supabase, testUser.email, 'TestPass123!');

      const feed = await fetchFeed(supabase);

      expect(feed).toBeTruthy();
      expect(feed).toHaveProperty('items');
      expect(feed).toHaveProperty('hasMore');
      expect(typeof feed.hasMore).toBe('boolean');

      // For MVP, hasMore should be false (no pagination)
      expect(feed.hasMore).toBe(false);

      // Verify item structure
      feed.items.forEach((item) => {
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('data');
        expect(['resource', 'event', 'shoutout']).toContain(item.type);
        expect(item.data).toHaveProperty('id');
        expect(item.data).toHaveProperty('communityId');
        expect(item.data).toHaveProperty('createdAt');
      });
    });
  });
});
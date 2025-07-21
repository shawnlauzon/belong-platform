import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  createTestShoutout,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import { fetchFeed } from '@/features/feed/api';
import { signIn, signOut } from '@/features/auth/api';
import { joinCommunity } from '@/features/communities/api';
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

    testResource1a = await createTestResource(
      supabase,
      testCommunity1.id,
      'request',
      'skills',
    );

    testResource2 = await createTestResource(
      supabase,
      testCommunity2.id,
      'offer',
      'event',
    );

    testUser2 = await createTestUser(supabase);

    // Only a member of testCommunity1
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

  describe('single community', () => {
    it('filters content based on community membership', async () => {
      const feed = await fetchFeed(supabase);

      expect(feed).toBeTruthy();
      expect(feed.items).toBeTruthy();
      expect(Array.isArray(feed.items)).toBe(true);
      expect(feed.items.length).toBeGreaterThan(0);

      expect(feed.items).toContainEqual({
        id: testResource1.id,
        type: 'event',
      });
      expect(feed.items).toContainEqual({
        id: testResource1a.id,
        type: 'resource',
      });
      expect(feed.items).not.toContainEqual({
        id: testResource2.id,
        type: 'event',
      });
      expect(feed.items).toContainEqual({
        id: testShoutout1.id,
        type: 'shoutout',
      });
      expect(feed.items).toContainEqual({
        id: testShoutout1a.id,
        type: 'shoutout',
      });
    });
  });

  describe('multiple communities', () => {
    beforeAll(async () => {
      await signIn(supabase, testUser.email, 'TestPass123!');
    });
    afterAll(async () => {
      await signIn(supabase, testUser2.email, 'TestPass123!');
    });
    it('fetches feed for user with multiple communities', async () => {
      const feed = await fetchFeed(supabase);

      expect(feed).toBeTruthy();
      expect(feed.items).toBeTruthy();
      expect(Array.isArray(feed.items)).toBe(true);
      console.log('items', feed.items);

      expect(feed.items).toContainEqual({
        id: testResource1.id,
        type: 'event',
      });
      expect(feed.items).toContainEqual({
        id: testResource1a.id,
        type: 'resource',
      });
      expect(feed.items).toContainEqual({
        id: testResource2.id,
        type: 'event',
      });
      expect(feed.items).toContainEqual({
        id: testShoutout1.id,
        type: 'shoutout',
      });
      expect(feed.items).toContainEqual({
        id: testShoutout1a.id,
        type: 'shoutout',
      });
    });
  });

  describe('unauthenticated', () => {
    beforeAll(async () => {
      await signOut(supabase);
    });
    afterAll(async () => {
      await signIn(supabase, testUser.email, 'TestPass123!');
    });
    it('throws for unauthenticated user', async () => {
      // Should throw for unauthenticated user
      await expect(fetchFeed(supabase)).rejects.toThrowError();
    });
  });
});

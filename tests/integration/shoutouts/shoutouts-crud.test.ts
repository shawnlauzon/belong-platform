import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  TEST_PREFIX,
  createTestShoutout,
} from '../helpers/test-data';
import { cleanupAllTestData, cleanupShoutout } from '../helpers/cleanup';
import {
  createShoutout,
  fetchShoutouts,
  fetchShoutoutById,
  updateShoutout,
  deleteShoutout,
} from '@/features/shoutouts/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { Account } from '@/features/auth/types';
import type { Shoutout } from '@/features/shoutouts/types';
import type { Community } from '@/features/communities/types';
import type { Resource } from '@/features/resources/types';
import { joinCommunity } from '@/features/communities/api';

describe('Shoutouts API - CRUD Operations', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: Account;
  let testUser2: Account;
  let testCommunity: Community;
  let testResource: Resource;
  let testResource2: Resource;
  let readOnlyShoutout1: Shoutout;
  let readOnlyShoutout2: Shoutout;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create shared resources for tests
    testUser = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);
    testResource = await createTestResource(supabase, testCommunity.id);

    testUser2 = await createTestUser(supabase);
    await joinCommunity(supabase, testUser2.id, testCommunity.id);
    testResource2 = await createTestResource(supabase, testCommunity.id);

    // signed in as testUser2
    readOnlyShoutout1 = await createTestShoutout(supabase, {
      receiverId: testUser.id,
      resourceId: testResource.id,
      communityId: testCommunity.id,
      message: `${TEST_PREFIX}Thank you for sharing this resource!`,
    });

    await signIn(supabase, testUser.email, 'TestPass123!');

    readOnlyShoutout2 = await createTestShoutout(supabase, {
      receiverId: testUser2.id,
      resourceId: testResource2.id,
      communityId: testCommunity.id,
      message: `${TEST_PREFIX}Thank you for sharing this resource!`,
    });

    // Sign back in as testUser2 for other tests
    await signIn(supabase, testUser2.email, 'TestPass123!');
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('createShoutout', () => {
    let createdShoutout: Shoutout | null = null;

    afterEach(async () => {
      if (createdShoutout) {
        await cleanupShoutout(createdShoutout.id);
        createdShoutout = null;
      }
    });

    it('creates shoutout with valid data', async () => {
      const shoutoutInput = {
        resourceId: testResource.id,
        message: `${TEST_PREFIX}Thank you for sharing this resource!`,
      };

      createdShoutout = await createShoutout(supabase, testUser2.id, shoutoutInput);

      expect(createdShoutout).toBeTruthy();
      expect(createdShoutout).toMatchObject({
        id: expect.any(String),
        resourceId: testResource.id,
        message: shoutoutInput.message,
        senderId: testUser2.id,
        receiverId: testUser.id,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      // Verify database record exists
      const { data: dbRecord } = await supabase
        .from('shoutouts')
        .select('*')
        .eq('id', createdShoutout.id)
        .single();

      expect(dbRecord).toBeTruthy();
      expect(dbRecord).toMatchObject({
        id: expect.any(String),
        resource_id: testResource.id,
        community_id: testCommunity.id,
        sender_id: testUser2.id,
        receiver_id: testUser.id,
        message: shoutoutInput.message,
      });
    });

    it('cannot send shoutout to yourself', async () => {
      const shoutoutInput = {
        resourceId: testResource2.id, // testResource2 is owned by testUser2
        message: `${TEST_PREFIX}Thank you for sharing this resource!`,
      };

      try {
        createdShoutout = await createShoutout(supabase, testUser2.id, shoutoutInput);
        expect.fail('Should not have created shoutout');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    it('should not allow shoutout about a resource you own', async () => {
      const shoutoutInput = {
        resourceId: testResource2.id, // testResource2 is owned by testUser2 (signed in user)
        message: `${TEST_PREFIX}Thank you for sharing this resource!`,
      };

      try {
        createdShoutout = await createShoutout(supabase, testUser2.id, shoutoutInput);
        expect.fail('Should not have created shoutout');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });
  });

  describe('fetchShoutouts', () => {
    it('fetches all shoutouts', async () => {
      const shoutouts = await fetchShoutouts(supabase);

      expect(Array.isArray(shoutouts)).toBe(true);
      expect(shoutouts.length).toBeGreaterThan(0);

      // Verify our test shoutouts are included
      expect(shoutouts.some((s) => s.id === readOnlyShoutout1.id)).toBe(true);
      expect(shoutouts.some((s) => s.id === readOnlyShoutout2.id)).toBe(true);

      // Verify shoutouts are sorted by created_at (newest first)
      for (let i = 0; i < shoutouts.length - 1; i++) {
        expect(shoutouts[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          shoutouts[i + 1].createdAt.getTime(),
        );
      }
    });

    it('filters by receiverId', async () => {
      const filtered = await fetchShoutouts(supabase, {
        receiverId: testUser.id,
      });

      // Should get shoutouts received by testUser
      expect(filtered.length).toBeGreaterThanOrEqual(1);
      expect(filtered.some((s) => s.id === readOnlyShoutout1.id)).toBe(true);
      expect(filtered.every((s) => s.receiverId === testUser.id)).toBe(true);
    });

    it('returns shoutout by id', async () => {
      const fetchedShoutout = await fetchShoutoutById(
        supabase,
        readOnlyShoutout1.id,
      );

      expect(fetchedShoutout).toMatchObject({
        id: readOnlyShoutout1.id,
        message: readOnlyShoutout1.message,
        senderId: testUser2.id,
        receiverId: testUser.id,
        resourceId: testResource.id,
        communityId: testCommunity.id,
      });
    });

    it('returns null for non-existent id', async () => {
      const result = await fetchShoutoutById(
        supabase,
        '00000000-0000-0000-0000-000000000000',
      );
      expect(result).toBeNull();
    });
  });

  describe('updateShoutout', () => {
    let createdShoutout: Shoutout;
    beforeEach(async () => {
      createdShoutout = await createTestShoutout(supabase, {
        receiverId: testUser.id,
        resourceId: testResource.id,
        communityId: testCommunity.id,
        message: `${TEST_PREFIX}Thank you for sharing this resource!`,
      });
    });

    afterEach(async () => {
      await cleanupShoutout(createdShoutout.id);
    });

    it('updates shoutout message', async () => {
      const newMessage = `${TEST_PREFIX}Updated_Message`;
      const updatedShoutout = await updateShoutout(supabase, testUser2.id, {
        id: createdShoutout.id,
        message: newMessage,
      });

      expect(updatedShoutout).toBeTruthy();
      expect(updatedShoutout).toMatchObject({
        id: createdShoutout.id,
        message: newMessage,
        senderId: testUser2.id,
        receiverId: testUser.id,
        resourceId: testResource.id,
        communityId: testCommunity.id,
      });

      // Verify database record has been updated with all expected fields
      const { data: dbRecord } = await supabase
        .from('shoutouts')
        .select('*')
        .eq('id', createdShoutout.id)
        .single();

      expect(dbRecord).toMatchObject({
        id: createdShoutout.id,
        message: newMessage,
        sender_id: testUser2.id,
        receiver_id: testUser.id,
        resource_id: testResource.id,
        community_id: testCommunity.id,
      });
      expect(dbRecord!.updated_at).toBeTruthy();
    });

    it('deletes shoutout successfully', async () => {
      // Delete the shoutout
      await deleteShoutout(supabase, testUser2.id, createdShoutout.id);

      // Verify shoutout is deleted
      const { data, error } = await supabase
        .from('shoutouts')
        .select()
        .eq('id', createdShoutout.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('returns null for non-existent shoutout deletion', async () => {
      const result = await deleteShoutout(
        supabase,
        testUser2.id,
        '00000000-0000-0000-0000-000000000000',
      );
      expect(result).toBeNull();
    });
  });
});

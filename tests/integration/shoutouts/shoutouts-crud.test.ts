import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  TEST_PREFIX,
  createTestResourceShoutout,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
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
import type { Shoutout } from '@/features/shoutouts/types';
import type { Community } from '@/features/communities/types';
import type { Resource } from '@/features/resources/types';

describe('Shoutouts API - CRUD Operations', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: User;
  let testUser2: User;
  let testCommunity: Community;
  let testResource: Resource;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create shared resources for tests
    testUser = await createTestUser(supabase);
    testUser2 = await createTestUser(supabase);

    // Sign in as testUser to ensure proper context
    await signIn(supabase, testUser.email, 'TestPass123!');

    testCommunity = await createTestCommunity(supabase);
    testResource = await createTestResource(supabase, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('createShoutout', () => {
    it('creates shoutout with valid data', async () => {
      const shoutoutInput = {
        resourceId: testResource.id,
        message: `${TEST_PREFIX}Thank you for sharing this resource!`,
        toUserId: testUser2.id,
        communityId: testCommunity.id,
      };

      const shoutout = await createShoutout(supabase, shoutoutInput);

      expect(shoutout).toBeTruthy();
      expect(shoutout.id).toBeTruthy();
      expect(shoutout.message).toBe(shoutoutInput.message);
      expect(shoutout.fromUserId).toBe(testUser.id);
      expect(shoutout.toUserId).toBe(testUser2.id);
      expect(shoutout.resource?.id).toBe(testResource.id);
      expect(shoutout.createdAt).toBeTruthy();
      expect(shoutout.updatedAt).toBeTruthy();

      // Verify database record exists
      const { data: dbRecord } = await supabase
        .from('shoutouts')
        .select('*')
        .eq('id', shoutout.id)
        .single();

      expect(dbRecord).toBeTruthy();
      expect(dbRecord!.message).toBe(shoutoutInput.message);
      expect(dbRecord!.from_user_id).toBe(testUser.id);
      expect(dbRecord!.to_user_id).toBe(testUser2.id);
      expect(dbRecord!.resource_id).toBe(testResource.id);

      // Cleanup
      await supabase.from('shoutouts').delete().eq('id', shoutout.id);
    });

    it('cannot send shoutout to yourself', async () => {
      const shoutoutInput = {
        toUserId: testUser.id, // Same user as signed in user
        communityId: testCommunity.id,
        resourceId: testResource.id,
        message: `${TEST_PREFIX}Thank you for sharing this resource!`,
      };

      await expect(createShoutout(supabase, shoutoutInput)).rejects.toThrow();
    });

    it('TODO: should not allow shoutout about a resource you own (currently allows)', async () => {
      const shoutoutInput = {
        toUserId: testUser2.id,
        communityId: testCommunity.id,
        resourceId: testResource.id, // testResource is owned by testUser (signed in user)
        message: `${TEST_PREFIX}Thank you for sharing this resource!`,
      };

      // Current behavior: allows users to send shoutouts about their own resources
      // This business rule is not implemented but was requested to be enforced
      const result = await createShoutout(supabase, shoutoutInput);
      expect(result).toBeTruthy();
      expect(result.id).toBeTruthy();

      // Cleanup
      await supabase.from('shoutouts').delete().eq('id', result.id);
    });
  });

  describe('fetchShoutouts', () => {
    let readOnlyShoutout1: Shoutout;
    let readOnlyShoutout2: Shoutout;

    beforeAll(async () => {
      // Create test shoutouts for read-only operations
      // Sign in as testUser to create first shoutout
      await signIn(supabase, testUser.email, 'TestPass123!');
      readOnlyShoutout1 = await createTestResourceShoutout({
        supabase,
        toUserId: testUser2.id,
        resourceId: testResource.id,
        communityId: testCommunity.id,
      });

      // Sign in as testUser2 to create second shoutout
      await signIn(supabase, testUser2.email, 'TestPass123!');
      readOnlyShoutout2 = await createTestResourceShoutout({
        supabase,
        toUserId: testUser.id,
        resourceId: testResource.id,
        communityId: testCommunity.id,
      });

      // Sign back in as testUser for other tests
      await signIn(supabase, testUser.email, 'TestPass123!');
    });

    afterAll(async () => {
      // Cleanup read-only shoutouts
      if (readOnlyShoutout1) {
        await supabase
          .from('shoutouts')
          .delete()
          .eq('id', readOnlyShoutout1.id);
      }
      if (readOnlyShoutout2) {
        await supabase
          .from('shoutouts')
          .delete()
          .eq('id', readOnlyShoutout2.id);
      }
    });

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

    it('filters by sentBy', async () => {
      const filtered = await fetchShoutouts(supabase, {
        sentBy: testUser.id,
      });

      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.some((s) => s.id === readOnlyShoutout1.id)).toBe(true);
      expect(filtered.every((s) => s.fromUserId === testUser.id)).toBe(true);
    });

    it('filters by receivedBy', async () => {
      const filtered = await fetchShoutouts(supabase, {
        receivedBy: testUser2.id,
      });

      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.some((s) => s.id === readOnlyShoutout1.id)).toBe(true);
      expect(filtered.every((s) => s.toUserId === testUser2.id)).toBe(true);
    });

    it('filters by resourceId', async () => {
      const filtered = await fetchShoutouts(supabase, {
        resourceId: testResource.id,
      });

      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.some((s) => s.id === readOnlyShoutout1.id)).toBe(true);
      expect(filtered.some((s) => s.id === readOnlyShoutout2.id)).toBe(true);
      expect(filtered.every((s) => s.resource?.id === testResource.id)).toBe(
        true,
      );
    });
  });

  describe('fetchShoutoutById', () => {
    it('returns shoutout by id', async () => {
      // Create a shoutout to fetch
      const createdShoutout = await createShoutout(supabase, {
        toUserId: testUser2.id,
        resourceId: testResource.id,
        communityId: testCommunity.id,
        message: `${TEST_PREFIX}Fetch_By_Id_Test`,
      });

      try {
        const fetchedShoutout = await fetchShoutoutById(
          supabase,
          createdShoutout.id,
        );

        expect(fetchedShoutout).toMatchObject({
          id: createdShoutout.id,
          message: createdShoutout.message,
          fromUserId: testUser.id,
          fromUser: expect.objectContaining({
            id: testUser.id,
          }),
          toUserId: testUser2.id,
          toUser: expect.objectContaining({
            id: testUser2.id,
          }),
          resourceId: testResource.id,
          communityId: testCommunity.id,
        });
      } finally {
        // Cleanup
        await supabase.from('shoutouts').delete().eq('id', createdShoutout.id);
      }
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
    it('updates shoutout message', async () => {
      // Create a shoutout to update
      const createdShoutout = await createTestResourceShoutout({
        supabase,
        toUserId: testUser2.id,
        resourceId: testResource.id,
        communityId: testCommunity.id,
      });

      try {
        const newMessage = `${TEST_PREFIX}Updated_Message`;
        const updatedShoutout = await updateShoutout(
          supabase,
          createdShoutout.id,
          { message: newMessage },
        );

        expect(updatedShoutout).toBeTruthy();
        expect(updatedShoutout!.id).toBe(createdShoutout.id);
        expect(updatedShoutout!.message).toBe(newMessage);
        expect(updatedShoutout!.fromUserId).toBe(testUser.id);
        expect(updatedShoutout!.toUserId).toBe(testUser2.id);
        expect(updatedShoutout!.resource?.id).toBe(testResource.id);

        // Verify database record has been updated with all expected fields
        const { data: dbRecord } = await supabase
          .from('shoutouts')
          .select('*')
          .eq('id', createdShoutout.id)
          .single();

        expect(dbRecord).toMatchObject({
          id: createdShoutout.id,
          message: newMessage,
          from_user_id: testUser.id,
          to_user_id: testUser2.id,
          resource_id: testResource.id,
          community_id: testCommunity.id,
        });
        expect(dbRecord!.updated_at).toBeTruthy();
      } finally {
        // Cleanup
        await supabase.from('shoutouts').delete().eq('id', createdShoutout.id);
      }
    });
  });

  describe('deleteShoutout', () => {
    it('deletes shoutout successfully', async () => {
      // Create a shoutout to delete
      const createdShoutout = await createTestResourceShoutout({
        supabase,
        toUserId: testUser2.id,
        resourceId: testResource.id,
        communityId: testCommunity.id,
      });

      // Delete the shoutout
      await deleteShoutout(supabase, createdShoutout.id);

      // Verify shoutout is deleted
      const { data, error } = await supabase
        .from('shoutouts')
        .select()
        .eq('id', createdShoutout.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('handles non-existent shoutout deletion gracefully', async () => {
      // Should not throw error for non-existent shoutout
      await expect(
        deleteShoutout(supabase, '00000000-0000-0000-0000-000000000000'),
      ).resolves.not.toThrow();
    });
  });
});

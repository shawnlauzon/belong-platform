import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createShoutoutsService } from '@/features/shoutouts/services/shoutouts.service';
import { signIn } from '@/features/auth/api';
import { createFakeDbShoutout } from '@/features/shoutouts/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { UserDetail } from '@/features/users/types';
import type { CommunityInfo } from '@/features/communities/types';
import type { ResourceInfo } from '@/features/resources/types';
import type { ShoutoutData } from '@/features/shoutouts/types';

describe('Shoutouts Service - CRUD Operations', () => {
  let supabase: SupabaseClient<Database>;
  let shoutoutsService: ReturnType<typeof createShoutoutsService>;
  let testUser: UserDetail;
  let testUser2: UserDetail;
  let testCommunity: CommunityInfo;
  let testResource: ResourceInfo;

  beforeAll(async () => {
    supabase = createTestClient();
    shoutoutsService = createShoutoutsService(supabase);

    // Create shared resources for tests
    testUser = await createTestUser(supabase);
    testUser2 = await createTestUser(supabase);

    // Sign in as testUser to ensure proper context
    await signIn(supabase, testUser.email, 'TestPass123!');

    testCommunity = await createTestCommunity(supabase);
    testResource = await createTestResource(
      supabase,
      testUser.id,
      testCommunity.id,
    );
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('createShoutout', () => {
    it('creates shoutout with valid data', async () => {
      const shoutoutData: ShoutoutData = {
        fromUserId: testUser.id,
        toUserId: testUser2.id,
        resourceId: testResource.id,
        message: `${TEST_PREFIX}Thank you for sharing this resource!`,
        impactDescription: 'This helped me learn something new',
      };

      const shoutout = await shoutoutsService.createShoutout(shoutoutData);

      expect(shoutout).toBeTruthy();
      expect(shoutout.id).toBeTruthy();
      expect(shoutout.message).toBe(shoutoutData.message);
      expect(shoutout.fromUser.id).toBe(testUser.id);
      expect(shoutout.toUser.id).toBe(testUser2.id);
      expect(shoutout.resource.id).toBe(testResource.id);
      expect(shoutout.impactDescription).toBe(shoutoutData.impactDescription);
      expect(shoutout.createdAt).toBeTruthy();
      expect(shoutout.updatedAt).toBeTruthy();

      // Verify database record exists
      const { data: dbRecord } = await supabase
        .from('shoutouts')
        .select('*')
        .eq('id', shoutout.id)
        .single();

      expect(dbRecord).toBeTruthy();
      expect(dbRecord!.message).toBe(shoutoutData.message);
      expect(dbRecord!.from_user_id).toBe(testUser.id);
      expect(dbRecord!.to_user_id).toBe(testUser2.id);
      expect(dbRecord!.resource_id).toBe(testResource.id);

      // Cleanup
      await supabase.from('shoutouts').delete().eq('id', shoutout.id);
    });

    it('validates business rule: cannot thank yourself', async () => {
      const shoutoutData: ShoutoutData = {
        fromUserId: testUser.id,
        toUserId: testUser.id, // Same user
        resourceId: testResource.id,
        message: `${TEST_PREFIX}Thank you for sharing this resource!`,
      };

      await expect(
        shoutoutsService.createShoutout(shoutoutData),
      ).rejects.toThrow('Cannot thank yourself');
    });
  });

  describe('fetchShoutouts', () => {
    let readOnlyShoutout1: any;
    let readOnlyShoutout2: any;

    beforeAll(async () => {
      // Create test shoutouts for read-only operations
      // Sign in as testUser to create first shoutout
      await signIn(supabase, testUser.email, 'TestPass123!');
      readOnlyShoutout1 = await shoutoutsService.createShoutout({
        fromUserId: testUser.id,
        toUserId: testUser2.id,
        resourceId: testResource.id,
        message: `${TEST_PREFIX}ReadOnly_Shoutout_1`,
      });

      // Sign in as testUser2 to create second shoutout
      await signIn(supabase, testUser2.email, 'TestPass123!');
      readOnlyShoutout2 = await shoutoutsService.createShoutout({
        fromUserId: testUser2.id,
        toUserId: testUser.id,
        resourceId: testResource.id,
        message: `${TEST_PREFIX}ReadOnly_Shoutout_2`,
      });

      // Sign back in as testUser for other tests
      await signIn(supabase, testUser.email, 'TestPass123!');
    });

    afterAll(async () => {
      // Cleanup read-only shoutouts
      if (readOnlyShoutout1) {
        await supabase.from('shoutouts').delete().eq('id', readOnlyShoutout1.id);
      }
      if (readOnlyShoutout2) {
        await supabase.from('shoutouts').delete().eq('id', readOnlyShoutout2.id);
      }
    });

    it('fetches all shoutouts', async () => {
      const shoutouts = await shoutoutsService.fetchShoutouts();

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
      const filtered = await shoutoutsService.fetchShoutouts({
        sentBy: testUser.id,
      });

      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.some((s) => s.id === readOnlyShoutout1.id)).toBe(true);
      expect(filtered.every((s) => s.fromUserId === testUser.id)).toBe(true);
    });

    it('filters by receivedBy', async () => {
      const filtered = await shoutoutsService.fetchShoutouts({
        receivedBy: testUser2.id,
      });

      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.some((s) => s.id === readOnlyShoutout1.id)).toBe(true);
      expect(filtered.every((s) => s.toUserId === testUser2.id)).toBe(true);
    });

    it('filters by resourceId', async () => {
      const filtered = await shoutoutsService.fetchShoutouts({
        resourceId: testResource.id,
      });

      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.some((s) => s.id === readOnlyShoutout1.id)).toBe(true);
      expect(filtered.some((s) => s.id === readOnlyShoutout2.id)).toBe(true);
      expect(filtered.every((s) => s.resourceId === testResource.id)).toBe(true);
    });
  });

  describe('fetchShoutoutById', () => {
    it('returns shoutout by id', async () => {
      // Create a shoutout to fetch
      const createdShoutout = await shoutoutsService.createShoutout({
        fromUserId: testUser.id,
        toUserId: testUser2.id,
        resourceId: testResource.id,
        message: `${TEST_PREFIX}Fetch_By_Id_Test`,
      });

      try {
        const fetchedShoutout = await shoutoutsService.fetchShoutoutById(
          createdShoutout.id,
        );

        expect(fetchedShoutout).toBeTruthy();
        expect(fetchedShoutout!.id).toBe(createdShoutout.id);
        expect(fetchedShoutout!.message).toBe(createdShoutout.message);
        expect(fetchedShoutout!.fromUser.id).toBe(testUser.id);
        expect(fetchedShoutout!.toUser.id).toBe(testUser2.id);
        expect(fetchedShoutout!.resource.id).toBe(testResource.id);
      } finally {
        // Cleanup
        await supabase.from('shoutouts').delete().eq('id', createdShoutout.id);
      }
    });

    it('returns null for non-existent id', async () => {
      const result = await shoutoutsService.fetchShoutoutById(
        '00000000-0000-0000-0000-000000000000',
      );
      expect(result).toBeNull();
    });
  });

  describe('updateShoutout', () => {
    it('updates shoutout message', async () => {
      // Create a shoutout to update
      const createdShoutout = await shoutoutsService.createShoutout({
        fromUserId: testUser.id,
        toUserId: testUser2.id,
        resourceId: testResource.id,
        message: `${TEST_PREFIX}Original_Message`,
      });

      try {
        const newMessage = `${TEST_PREFIX}Updated_Message`;
        const updatedShoutout = await shoutoutsService.updateShoutout(
          createdShoutout.id,
          { message: newMessage },
        );

        expect(updatedShoutout).toBeTruthy();
        expect(updatedShoutout.id).toBe(createdShoutout.id);
        expect(updatedShoutout.message).toBe(newMessage);
        expect(updatedShoutout.fromUser.id).toBe(testUser.id);
        expect(updatedShoutout.toUser.id).toBe(testUser2.id);
        expect(updatedShoutout.resource.id).toBe(testResource.id);
      } finally {
        // Cleanup
        await supabase.from('shoutouts').delete().eq('id', createdShoutout.id);
      }
    });

    it('validates business rule: cannot change sender', async () => {
      // Create a shoutout to update
      const createdShoutout = await shoutoutsService.createShoutout({
        fromUserId: testUser.id,
        toUserId: testUser2.id,
        resourceId: testResource.id,
        message: `${TEST_PREFIX}Sender_Change_Test`,
      });

      try {
        await expect(
          shoutoutsService.updateShoutout(createdShoutout.id, {
            fromUserId: testUser2.id, // Try to change sender
          }),
        ).rejects.toThrow('Cannot change the sender of shoutout');
      } finally {
        // Cleanup
        await supabase.from('shoutouts').delete().eq('id', createdShoutout.id);
      }
    });
  });

  describe('deleteShoutout', () => {
    it('deletes shoutout successfully', async () => {
      // Create a shoutout to delete
      const createdShoutout = await shoutoutsService.createShoutout({
        fromUserId: testUser.id,
        toUserId: testUser2.id,
        resourceId: testResource.id,
        message: `${TEST_PREFIX}Delete_Test`,
      });

      // Delete the shoutout
      await shoutoutsService.deleteShoutout(createdShoutout.id);

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
        shoutoutsService.deleteShoutout('00000000-0000-0000-0000-000000000000'),
      ).resolves.not.toThrow();
    });
  });
});
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import * as resourcesApi from '@/features/resources/api';
import { signIn } from '@/features/auth/api';
import { ResourceTimeslot } from '@/features/resources/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import { createFakeResourceTimeslotInput } from '@/features/resources/__fakes__';
import { Community } from '@/features/communities/types';
import { Resource } from '@/features/resources/types';

describe('Resources API - Resource Timeslots Operations', () => {
  let supabase: SupabaseClient<Database>;
  let resourceOwner: User;
  let testCommunity: Community;
  let testResource: Resource;
  let createdTimeslots: ResourceTimeslot[] = [];

  beforeAll(async () => {
    supabase = createTestClient();

    // Create resource owner and setup
    resourceOwner = await createTestUser(supabase);
    await signIn(supabase, resourceOwner.email, 'TestPass123!');

    testCommunity = await createTestCommunity(supabase);
    testResource = await createTestResource(supabase, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  afterEach(async () => {
    // Clean up created timeslots
    for (const timeslot of createdTimeslots) {
      try {
        await resourcesApi.deleteResourceTimeslot(supabase, timeslot.id);
      } catch (error) {
        // Ignore errors in cleanup
      }
    }
    createdTimeslots = [];
  });

  describe('createResourceTimeslot', () => {
    it('creates timeslot with valid data', async () => {
      const startTime = new Date(Date.now() + 86400000); // Tomorrow
      const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later
      
      const timeslotInput = createFakeResourceTimeslotInput({
        resourceId: testResource.id,
        startTime,
        endTime,
        maxClaims: 5,
      });

      const timeslot = await resourcesApi.createResourceTimeslot(
        supabase,
        timeslotInput,
      );

      createdTimeslots.push(timeslot);

      expect(timeslot).toBeTruthy();
      expect(timeslot.id).toBeDefined();
      expect(timeslot.resourceId).toBe(testResource.id);
      expect(timeslot.startTime).toEqual(startTime);
      expect(timeslot.endTime).toEqual(endTime);
      expect(timeslot.maxClaims).toBe(5);
      expect(timeslot.createdAt).toBeInstanceOf(Date);
      expect(timeslot.updatedAt).toBeInstanceOf(Date);

      // Verify database record exists
      const { data: dbRecord } = await supabase
        .from('resource_timeslots')
        .select('*')
        .eq('id', timeslot.id)
        .single();

      expect(dbRecord).toBeTruthy();
      expect(dbRecord!.resource_id).toBe(testResource.id);
      expect(dbRecord!.max_claims).toBe(5);
    });

    it('fails with invalid time range (start after end)', async () => {
      const startTime = new Date(Date.now() + 86400000); // Tomorrow
      const endTime = new Date(startTime.getTime() - 3600000); // 1 hour before start

      const timeslotInput = createFakeResourceTimeslotInput({
        resourceId: testResource.id,
        startTime,
        endTime,
        maxClaims: 5,
      });

      await expect(
        resourcesApi.createResourceTimeslot(supabase, timeslotInput),
      ).rejects.toThrow('Start time must be before end time');
    });

    it('fails with zero max claims', async () => {
      const startTime = new Date(Date.now() + 86400000); // Tomorrow
      const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later

      const timeslotInput = createFakeResourceTimeslotInput({
        resourceId: testResource.id,
        startTime,
        endTime,
        maxClaims: 0,
      });

      await expect(
        resourcesApi.createResourceTimeslot(supabase, timeslotInput),
      ).rejects.toThrow('Max claims must be positive');
    });

    it('fails with negative max claims', async () => {
      const startTime = new Date(Date.now() + 86400000); // Tomorrow
      const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later

      const timeslotInput = createFakeResourceTimeslotInput({
        resourceId: testResource.id,
        startTime,
        endTime,
        maxClaims: -1,
      });

      await expect(
        resourcesApi.createResourceTimeslot(supabase, timeslotInput),
      ).rejects.toThrow('Max claims must be positive');
    });

    it('fails with invalid resource id', async () => {
      const startTime = new Date(Date.now() + 86400000); // Tomorrow
      const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later

      const timeslotInput = createFakeResourceTimeslotInput({
        resourceId: 'invalid-resource-id',
        startTime,
        endTime,
        maxClaims: 5,
      });

      await expect(
        resourcesApi.createResourceTimeslot(supabase, timeslotInput),
      ).rejects.toThrow();
    });
  });

  describe('fetchResourceTimeslots', () => {
    it('fetches timeslots for a resource', async () => {
      // Create multiple timeslots for the resource
      const startTime1 = new Date(Date.now() + 86400000); // Tomorrow
      const endTime1 = new Date(startTime1.getTime() + 3600000); // 1 hour later
      
      const startTime2 = new Date(Date.now() + 172800000); // Day after tomorrow
      const endTime2 = new Date(startTime2.getTime() + 3600000); // 1 hour later

      const timeslot1 = await resourcesApi.createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: testResource.id,
          startTime: startTime1,
          endTime: endTime1,
          maxClaims: 3,
        }),
      );

      const timeslot2 = await resourcesApi.createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: testResource.id,
          startTime: startTime2,
          endTime: endTime2,
          maxClaims: 5,
        }),
      );

      createdTimeslots.push(timeslot1, timeslot2);

      const timeslots = await resourcesApi.fetchResourceTimeslots(supabase, testResource.id);

      expect(timeslots).toHaveLength(2);
      expect(timeslots.some(t => t.id === timeslot1.id)).toBe(true);
      expect(timeslots.some(t => t.id === timeslot2.id)).toBe(true);
      expect(timeslots.every(t => t.resourceId === testResource.id)).toBe(true);
    });

    it('returns empty array for resource with no timeslots', async () => {
      const timeslots = await resourcesApi.fetchResourceTimeslots(supabase, testResource.id);

      expect(timeslots).toHaveLength(0);
    });

    it('returns empty array for non-existent resource', async () => {
      const timeslots = await resourcesApi.fetchResourceTimeslots(supabase, '00000000-0000-0000-0000-000000000000');

      expect(timeslots).toHaveLength(0);
    });
  });

  describe('updateResourceTimeslot', () => {
    it('updates timeslot fields', async () => {
      const startTime = new Date(Date.now() + 86400000); // Tomorrow
      const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later
      
      const timeslot = await resourcesApi.createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: testResource.id,
          startTime,
          endTime,
          maxClaims: 5,
        }),
      );

      createdTimeslots.push(timeslot);

      const newStartTime = new Date(Date.now() + 172800000); // Day after tomorrow
      const newEndTime = new Date(newStartTime.getTime() + 7200000); // 2 hours later

      const updatedTimeslot = await resourcesApi.updateResourceTimeslot(
        supabase,
        timeslot.id,
        {
          startTime: newStartTime,
          endTime: newEndTime,
          maxClaims: 10,
        },
      );

      expect(updatedTimeslot).toBeTruthy();
      expect(updatedTimeslot?.id).toBe(timeslot.id);
      expect(updatedTimeslot?.startTime).toEqual(newStartTime);
      expect(updatedTimeslot?.endTime).toEqual(newEndTime);
      expect(updatedTimeslot?.maxClaims).toBe(10);
      expect(updatedTimeslot?.resourceId).toBe(testResource.id);

      // Verify database record has been updated
      const { data: dbRecord } = await supabase
        .from('resource_timeslots')
        .select('*')
        .eq('id', timeslot.id)
        .single();

      expect(dbRecord).toBeTruthy();
      expect(dbRecord!.max_claims).toBe(10);
    });

    it('fails with invalid timeslot id', async () => {
      await expect(
        resourcesApi.updateResourceTimeslot(supabase, 'invalid-timeslot-id', {
          maxClaims: 10,
        }),
      ).rejects.toThrow();
    });
  });

  describe('deleteResourceTimeslot', () => {
    it('deletes timeslot successfully', async () => {
      const startTime = new Date(Date.now() + 86400000); // Tomorrow
      const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later
      
      const timeslot = await resourcesApi.createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: testResource.id,
          startTime,
          endTime,
          maxClaims: 5,
        }),
      );

      const timeslotId = timeslot.id;

      // Verify timeslot exists before deletion
      const beforeDelete = await resourcesApi.fetchResourceTimeslots(supabase, testResource.id);
      expect(beforeDelete.some(t => t.id === timeslotId)).toBe(true);

      // Delete timeslot
      await resourcesApi.deleteResourceTimeslot(supabase, timeslotId);

      // Verify timeslot is deleted
      const afterDelete = await resourcesApi.fetchResourceTimeslots(supabase, testResource.id);
      expect(afterDelete.some(t => t.id === timeslotId)).toBe(false);

      // Verify database record is deleted
      const { data } = await supabase
        .from('resource_timeslots')
        .select()
        .eq('id', timeslotId);

      expect(data).toHaveLength(0);
    });

    it('does not throw error when deleting non-existent timeslot', async () => {
      await expect(
        resourcesApi.deleteResourceTimeslot(supabase, '00000000-0000-0000-0000-000000000000'),
      ).resolves.not.toThrow();
    });
  });

  describe('timeslot workflow verification', () => {
    it('verifies create, update, and delete workflow', async () => {
      const startTime = new Date(Date.now() + 86400000); // Tomorrow
      const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later
      
      // Create timeslot
      const timeslot = await resourcesApi.createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: testResource.id,
          startTime,
          endTime,
          maxClaims: 5,
        }),
      );

      expect(timeslot.maxClaims).toBe(5);

      // Update timeslot
      const updatedTimeslot = await resourcesApi.updateResourceTimeslot(
        supabase,
        timeslot.id,
        {
          maxClaims: 10,
        },
      );

      expect(updatedTimeslot?.maxClaims).toBe(10);

      // Delete timeslot
      await resourcesApi.deleteResourceTimeslot(supabase, timeslot.id);

      // Verify deletion
      const timeslots = await resourcesApi.fetchResourceTimeslots(supabase, testResource.id);
      expect(timeslots.some(t => t.id === timeslot.id)).toBe(false);
    });
  });
});
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import * as resourcesApi from '@/features/resources/api';
import { signIn } from '@/features/auth/api';
import { ResourceTimeslot } from '@/features/resources/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { Account } from '@/features/auth/types';
import { createFakeResourceTimeslotInput } from '@/features/resources/__fakes__';
import { Community } from '@/features/communities/types';
import { Resource } from '@/features/resources/types';
import { joinCommunity } from '@/features/communities/api';

describe('Resources API - Resource Timeslots Operations', () => {
  let supabase: SupabaseClient<Database>;
  let resourceOwner: Account;
  let testCommunity: Community;
  let testResource: Resource;

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

  describe('Timeslot creation', () => {
    const createdTimeslots: ResourceTimeslot[] = [];

    afterEach(async () => {
      for (const timeslot of createdTimeslots) {
        await resourcesApi.deleteResourceTimeslot(supabase, timeslot.id);
      }
    });

    it('creates timeslot with valid data', async () => {
      const startTime = new Date(Date.now() + 86400000); // Tomorrow
      const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later

      const timeslotInput = createFakeResourceTimeslotInput({
        resourceId: testResource.id,
        startTime,
        endTime,
      });

      const timeslot = await resourcesApi.createResourceTimeslot(
        supabase,
        timeslotInput,
      );

      createdTimeslots.push(timeslot);

      expect(timeslot).toBeTruthy();
      expect(timeslot).toMatchObject({
        resourceId: testResource.id,
        startTime,
        endTime,
        status: 'active',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      // Verify database record exists
      const { data: dbRecord } = await supabase
        .from('resource_timeslots')
        .select('*')
        .eq('id', timeslot.id)
        .single();

      expect(dbRecord).toBeTruthy();
      expect(dbRecord!.resource_id).toBe(testResource.id);
    });

    it('fails with invalid time range (start after end)', async () => {
      const startTime = new Date(Date.now() + 86400000); // Tomorrow
      const endTime = new Date(startTime.getTime() - 3600000); // 1 hour before start

      const timeslotInput = createFakeResourceTimeslotInput({
        resourceId: testResource.id,
        startTime,
        endTime,
      });

      await expect(
        resourcesApi.createResourceTimeslot(supabase, timeslotInput),
      ).rejects.toThrow();
    });

    it('fails with invalid resource id', async () => {
      const startTime = new Date(Date.now() + 86400000); // Tomorrow
      const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later

      const timeslotInput = createFakeResourceTimeslotInput({
        resourceId: 'invalid-resource-id',
        startTime,
        endTime,
      });

      await expect(
        resourcesApi.createResourceTimeslot(supabase, timeslotInput),
      ).rejects.toThrow();
    });

    it('allows community member to create timeslot for resource they do not own', async () => {
      // Create a new user who is not the resource owner
      const communityMember = await createTestUser(supabase);

      // Sign in as the community member
      await signIn(supabase, communityMember.email, 'TestPass123!');

      // Join the community that contains the resource
      await joinCommunity(supabase, testCommunity.id);

      // Create timeslot for resource owned by someone else
      const startTime = new Date(Date.now() + 86400000); // Tomorrow
      const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later

      const timeslotInput = createFakeResourceTimeslotInput({
        resourceId: testResource.id,
        startTime,
        endTime,
      });

      const timeslot = await resourcesApi.createResourceTimeslot(
        supabase,
        timeslotInput,
      );

      createdTimeslots.push(timeslot);

      expect(timeslot).toBeTruthy();
      expect(timeslot).toMatchObject({
        resourceId: testResource.id,
        startTime,
        endTime,
        status: 'active',
      });

      // Verify database record exists
      const { data: dbRecord } = await supabase
        .from('resource_timeslots')
        .select('*')
        .eq('id', timeslot.id)
        .single();

      expect(dbRecord).toBeTruthy();
      expect(dbRecord!.resource_id).toBe(testResource.id);

      // Verify the resource is owned by someone else (not the community member)
      const { data: resource } = await supabase
        .from('resources')
        .select('owner_id')
        .eq('id', testResource.id)
        .single();

      expect(resource!.owner_id).not.toBe(communityMember.id);
      expect(resource!.owner_id).toBe(resourceOwner.id);

      // Sign back in as resource owner for cleanup
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
    });
  });

  describe('Resource Timeslot operations', () => {
    let timeslot: ResourceTimeslot;

    beforeAll(async () => {
      // Create multiple timeslots for the resource
      const startTime1 = new Date(Date.now() + 86400000); // Tomorrow
      const endTime1 = new Date(startTime1.getTime() + 3600000); // 1 hour later

      timeslot = await resourcesApi.createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: testResource.id,
          startTime: startTime1,
          endTime: endTime1,
        }),
      );
    });

    afterAll(async () => {
      if (timeslot) {
        await resourcesApi.deleteResourceTimeslot(supabase, timeslot.id);
      }
    });

    it('fetches timeslots for a resource', async () => {
      const timeslots = await resourcesApi.fetchResourceTimeslots(supabase, {
        resourceId: testResource.id,
      });
      console.log('TIMESLOTS', timeslots);

      expect(timeslots).toHaveLength(1);
      expect(timeslots[0]).toMatchObject({
        id: timeslot.id,
        resourceId: testResource.id,
        startTime: timeslot.startTime,
        endTime: timeslot.endTime,
        status: 'active',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('returns empty array for resource with no timeslots', async () => {
      const anotherResource = await createTestResource(
        supabase,
        testCommunity.id,
      );

      const timeslots = await resourcesApi.fetchResourceTimeslots(supabase, {
        resourceId: anotherResource.id,
      });

      expect(timeslots).toHaveLength(0);
    });

    it('returns empty array for non-existent resource', async () => {
      const timeslots = await resourcesApi.fetchResourceTimeslots(supabase, {
        resourceId: '00000000-0000-0000-0000-000000000000',
      });

      expect(timeslots).toHaveLength(0);
    });

    it('updates timeslot fields', async () => {
      const newStartTime = new Date(Date.now() + 172800000); // Day after tomorrow
      const newEndTime = new Date(newStartTime.getTime() + 7200000); // 2 hours later

      const updatedTimeslot = await resourcesApi.updateResourceTimeslot(
        supabase,
        {
          id: timeslot.id,
          startTime: newStartTime,
          endTime: newEndTime,
        },
      );

      expect(updatedTimeslot).toBeTruthy();
      expect(updatedTimeslot).toMatchObject({
        id: timeslot.id,
        resourceId: testResource.id,
        startTime: newStartTime,
        endTime: newEndTime,
        status: 'active',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      // Verify database record has been updated
      const { data: dbRecord } = await supabase
        .from('resource_timeslots')
        .select('*')
        .eq('id', timeslot.id)
        .single();

      expect(dbRecord).toBeTruthy();
    });

    it('fails with invalid timeslot id', async () => {
      await expect(
        resourcesApi.updateResourceTimeslot(supabase, {
          id: 'invalid-timeslot-id',
          startTime: new Date(),
        }),
      ).rejects.toThrow();
    });

    it('deletes timeslot successfully', async () => {
      const startTime = new Date(Date.now() + 86400000); // Tomorrow
      const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later

      const timeslot = await resourcesApi.createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: testResource.id,
          startTime,
          endTime,
        }),
      );

      const timeslotId = timeslot.id;

      // Verify timeslot exists before deletion
      const beforeDelete = await resourcesApi.fetchResourceTimeslots(supabase, {
        resourceId: testResource.id,
      });
      expect(beforeDelete.some((t) => t.id === timeslotId)).toBe(true);

      // Delete timeslot
      await resourcesApi.deleteResourceTimeslot(supabase, timeslotId);

      // Verify timeslot is deleted
      const afterDelete = await resourcesApi.fetchResourceTimeslots(supabase, {
        resourceId: testResource.id,
      });
      expect(afterDelete.some((t) => t.id === timeslotId)).toBe(false);

      // Verify database record is deleted
      const { data } = await supabase
        .from('resource_timeslots')
        .select()
        .eq('id', timeslotId);

      expect(data).toHaveLength(0);
    });

    it('does not throw error when deleting non-existent timeslot', async () => {
      await expect(
        resourcesApi.deleteResourceTimeslot(
          supabase,
          '00000000-0000-0000-0000-000000000000',
        ),
      ).resolves.not.toThrow();
    });
  });
});

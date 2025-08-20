import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData, cleanupResource } from '../helpers/cleanup';
import * as resourcesApi from '@/features/resources/api';
import { signIn } from '@/features/auth/api';
import {
  createFakeResourceInput,
  createFakeResourceTimeslotInput,
} from '@/features/resources/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';
import type { Resource, ResourceTimeslot } from '@/features/resources/types';
import { parsePostGisPoint } from '@/shared';
import { joinCommunity } from '@/features/communities/api';

describe('Resource Offers API - CRUD Operations', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: User;
  let testCommunity: Community;
  let readOnlyOffer1: Resource;
  let readOnlyOffer2: Resource;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create shared resources for read-only tests
    testUser = await createTestUser(supabase);

    testCommunity = await createTestCommunity(supabase);
    readOnlyOffer1 = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );
    readOnlyOffer2 = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('createResource', () => {
    let resource: Resource | null = null;
    let timeslot: ResourceTimeslot | null = null;

    afterEach(async () => {
      if (resource) {
        await cleanupResource(resource);
        resource = null;
      }
      if (timeslot) {
        await resourcesApi.deleteResourceTimeslot(supabase, timeslot.id);
        timeslot = null;
      }
    });

    it('creates resource offer with valid data', async () => {
      const data = createFakeResourceInput({
        title: `${TEST_PREFIX}Create_Test_${Date.now()}`,
        type: 'offer',
        communityIds: [testCommunity.id],
        imageUrls: undefined, // Don't generate random images
      });

      resource = await resourcesApi.createResource(supabase, data);

      expect(resource).toBeTruthy();
      expect(resource!.id).toBeTruthy();
      expect(resource!.title).toBe(data.title);
      expect(resource!.type).toBe('offer');
      expect(resource!.ownerId).toBe(testUser.id);
      expect(resource!.communityIds).toEqual([testCommunity.id]);

      // Verify database record exists with all expected fields
      const { data: dbRecord } = await supabase
        .from('resources')
        .select('*')
        .eq('id', resource!.id)
        .single();

      expect(dbRecord).toMatchObject({
        id: resource!.id,
        title: data.title,
        description: data.description,
        type: 'offer',
        owner_id: testUser.id,
        location_name: data.locationName,
      });

      expect(parsePostGisPoint(dbRecord!.coordinates)).toEqual(
        data.coordinates,
      );
      expect(dbRecord!.created_at).toBeTruthy();
      expect(dbRecord!.updated_at).toBeTruthy();

      // Verify resource_communities join table
      const { data: resourceCommunities } = await supabase
        .from('resource_communities')
        .select('*')
        .eq('resource_id', resource!.id);

      expect(resourceCommunities).toHaveLength(1);
      expect(resourceCommunities![0].community_id).toBe(testCommunity.id);
    });

    it('creates resource offer with timeslots', async () => {
      const data = createFakeResourceInput({
        title: `${TEST_PREFIX}Timeslot_Test_${Date.now()}`,
        type: 'offer',
        communityIds: [testCommunity.id],
        imageUrls: undefined,
      });

      resource = await resourcesApi.createResource(supabase, data);

      // Create a timeslot for this resource offer
      const timeslotData = createFakeResourceTimeslotInput({
        resourceId: resource!.id,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
      });

      timeslot = await resourcesApi.createResourceTimeslot(
        supabase,
        timeslotData,
      );

      expect(timeslot).toBeTruthy();
      expect(timeslot!.resourceId).toBe(resource!.id);

      // Verify timeslot database record exists
      const { data: timeslotRecord } = await supabase
        .from('resource_timeslots')
        .select('*')
        .eq('id', timeslot!.id)
        .single();

      expect(timeslotRecord).toBeTruthy();
      expect(timeslotRecord!.resource_id).toBe(resource!.id);
    });
  });

  describe('fetchResources', () => {
    it('fetches all resource offers', async () => {
      const resources = await resourcesApi.fetchResources(supabase, {
        type: 'offer',
      });

      expect(Array.isArray(resources)).toBe(true);
      expect(resources.some((r) => r.id === readOnlyOffer1.id)).toBe(true);
      expect(resources.some((r) => r.id === readOnlyOffer2.id)).toBe(true);
      expect(resources.every((r) => r.type === 'offer')).toBe(true);
    });

    it('filters by title', async () => {
      const uniqueTitle = `${TEST_PREFIX}UniqueFilter_${Date.now()}`;
      let filteredResource;

      try {
        filteredResource = await resourcesApi.createResource(
          supabase,
          createFakeResourceInput({
            title: uniqueTitle,
            type: 'offer',
            communityIds: [testCommunity.id],
            imageUrls: undefined,
          }),
        );

        const filtered = await resourcesApi.fetchResources(supabase, {
          type: 'offer',
          searchTerm: 'UniqueFilter',
        });

        expect(filtered.some((r) => r.title === uniqueTitle)).toBe(true);
      } finally {
        await cleanupResource(filteredResource);
      }
    });

    it('filters by ownerId', async () => {
      const filtered = await resourcesApi.fetchResources(supabase, {
        type: 'offer',
        ownerId: testUser.id,
      });

      expect(filtered.length).toBeGreaterThanOrEqual(2);
      expect(filtered.every((r) => r.ownerId === testUser.id)).toBe(true);
      expect(filtered.every((r) => r.type === 'offer')).toBe(true);
    });

    it('filters by communityIds', async () => {
      const filtered = await resourcesApi.fetchResources(supabase, {
        type: 'offer',
        communityIds: [testCommunity.id],
      });

      expect(filtered.length).toBeGreaterThanOrEqual(2);
      expect(
        filtered.every((r) => r.communityIds.includes(testCommunity.id)),
      ).toBe(true);
      expect(filtered.every((r) => r.type === 'offer')).toBe(true);
    });
  });

  describe('fetchResourceById', () => {
    it('returns resource offer by id', async () => {
      const fetched = await resourcesApi.fetchResourceById(
        supabase,
        readOnlyOffer1.id,
      );

      expect(fetched).toBeTruthy();
      expect(fetched!.id).toBe(readOnlyOffer1.id);
      expect(fetched!.title).toBe(readOnlyOffer1.title);
      expect(fetched!.type).toBe('offer');
    });

    it('returns null for non-existent id', async () => {
      // Use a valid UUID format that doesn't exist
      const result = await resourcesApi.fetchResourceById(
        supabase,
        '00000000-0000-0000-0000-000000000000',
      );
      expect(result).toBeNull();
    });
  });

  describe('updateResource', () => {
    let resource: Resource;

    beforeEach(async () => {
      resource = await createTestResource(supabase, testCommunity.id, 'offer');
    });
    afterEach(async () => {
      await cleanupResource(resource);
    });

    it('updates resource offer fields', async () => {
      // Create own resource to modify

      const newTitle = `${TEST_PREFIX}Updated_${Date.now()}`;
      const newDescription = 'Updated description for test';
      const newLocation = 'Updated Location';

      const updated = await resourcesApi.updateResource(supabase, {
        id: resource.id,
        title: newTitle,
        description: newDescription,
        locationName: newLocation,
      });

      expect(updated!.title).toBe(newTitle);
      expect(updated!.description).toBe(newDescription);
      expect(updated!.locationName).toBe(newLocation);
      expect(updated!.id).toBe(resource.id);
      expect(updated!.type).toBe('offer');

      // Verify database record has been updated with all expected fields
      const { data: dbRecord } = await supabase
        .from('resources')
        .select('*')
        .eq('id', resource.id)
        .single();

      expect(dbRecord).toMatchObject({
        id: resource.id,
        title: newTitle,
        description: newDescription,
        location_name: newLocation,
        owner_id: resource.ownerId,
      });
    });

    it('preserves unchanged fields', async () => {
      const newTitle = `${TEST_PREFIX}PartialUpdate_${Date.now()}`;
      const originalDescription = resource.description;
      const originalLocation = resource.locationName;

      const updated = await resourcesApi.updateResource(supabase, {
        id: resource.id,
        title: newTitle,
      });

      expect(updated!.title).toBe(newTitle);
      expect(updated!.description).toBe(originalDescription);
      expect(updated!.locationName).toBe(originalLocation);
      expect(updated!.ownerId).toBe(resource.ownerId);

      // Verify database record preserves unchanged fields
      const { data: dbRecord } = await supabase
        .from('resources')
        .select('*')
        .eq('id', resource.id)
        .single();

      expect(dbRecord).toMatchObject({
        id: resource.id,
        title: newTitle,
        description: originalDescription,
        location_name: originalLocation,
        owner_id: resource.ownerId,
      });
    });

    it('handles coordinates updates', async () => {
      const newCoordinates = { lat: 40.7128, lng: -74.006 }; // NYC

      const updated = await resourcesApi.updateResource(supabase, {
        id: resource.id,
        coordinates: newCoordinates,
      });

      expect(updated!.coordinates).toEqual(newCoordinates);

      // Verify database record
      const { data: dbRecord } = await supabase
        .from('resources')
        .select('*')
        .eq('id', resource.id)
        .single();

      expect(parsePostGisPoint(dbRecord!.coordinates)).toEqual(newCoordinates);
    });

    it('deletes resource offer', async () => {
      await resourcesApi.deleteResource(supabase, resource.id);

      // Verify database record
      const { data: dbRecord } = await supabase
        .from('resources')
        .select('*')
        .eq('id', resource.id)
        .single();

      expect(dbRecord).toBeNull();
    });

    it('deletes resource offer and cascades to timeslots', async () => {
      // Create a timeslot for this resource
      const timeslot = await resourcesApi.createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: resource.id,
        }),
      );

      await resourcesApi.deleteResource(supabase, resource.id);

      // Verify database record
      const { data: dbRecord } = await supabase
        .from('resources')
        .select('*')
        .eq('id', resource.id)
        .single();

      expect(dbRecord).toBeNull();

      // Verify database record
      const { data: dbTimeslot } = await supabase
        .from('resource_timeslots')
        .select('*')
        .eq('id', timeslot.id)
        .single();

      expect(dbTimeslot).toBeNull();
    });

    it('deletes resource offer and cascades to timeslots and claims', async () => {
      // Create a timeslot for this resource
      const timeslot = await resourcesApi.createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: resource.id,
        }),
      );

      // Create another user to claim the resource
      await createTestUser(supabase);
      await joinCommunity(supabase, testCommunity.id);
      await resourcesApi.createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        status: 'pending',
      });

      // Sign back in as the provider to delete
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Delete resource
      await resourcesApi.deleteResource(supabase, resource.id);

      // Wait a bit for the delete to propagate
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify resource deleted
      const { data, error } = await supabase
        .from('resources')
        .select()
        .eq('id', resource.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      // Verify timeslots deleted
      const { data: timeslots } = await supabase
        .from('resource_timeslots')
        .select()
        .eq('resource_id', resource.id);

      expect(timeslots).toHaveLength(0);

      // Verify claims deleted
      const { data: claims } = await supabase
        .from('resource_claims')
        .select()
        .eq('resource_id', resource.id);

      expect(claims).toHaveLength(0);
    });
  });
});

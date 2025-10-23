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
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities/types';
import type { Resource } from '@/features/resources/types';
import { parsePostGisPoint } from '@/shared';
import { joinCommunity } from '@/features/communities/api';

describe('Resource API - CRUD Operations (Both Offers and Requests)', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: Account;
  let testCommunity: Community;
  let readOnlyOffer: Resource;
  let readOnlyRequest: Resource;
  let testCommunity2: Community;
  let readOnlyOffer2: Resource;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create shared resources for read-only tests
    testUser = await createTestUser(supabase);

    testCommunity = await createTestCommunity(supabase);
    readOnlyOffer = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );
    readOnlyRequest = await createTestResource(
      supabase,
      testCommunity.id,
      'request',
    );

    testCommunity2 = await createTestCommunity(supabase);
    readOnlyOffer2 = await createTestResource(
      supabase,
      testCommunity2.id,
      'offer',
    );
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('createResource', () => {
    let resource: Resource | null = null;

    afterEach(async () => {
      if (resource) {
        await cleanupResource(resource);
        resource = null;
      }
    });

    it('creates resource offer with valid data', async () => {
      const data = createFakeResourceInput({
        title: `${TEST_PREFIX}Create_Offer_${Date.now()}`,
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
      expect(resource!.communityIds).toContain(testCommunity.id);

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

    it('creates resource request with valid data', async () => {
      const data = createFakeResourceInput({
        title: `${TEST_PREFIX}Create_Request_${Date.now()}`,
        type: 'request',
        communityIds: [testCommunity.id],
        imageUrls: undefined, // Don't generate random images
      });

      resource = await resourcesApi.createResource(supabase, data);

      expect(resource).toBeTruthy();
      expect(resource!.id).toBeTruthy();
      expect(resource!.title).toBe(data.title);
      expect(resource!.type).toBe('request');
      expect(resource!.ownerId).toBe(testUser.id);
      expect(resource!.communityIds).toContain(testCommunity.id);

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
        type: 'request',
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
        title: `${TEST_PREFIX}Offer_Timeslot_Test_${Date.now()}`,
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

      const timeslot = await resourcesApi.createResourceTimeslot(
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

    it('creates resource request with timeslots', async () => {
      const data = createFakeResourceInput({
        title: `${TEST_PREFIX}Request_Timeslot_Test_${Date.now()}`,
        type: 'request',
        communityIds: [testCommunity.id],
        imageUrls: undefined,
      });

      resource = await resourcesApi.createResource(supabase, data);

      // Create a timeslot for this resource request
      const timeslotData = createFakeResourceTimeslotInput({
        resourceId: resource!.id,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
      });

      const timeslot = await resourcesApi.createResourceTimeslot(
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
    it('fetches all resources (both offers and requests)', async () => {
      const resources = await resourcesApi.fetchResources(supabase, {});

      expect(Array.isArray(resources)).toBe(true);
      expect(resources.some((r) => r.id === readOnlyOffer.id)).toBe(true);
      expect(resources.some((r) => r.id === readOnlyRequest.id)).toBe(true);
      expect(resources.some((r) => r.type === 'offer')).toBe(true);
      expect(resources.some((r) => r.type === 'request')).toBe(true);
    });

    it('fetches resources without type filtering', async () => {
      // FIXED: Type filtering was removed from ResourceFilter API
      const resources = await resourcesApi.fetchResources(supabase);

      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThanOrEqual(2);
      // Note: Both offers and requests will be returned since type filtering removed
    });

    it('filters by communityId', async () => {
      const filtered = await resourcesApi.fetchResources(supabase, {
        communityId: testCommunity.id,
      });

      expect(filtered).toContainEqual(
        expect.objectContaining({
          id: readOnlyOffer.id,
        }),
      );
      expect(filtered).toContainEqual(
        expect.objectContaining({
          id: readOnlyRequest.id,
        }),
      );
      expect(filtered).not.toContainEqual(
        expect.objectContaining({
          id: readOnlyOffer2.id,
        }),
      );
    });
  });

  describe('fetchResourceById', () => {
    it('returns resource offer by id', async () => {
      const fetched = await resourcesApi.fetchResourceById(
        supabase,
        readOnlyOffer.id,
      );

      expect(fetched).toBeTruthy();
      expect(fetched!.id).toBe(readOnlyOffer.id);
      expect(fetched!.title).toBe(readOnlyOffer.title);
      expect(fetched!.type).toBe('offer');
    });

    it('returns resource request by id', async () => {
      const fetched = await resourcesApi.fetchResourceById(
        supabase,
        readOnlyRequest.id,
      );

      expect(fetched).toBeTruthy();
      expect(fetched!.id).toBe(readOnlyRequest.id);
      expect(fetched!.title).toBe(readOnlyRequest.title);
      expect(fetched!.type).toBe('request');
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
    let offerResource: Resource;
    let requestResource: Resource;

    beforeEach(async () => {
      offerResource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );
      requestResource = await createTestResource(
        supabase,
        testCommunity.id,
        'request',
      );
    });

    afterEach(async () => {
      await cleanupResource(offerResource);
      await cleanupResource(requestResource);
    });

    it('updates resource offer fields', async () => {
      const newTitle = `${TEST_PREFIX}Updated_Offer_${Date.now()}`;
      const newDescription = 'Updated description for offer test';
      const newLocation = 'Updated Offer Location';

      const updated = await resourcesApi.updateResource(supabase, {
        id: offerResource.id,
        title: newTitle,
        description: newDescription,
        locationName: newLocation,
      });

      expect(updated!.title).toBe(newTitle);
      expect(updated!.description).toBe(newDescription);
      expect(updated!.locationName).toBe(newLocation);
      expect(updated!.id).toBe(offerResource.id);
      expect(updated!.type).toBe('offer');

      // Verify database record has been updated with all expected fields
      const { data: dbRecord } = await supabase
        .from('resources')
        .select('*')
        .eq('id', offerResource.id)
        .single();

      expect(dbRecord).toMatchObject({
        id: offerResource.id,
        title: newTitle,
        description: newDescription,
        location_name: newLocation,
        type: 'offer',
        owner_id: offerResource.ownerId,
      });
    });

    it('updates resource request fields', async () => {
      const newTitle = `${TEST_PREFIX}Updated_Request_${Date.now()}`;
      const newDescription = 'Updated description for request test';
      const newLocation = 'Updated Request Location';

      const updated = await resourcesApi.updateResource(supabase, {
        id: requestResource.id,
        title: newTitle,
        description: newDescription,
        locationName: newLocation,
      });

      expect(updated!.title).toBe(newTitle);
      expect(updated!.description).toBe(newDescription);
      expect(updated!.locationName).toBe(newLocation);
      expect(updated!.id).toBe(requestResource.id);
      expect(updated!.type).toBe('request');

      // Verify database record has been updated with all expected fields
      const { data: dbRecord } = await supabase
        .from('resources')
        .select('*')
        .eq('id', requestResource.id)
        .single();

      expect(dbRecord).toMatchObject({
        id: requestResource.id,
        title: newTitle,
        description: newDescription,
        location_name: newLocation,
        type: 'request',
        owner_id: requestResource.ownerId,
      });
    });

    it('preserves unchanged fields for offer', async () => {
      const newTitle = `${TEST_PREFIX}PartialUpdate_Offer_${Date.now()}`;
      const originalDescription = offerResource.description;
      const originalLocation = offerResource.locationName;

      const updated = await resourcesApi.updateResource(supabase, {
        id: offerResource.id,
        title: newTitle,
      });

      expect(updated!.title).toBe(newTitle);
      expect(updated!.description).toBe(originalDescription);
      expect(updated!.locationName).toBe(originalLocation);
      expect(updated!.ownerId).toBe(offerResource.ownerId);
      expect(updated!.type).toBe('offer');

      // Verify database record preserves unchanged fields
      const { data: dbRecord } = await supabase
        .from('resources')
        .select('*')
        .eq('id', offerResource.id)
        .single();

      expect(dbRecord).toMatchObject({
        id: offerResource.id,
        title: newTitle,
        description: originalDescription,
        location_name: originalLocation,
        type: 'offer',
        owner_id: offerResource.ownerId,
      });
    });

    it('preserves unchanged fields for request', async () => {
      const newTitle = `${TEST_PREFIX}PartialUpdate_Request_${Date.now()}`;
      const originalDescription = requestResource.description;
      const originalLocation = requestResource.locationName;

      const updated = await resourcesApi.updateResource(supabase, {
        id: requestResource.id,
        title: newTitle,
      });

      expect(updated!.title).toBe(newTitle);
      expect(updated!.description).toBe(originalDescription);
      expect(updated!.locationName).toBe(originalLocation);
      expect(updated!.ownerId).toBe(requestResource.ownerId);
      expect(updated!.type).toBe('request');

      // Verify database record preserves unchanged fields
      const { data: dbRecord } = await supabase
        .from('resources')
        .select('*')
        .eq('id', requestResource.id)
        .single();

      expect(dbRecord).toMatchObject({
        id: requestResource.id,
        title: newTitle,
        description: originalDescription,
        location_name: originalLocation,
        type: 'request',
        owner_id: requestResource.ownerId,
      });
    });

    it('handles coordinates updates for offer', async () => {
      const newCoordinates = { lat: 40.7128, lng: -74.006 }; // NYC

      const updated = await resourcesApi.updateResource(supabase, {
        id: offerResource.id,
        coordinates: newCoordinates,
      });

      expect(updated!.coordinates).toEqual(newCoordinates);
      expect(updated!.type).toBe('offer');

      // Verify database record
      const { data: dbRecord } = await supabase
        .from('resources')
        .select('*')
        .eq('id', offerResource.id)
        .single();

      expect(parsePostGisPoint(dbRecord!.coordinates)).toEqual(newCoordinates);
    });

    it('handles coordinates updates for request', async () => {
      const newCoordinates = { lat: 34.0522, lng: -118.2437 }; // LA

      const updated = await resourcesApi.updateResource(supabase, {
        id: requestResource.id,
        coordinates: newCoordinates,
      });

      expect(updated!.coordinates).toEqual(newCoordinates);
      expect(updated!.type).toBe('request');

      // Verify database record
      const { data: dbRecord } = await supabase
        .from('resources')
        .select('*')
        .eq('id', requestResource.id)
        .single();

      expect(parsePostGisPoint(dbRecord!.coordinates)).toEqual(newCoordinates);
    });
  });

  describe('deleteResource', () => {
    let offerResource: Resource;
    let requestResource: Resource;

    beforeEach(async () => {
      offerResource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );
      requestResource = await createTestResource(
        supabase,
        testCommunity.id,
        'request',
      );
    });

    it('deletes resource offer', async () => {
      const deletedResource = await resourcesApi.deleteResource(
        supabase,
        offerResource.id,
      );

      // Verify return value
      expect(deletedResource).toBeTruthy();
      expect(deletedResource!.id).toBe(offerResource.id);
      expect(deletedResource!.type).toBe('offer');

      // Verify database record
      const { data: dbRecord } = await supabase
        .from('resources')
        .select('*')
        .eq('id', offerResource.id)
        .single();

      expect(dbRecord).toBeNull();
    });

    it('deletes resource request', async () => {
      const deletedResource = await resourcesApi.deleteResource(
        supabase,
        requestResource.id,
      );

      // Verify return value
      expect(deletedResource).toBeTruthy();
      expect(deletedResource!.id).toBe(requestResource.id);
      expect(deletedResource!.type).toBe('request');

      // Verify database record
      const { data: dbRecord } = await supabase
        .from('resources')
        .select('*')
        .eq('id', requestResource.id)
        .single();

      expect(dbRecord).toBeNull();
    });

    it('returns null when attempting to delete not my resource', async () => {
      await createTestUser(supabase);

      try {
        const result = await resourcesApi.deleteResource(
          supabase,
          requestResource.id,
        );
        expect(result).toBeNull();
      } finally {
        await signIn(supabase, testUser.email, 'TestPass123!');
      }
    });

    it('deletes resource offer and cascades to timeslots', async () => {
      // Create a timeslot for this resource
      const timeslot = await resourcesApi.createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: offerResource.id,
        }),
      );

      const deletedResource = await resourcesApi.deleteResource(
        supabase,
        offerResource.id,
      );

      // Verify return value
      expect(deletedResource).toBeTruthy();
      expect(deletedResource!.id).toBe(offerResource.id);
      expect(deletedResource!.type).toBe('offer');

      // Verify database record
      const { data: dbRecord } = await supabase
        .from('resources')
        .select('*')
        .eq('id', offerResource.id)
        .single();

      expect(dbRecord).toBeNull();

      // Verify timeslot deleted
      const { data: dbTimeslot } = await supabase
        .from('resource_timeslots')
        .select('*')
        .eq('id', timeslot.id)
        .single();

      expect(dbTimeslot).toBeNull();
    });

    it('deletes resource request and cascades to timeslots', async () => {
      // Create a timeslot for this resource
      const timeslot = await resourcesApi.createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: requestResource.id,
        }),
      );

      const deletedResource = await resourcesApi.deleteResource(
        supabase,
        requestResource.id,
      );

      // Verify return value
      expect(deletedResource).toBeTruthy();
      expect(deletedResource!.id).toBe(requestResource.id);
      expect(deletedResource!.type).toBe('request');

      // Verify database record
      const { data: dbRecord } = await supabase
        .from('resources')
        .select('*')
        .eq('id', requestResource.id)
        .single();

      expect(dbRecord).toBeNull();

      // Verify timeslot deleted
      const { data: dbTimeslot } = await supabase
        .from('resource_timeslots')
        .select('*')
        .eq('id', timeslot.id)
        .single();

      expect(dbTimeslot).toBeNull();
    });

    describe('multi-user tests', () => {
      afterEach(async () => {
        await signIn(supabase, testUser.email, 'TestPass123!');
      });

      it('deletes resource offer and cascades to timeslots and claims', async () => {
        // Create a timeslot for this resource
        const timeslot = await resourcesApi.createResourceTimeslot(
          supabase,
          createFakeResourceTimeslotInput({
            resourceId: offerResource.id,
          }),
        );

        // Create another user to claim the resource
        await createTestUser(supabase);

        const { data: { user: u5 } } = await supabase.auth.getUser(); await joinCommunity(supabase, u5!.id, testCommunity.id);
        await resourcesApi.createResourceClaim(supabase, {
          resourceId: offerResource.id,
          timeslotId: timeslot.id,
        });

        // Sign back in as the provider to delete
        await signIn(supabase, testUser.email, 'TestPass123!');

        // Delete resource
        const deletedResource = await resourcesApi.deleteResource(
          supabase,
          offerResource.id,
        );

        // Verify return value
        expect(deletedResource).toBeTruthy();
        expect(deletedResource!.id).toBe(offerResource.id);
        expect(deletedResource!.type).toBe('offer');

        // Wait a bit for the delete to propagate
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify resource deleted
        const { data, error } = await supabase
          .from('resources')
          .select()
          .eq('id', offerResource.id);

        expect(error).toBeNull();
        expect(data).toHaveLength(0);

        // Verify timeslots deleted
        const { data: timeslots } = await supabase
          .from('resource_timeslots')
          .select()
          .eq('resource_id', offerResource.id);

        expect(timeslots).toHaveLength(0);

        // Verify claims deleted
        const { data: claims } = await supabase
          .from('resource_claims')
          .select()
          .eq('resource_id', offerResource.id);

        expect(claims).toHaveLength(0);
      });

      it('deletes resource request and cascades to timeslots and claims', async () => {
        // Create a timeslot for this resource
        const timeslot = await resourcesApi.createResourceTimeslot(
          supabase,
          createFakeResourceTimeslotInput({
            resourceId: requestResource.id,
          }),
        );

        // Create another user to claim the resource
        await createTestUser(supabase);
        const { data: { user: u6 } } = await supabase.auth.getUser(); await joinCommunity(supabase, u6!.id, testCommunity.id);
        await resourcesApi.createResourceClaim(supabase, {
          resourceId: requestResource.id,
          timeslotId: timeslot.id,
        });

        // Sign back in as the provider to delete
        await signIn(supabase, testUser.email, 'TestPass123!');

        // Delete resource
        const deletedResource = await resourcesApi.deleteResource(
          supabase,
          requestResource.id,
        );

        // Verify return value
        expect(deletedResource).toBeTruthy();
        expect(deletedResource!.id).toBe(requestResource.id);
        expect(deletedResource!.type).toBe('request');

        // Wait a bit for the delete to propagate
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify resource deleted
        const { data, error } = await supabase
          .from('resources')
          .select()
          .eq('id', requestResource.id);

        expect(error).toBeNull();
        expect(data).toHaveLength(0);

        // Verify timeslots deleted
        const { data: timeslots } = await supabase
          .from('resource_timeslots')
          .select()
          .eq('resource_id', requestResource.id);

        expect(timeslots).toHaveLength(0);

        // Verify claims deleted
        const { data: claims } = await supabase
          .from('resource_claims')
          .select()
          .eq('resource_id', requestResource.id);

        expect(claims).toHaveLength(0);
      });
    });
  });
});

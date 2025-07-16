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
import { createFakeResourceInput, createFakeResourceTimeslotInput } from '@/features/resources/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';
import type { Resource, ResourceTimeslot } from '@/features/resources/types';
import { parsePostGisPoint } from '@/shared';

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

    // Sign in as testUser to ensure proper context for resource creation
    await signIn(supabase, testUser.email, 'TestPass123!');

    testCommunity = await createTestCommunity(supabase);
    readOnlyOffer1 = await createTestResource(supabase, testCommunity.id, 'offer');
    readOnlyOffer2 = await createTestResource(supabase, testCommunity.id, 'offer');
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('createResource', () => {
    it('creates resource offer with valid data', async () => {
      const data = createFakeResourceInput({
        title: `${TEST_PREFIX}Create_Test_${Date.now()}`,
        type: 'offer',
        communityId: testCommunity.id,
        imageUrls: undefined, // Don't generate random images
      });

      let resource;
      try {
        resource = await resourcesApi.createResource(supabase, data);

        expect(resource).toBeTruthy();
        expect(resource!.id).toBeTruthy();
        expect(resource!.title).toBe(data.title);
        expect(resource!.type).toBe('offer');
        expect(resource!.ownerId).toBe(testUser.id);
        expect(resource!.communityId).toBe(testCommunity.id);

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
          community_id: testCommunity.id,
          location_name: data.locationName,
        });

        expect(parsePostGisPoint(dbRecord!.coordinates)).toEqual(
          data.coordinates,
        );
        expect(dbRecord!.created_at).toBeTruthy();
        expect(dbRecord!.updated_at).toBeTruthy();
      } finally {
        await cleanupResource(resource);
      }
    });

    it('creates resource offer with timeslots', async () => {
      const data = createFakeResourceInput({
        title: `${TEST_PREFIX}Timeslot_Test_${Date.now()}`,
        type: 'offer',
        communityId: testCommunity.id,
        imageUrls: undefined,
      });

      let resource;
      let timeslot: ResourceTimeslot | undefined;
      try {
        resource = await resourcesApi.createResource(supabase, data);

        // Create a timeslot for this resource offer
        const timeslotData = createFakeResourceTimeslotInput({
          resourceId: resource!.id,
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
          maxClaims: 5,
        });

        timeslot = await resourcesApi.createResourceTimeslot(supabase, timeslotData);

        expect(timeslot).toBeTruthy();
        expect(timeslot!.resourceId).toBe(resource!.id);
        expect(timeslot!.maxClaims).toBe(5);

        // Verify timeslot database record exists
        const { data: timeslotRecord } = await supabase
          .from('resource_timeslots')
          .select('*')
          .eq('id', timeslot!.id)
          .single();

        expect(timeslotRecord).toBeTruthy();
        expect(timeslotRecord!.resource_id).toBe(resource!.id);
        expect(timeslotRecord!.max_claims).toBe(5);
      } finally {
        if (timeslot) {
          await resourcesApi.deleteResourceTimeslot(supabase, timeslot.id);
        }
        await cleanupResource(resource);
      }
    });

    it('handles image auto-commit workflow', async () => {
      const { uploadImage } = await import('@/features/images/api');

      // Create a test image file
      const testImageContent = new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10,
      ]); // PNG header
      const testFile = new File([testImageContent], 'test-image.png', {
        type: 'image/png',
      });

      let tempImageResult: string | null = null;
      let resource;

      try {
        // First upload a temporary image
        tempImageResult = await uploadImage({
          supabase,
          file: testFile,
          folder: 'temp-upload',
        });

        expect(tempImageResult).toBeTruthy();
        expect(typeof tempImageResult).toBe('string');
        expect(tempImageResult).toContain('temp-upload-');

        // Create resource offer with the temporary image URL
        const data = createFakeResourceInput({
          title: `${TEST_PREFIX}Image_Test_${Date.now()}`,
          type: 'offer',
          communityId: testCommunity.id,
          imageUrls: [tempImageResult],
        });

        resource = await resourcesApi.createResource(supabase, data);

        // If images are auto-committed, temp URLs should be converted to permanent URLs
        if (resource!.imageUrls && resource!.imageUrls.length > 0) {
          expect(resource!.imageUrls[0]).not.toContain('temp-upload-');
          expect(resource!.imageUrls[0]).toContain(
            `resource-${resource!.id}`,
          );

          // Verify the permanent image actually exists by checking storage
          const permanentUrl = resource!.imageUrls[0];
          const pathMatch = permanentUrl.match(/\/images\/(.+)$/);
          if (pathMatch) {
            const imagePath = pathMatch[1];
            const { data: fileData } = await supabase.storage
              .from('images')
              .download(imagePath);
            expect(fileData).toBeTruthy();
          }
        }
      } finally {
        // Cleanup: Delete temporary file if it still exists
        if (tempImageResult) {
          // Extract the path from the URL for storage deletion
          const urlMatch = tempImageResult.match(/\/images\/(.+)$/);
          if (urlMatch) {
            const imagePath = urlMatch[1];
            await supabase.storage.from('images').remove([imagePath]);
          }
        }

        // Cleanup resource (which should also cleanup permanent images)
        await cleanupResource(resource);
      }
    });
  });

  describe('fetchResources', () => {
    it('fetches all resource offers', async () => {
      const resources = await resourcesApi.fetchResources(supabase, { type: 'offer' });

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
            communityId: testCommunity.id,
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

    it('filters by communityId', async () => {
      const filtered = await resourcesApi.fetchResources(supabase, {
        type: 'offer',
        communityId: testCommunity.id,
      });

      expect(filtered.length).toBeGreaterThanOrEqual(2);
      expect(filtered.every((r) => r.communityId === testCommunity.id)).toBe(
        true,
      );
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
    it('updates resource offer fields', async () => {
      // Create own resource to modify
      let resource;
      try {
        resource = await createTestResource(supabase, testCommunity.id, 'offer');

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
          community_id: resource.communityId,
        });
      } finally {
        await cleanupResource(resource);
      }
    });

    it('preserves unchanged fields', async () => {
      let resource;
      try {
        resource = await createTestResource(supabase, testCommunity.id, 'offer');
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
          community_id: resource.communityId,
        });
      } finally {
        await cleanupResource(resource);
      }
    });

    it('handles coordinates updates', async () => {
      let resource;
      try {
        resource = await createTestResource(supabase, testCommunity.id, 'offer');
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

        expect(parsePostGisPoint(dbRecord!.coordinates)).toEqual(
          newCoordinates,
        );
      } finally {
        await cleanupResource(resource);
      }
    });
  });

  describe('deleteResource', () => {
    it('deletes resource offer and cascades to timeslots and claims', async () => {
      // Create a resource offer specifically for deletion
      const resource = await createTestResource(supabase, testCommunity.id, 'offer');
      const resourceId = resource.id;

      // Create a timeslot for this resource
      const timeslot = await resourcesApi.createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: resource.id,
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
          maxClaims: 5,
        }),
      );

      // Create another user to claim the resource
      const user2 = await createTestUser(supabase);
      const user2Email = user2.email;

      // Sign in as user2 and claim the resource offer
      await signIn(supabase, user2Email, 'TestPass123!');
      await resourcesApi.createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        status: 'pending',
      });

      // Sign back in as the provider to delete
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Delete resource
      await resourcesApi.deleteResource(supabase, resourceId);

      // Wait a bit for the delete to propagate
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify resource deleted
      const { data, error } = await supabase
        .from('resources')
        .select()
        .eq('id', resourceId);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      // Verify timeslots deleted
      const { data: timeslots } = await supabase
        .from('resource_timeslots')
        .select()
        .eq('resource_id', resourceId);

      expect(timeslots).toHaveLength(0);

      // Verify claims deleted
      const { data: claims } = await supabase
        .from('resource_claims')
        .select()
        .eq('resource_id', resourceId);

      expect(claims).toHaveLength(0);

      // Note: resource already deleted, user2 will be cleaned in afterAll
    });
  });

  // ====================================================================
  // GENERAL RESOURCE CRUD TESTS (merged from resources-crud.test.ts)
  // ====================================================================

  describe('General Resource CRUD Operations', () => {
    describe('createResource - general types', () => {
      it('creates resource with valid data (any type)', async () => {
        const data = createFakeResourceInput({
          title: `${TEST_PREFIX}General_Create_Test_${Date.now()}`,
          type: 'request',
          communityId: testCommunity.id,
          category: 'tools',
          imageUrls: undefined,
        });

        let resource;
        try {
          resource = await resourcesApi.createResource(supabase, data);
          expect(resource).toMatchObject({
            id: expect.any(String),
            title: data.title,
            ownerId: testUser.id,
            communityId: testCommunity.id,
            type: data.type,
            category: data.category,
          });

          // Verify database record exists with all expected fields
          const { data: dbRecord } = await supabase
            .from('resources')
            .select('*')
            .eq('id', resource.id)
            .single();

          expect(dbRecord).toMatchObject({
            id: resource.id,
            title: data.title,
            owner_id: testUser.id,
            community_id: testCommunity.id,
            type: data.type,
            category: data.category,
            description: data.description,
          });
          expect(dbRecord!.created_at).toBeTruthy();
          expect(dbRecord!.updated_at).toBeTruthy();
        } finally {
          await cleanupResource(resource);
        }
      });
    });

    describe('fetchResources - general filtering', () => {
      it('filters by category', async () => {
        let testResource;
        try {
          testResource = await resourcesApi.createResource(
            supabase,
            createFakeResourceInput({
              title: `${TEST_PREFIX}Filter_Category_${Date.now()}`,
              type: 'request',
              communityId: testCommunity.id,
              category: 'tools',
              imageUrls: undefined,
            }),
          );

          const filtered = await resourcesApi.fetchResources(supabase, {
            category: 'tools',
          });

          expect(filtered.some((r) => r.id === testResource!.id)).toBe(true);
          expect(filtered.every((r) => r.category === 'tools')).toBe(true);
        } finally {
          await cleanupResource(testResource);
        }
      });

      it('filters by type (request)', async () => {
        let testResource;
        try {
          testResource = await resourcesApi.createResource(
            supabase,
            createFakeResourceInput({
              title: `${TEST_PREFIX}Filter_Request_${Date.now()}`,
              communityId: testCommunity.id,
              type: 'request',
              category: 'tools',
              imageUrls: undefined,
            }),
          );

          const filtered = await resourcesApi.fetchResources(supabase, {
            type: 'request',
          });

          expect(filtered.some((r) => r.id === testResource!.id)).toBe(true);
          expect(filtered.every((r) => r.type === 'request')).toBe(true);
        } finally {
          await cleanupResource(testResource);
        }
      });

      it('filters by searchTerm', async () => {
        const uniqueTitle = `${TEST_PREFIX}UniqueSearch_${Date.now()}`;
        let testResource;

        try {
          testResource = await resourcesApi.createResource(
            supabase,
            createFakeResourceInput({
              title: uniqueTitle,
              type: 'request',
              communityId: testCommunity.id,
              category: 'tools',
              imageUrls: undefined,
            }),
          );

          const filtered = await resourcesApi.fetchResources(supabase, {
            searchTerm: 'UniqueSearch',
          });

          expect(filtered.some((r) => r.title === uniqueTitle)).toBe(true);
        } finally {
          await cleanupResource(testResource);
        }
      });
    });

    describe('updateResource - general fields', () => {
      it('updates category and type', async () => {
        let resource;
        try {
          resource = await createTestResource(supabase, testCommunity.id, 'request');

          const updated = await resourcesApi.updateResource(supabase, {
            id: resource.id,
            category: 'food',
            type: 'offer',
          });

          expect(updated!.category).toBe('food');
          expect(updated!.type).toBe('offer');
        } finally {
          await cleanupResource(resource);
        }
      });
    });
  });
});
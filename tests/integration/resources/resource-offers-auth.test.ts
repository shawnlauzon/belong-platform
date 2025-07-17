import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestResource,
  createTestCommunity,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import * as resourcesApi from '@/features/resources/api';
import { signIn, signOut } from '@/features/auth/api';
import { createFakeResourceInput, createFakeResourceTimeslotInput, createFakeResourceClaimInput } from '@/features/resources/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Resource, ResourceTimeslot } from '@/features/resources/types';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';

describe('Resource Offers API - Authentication Requirements', () => {
  let authenticatedClient: SupabaseClient<Database>;
  let unauthenticatedClient: SupabaseClient<Database>;
  let testUser: User;
  let testCommunity: Community;
  let testResourceOffer: Resource;
  let testTimeslot: ResourceTimeslot;

  beforeAll(async () => {
    // Set up authenticated client and test data
    authenticatedClient = createTestClient();

    // Create test data with authenticated client
    testUser = await createTestUser(authenticatedClient);
    await signIn(authenticatedClient, testUser.email, 'TestPass123!');

    testCommunity = await createTestCommunity(authenticatedClient);
    testResourceOffer = await createTestResource(authenticatedClient, testCommunity.id, 'offer');
    
    // Create a timeslot for this resource offer
    testTimeslot = await resourcesApi.createResourceTimeslot(
      authenticatedClient,
      createFakeResourceTimeslotInput({
        resourceId: testResourceOffer.id,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
        maxClaims: 5,
      }),
    );

    // Set up unauthenticated client
    unauthenticatedClient = createTestClient();
    await signOut(unauthenticatedClient);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Unauthenticated Read Operations', () => {
    describe('fetchResources', () => {
      it('allows unauthenticated access', async () => {
        const resources = await resourcesApi.fetchResources(unauthenticatedClient, {
          type: 'offer',
        });

        expect(Array.isArray(resources)).toBe(true);
        expect(resources.some((r) => r.id === testResourceOffer.id)).toBe(true);
        expect(resources.every((r) => r.type === 'offer')).toBe(true);
      });

      it('allows unauthenticated access with filters', async () => {
        const resources = await resourcesApi.fetchResources(unauthenticatedClient, {
          type: 'offer',
          searchTerm: 'test',
          ownerId: testUser.id,
          communityIds: [testCommunity.id],
        });

        expect(Array.isArray(resources)).toBe(true);
      });
    });

    describe('fetchResourceById', () => {
      it('allows unauthenticated access to existing resource offer', async () => {
        const result = await resourcesApi.fetchResourceById(
          unauthenticatedClient,
          testResourceOffer.id,
        );

        expect(result).toBeTruthy();
        expect(result!.id).toBe(testResourceOffer.id);
        expect(result!.title).toBe(testResourceOffer.title);
        expect(result!.type).toBe('offer');
      });

      it('returns null for non-existent resource without authentication', async () => {
        const result = await resourcesApi.fetchResourceById(
          unauthenticatedClient,
          '00000000-0000-0000-0000-000000000000',
        );

        expect(result).toBeNull();
      });
    });

    describe('fetchResourceTimeslots', () => {
      it('requires authentication to access resource timeslots', async () => {
        await expect(
          resourcesApi.fetchResourceTimeslots(
            unauthenticatedClient,
            testResourceOffer.id,
          ),
        ).rejects.toThrow('Authentication required');
      });
    });

    describe('fetchResourceClaims', () => {
      it('requires authentication to access resource claims', async () => {
        await expect(
          resourcesApi.fetchResourceClaims(
            unauthenticatedClient,
            { resourceId: testResourceOffer.id },
          ),
        ).rejects.toThrow('Authentication required');
      });
    });
  });

  describe('Unauthenticated Write Operations', () => {
    describe('createResource', () => {
      it('requires authentication', async () => {
        const data = createFakeResourceInput({
          title: `${TEST_PREFIX}Unauth_Create_Test`,
          type: 'offer',
          communityIds: [testCommunity.id],
          imageUrls: undefined,
        });

        await expect(
          resourcesApi.createResource(unauthenticatedClient, data),
        ).rejects.toThrow();
      });
    });

    describe('updateResource', () => {
      it('requires authentication', async () => {
        await expect(
          resourcesApi.updateResource(unauthenticatedClient, {
            id: testResourceOffer.id,
            title: 'Unauthorized Update Attempt',
          }),
        ).rejects.toThrow();
      });

      it('requires authentication even for non-existent resource', async () => {
        await expect(
          resourcesApi.updateResource(unauthenticatedClient, {
            id: '00000000-0000-0000-0000-000000000000',
            title: 'Test',
          }),
        ).rejects.toThrow();
      });
    });

    describe('deleteResource', () => {
      it('requires authentication', async () => {
        await expect(
          resourcesApi.deleteResource(unauthenticatedClient, testResourceOffer.id),
        ).rejects.toThrow();
      });

      it('requires authentication even for non-existent resource', async () => {
        await expect(
          resourcesApi.deleteResource(
            unauthenticatedClient,
            '00000000-0000-0000-0000-000000000000',
          ),
        ).rejects.toThrow();
      });
    });

    describe('createResourceTimeslot', () => {
      it('requires authentication', async () => {
        const timeslotInput = createFakeResourceTimeslotInput({
          resourceId: testResourceOffer.id,
          startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
          maxClaims: 3,
        });

        await expect(
          resourcesApi.createResourceTimeslot(unauthenticatedClient, timeslotInput),
        ).rejects.toThrow();
      });
    });

    describe('createResourceClaim', () => {
      it('requires authentication', async () => {
        const claimInput = createFakeResourceClaimInput({
          resourceId: testResourceOffer.id,
          timeslotId: testTimeslot.id,
          status: 'pending',
        });

        await expect(
          resourcesApi.createResourceClaim(unauthenticatedClient, claimInput),
        ).rejects.toThrow();
      });
    });

    describe('updateResourceClaim', () => {
      it('requires authentication', async () => {
        await expect(
          resourcesApi.updateResourceClaim(
            unauthenticatedClient, 
            '00000000-0000-0000-0000-000000000000',
            { status: 'approved' }
          ),
        ).rejects.toThrow();
      });
    });
  });

  describe('Security Boundary Verification', () => {
    it('authenticated client can create resource offers', async () => {
      const data = createFakeResourceInput({
        title: `${TEST_PREFIX}Auth_Create_Test_${Date.now()}`,
        type: 'offer',
        communityIds: [testCommunity.id],
        imageUrls: undefined,
      });

      const resource = await resourcesApi.createResource(authenticatedClient, data);
      expect(resource).toBeTruthy();
      expect(resource!.title).toBe(data.title);
      expect(resource!.type).toBe('offer');
    });

    it('authenticated client can update own resource offers', async () => {
      const newTitle = `${TEST_PREFIX}Auth_Update_Test_${Date.now()}`;

      const updated = await resourcesApi.updateResource(authenticatedClient, {
        id: testResourceOffer.id,
        title: newTitle,
      });

      expect(updated).toBeTruthy();
      expect(updated!.title).toBe(newTitle);
    });

    it('authenticated client can create and update resource claims', async () => {
      // Create a second user
      const secondUser = await createTestUser(authenticatedClient);
      await signIn(authenticatedClient, secondUser.email, 'TestPass123!');

      // Create claim for the resource offer
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResourceOffer.id,
        timeslotId: testTimeslot.id,
        status: 'pending',
      });

      const claim = await resourcesApi.createResourceClaim(authenticatedClient, claimInput);

      expect(claim).toBeTruthy();
      expect(claim!.resourceId).toBe(testResourceOffer.id);
      expect(claim!.userId).toBe(secondUser.id);
      expect(claim!.status).toBe('pending');

      // Update claim status
      const updatedClaim = await resourcesApi.updateResourceClaim(
        authenticatedClient,
        claim.id,
        { status: 'approved' }
      );

      // Verify update operation returned claim info with approved status
      expect(updatedClaim).toBeDefined();
      expect(updatedClaim!.status).toBe('approved');
      expect(updatedClaim!.resourceId).toBe(testResourceOffer.id);
      expect(updatedClaim!.userId).toBe(secondUser.id);

      // Verify claim record has approved status
      const claims = await resourcesApi.fetchResourceClaims(
        authenticatedClient,
        { resourceId: testResourceOffer.id },
      );
      const userClaim = claims.find((c) => c.userId === secondUser.id);
      expect(userClaim).toBeDefined();
      expect(userClaim!.status).toBe('approved');
    });

    it('authenticated client can delete own resource offers', async () => {
      // Create a new resource offer to delete
      const deleteData = createFakeResourceInput({
        title: `${TEST_PREFIX}Auth_Delete_Test_${Date.now()}`,
        type: 'offer',
        communityIds: [testCommunity.id],
        imageUrls: undefined,
      });

      // Sign back in as original user
      await signIn(authenticatedClient, testUser.email, 'TestPass123!');
      const resourceToDelete = await resourcesApi.createResource(
        authenticatedClient,
        deleteData,
      );

      // Delete the resource offer
      await resourcesApi.deleteResource(authenticatedClient, resourceToDelete!.id);

      // Verify resource offer is deleted
      const result = await resourcesApi.fetchResourceById(
        authenticatedClient,
        resourceToDelete!.id,
      );
      expect(result).toBeNull();
    });

    it('unauthenticated fetch still works after authenticated operations', async () => {
      // Verify that unauthenticated read access still works after auth operations
      const resources = await resourcesApi.fetchResources(unauthenticatedClient, {
        type: 'offer',
      });
      expect(Array.isArray(resources)).toBe(true);

      const resource = await resourcesApi.fetchResourceById(
        unauthenticatedClient,
        testResourceOffer.id,
      );
      expect(resource).toBeTruthy();
    });

    it('handles coordinates in unauthenticated access', async () => {
      const resource = await resourcesApi.fetchResourceById(
        unauthenticatedClient,
        testResourceOffer.id,
      );

      expect(resource).toBeTruthy();
      if (resource!.coordinates) {
        expect(resource!.coordinates).toHaveProperty('lat');
        expect(resource!.coordinates).toHaveProperty('lng');
        expect(typeof resource!.coordinates.lat).toBe('number');
        expect(typeof resource!.coordinates.lng).toBe('number');
      }
    });
  });

  describe('Authorization Edge Cases', () => {
    it('prevents users from updating resource offers they do not own', async () => {
      // Create a second user
      const otherUser = await createTestUser(authenticatedClient);
      await signIn(authenticatedClient, otherUser.email, 'TestPass123!');

      // Try to update the original test resource offer (owned by testUser)
      await expect(
        resourcesApi.updateResource(authenticatedClient, {
          id: testResourceOffer.id,
          title: 'Unauthorized Update by Other User',
        }),
      ).rejects.toThrow();
    });

    it('prevents users from deleting resource offers they do not own', async () => {
      // Still signed in as otherUser from previous test
      // Try to delete the original test resource offer (owned by testUser)
      await expect(
        resourcesApi.deleteResource(authenticatedClient, testResourceOffer.id),
      ).rejects.toThrow();

      // Sign back in as original user for cleanup
      await signIn(authenticatedClient, testUser.email, 'TestPass123!');
    });

    it('allows provider full control over their resource offers', async () => {
      // Already signed in as testUser (original provider)

      // Should be able to update
      const updateResult = await resourcesApi.updateResource(authenticatedClient, {
        id: testResourceOffer.id,
        description: 'Updated by provider',
      });
      expect(updateResult).toBeTruthy();
      expect(updateResult!.description).toBe('Updated by provider');

      // Should be able to see full resource offer details
      const fetchResult = await resourcesApi.fetchResourceById(
        authenticatedClient,
        testResourceOffer.id,
      );
      expect(fetchResult).toBeTruthy();
      expect(fetchResult!.description).toBe('Updated by provider');
    });
  });
});
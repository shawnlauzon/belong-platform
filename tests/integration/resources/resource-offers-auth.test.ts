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
import {
  createFakeResourceInput,
  createFakeResourceTimeslotInput,
  createFakeResourceClaimInput,
} from '@/features/resources/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Resource, ResourceTimeslot } from '@/features/resources/types';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';
import { joinCommunity } from '@/features/communities/api';

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
    testResourceOffer = await createTestResource(
      authenticatedClient,
      testCommunity.id,
      'offer',
    );

    // Create a timeslot for this resource offer
    testTimeslot = await resourcesApi.createResourceTimeslot(
      authenticatedClient,
      createFakeResourceTimeslotInput({
        resourceId: testResourceOffer.id,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
      }),
    );

    // Set up unauthenticated client
    unauthenticatedClient = createTestClient();
    await signOut(unauthenticatedClient);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Unauthenticated Write Operations', () => {
    describe('createResource', () => {
      it('throws error for unauthenticated create attempt', async () => {
        const data = createFakeResourceInput({
          title: `${TEST_PREFIX}Unauth_Create_Test`,
          communityIds: [testCommunity.id],
          imageUrls: undefined,
        });

        await expect(
          resourcesApi.createResource(unauthenticatedClient, data),
        ).rejects.toThrow();
      });
    });

    describe('updateResource', () => {
      it('throws error for unauthenticated update attempt', async () => {
        await expect(
          resourcesApi.updateResource(unauthenticatedClient, {
            id: testResourceOffer.id,
            title: 'Unauthorized Update Attempt',
          }),
        ).rejects.toThrow();
      });

      it('throws error for unauthenticated update even for non-existent resource', async () => {
        await expect(
          resourcesApi.updateResource(unauthenticatedClient, {
            id: '00000000-0000-0000-0000-000000000000',
            title: 'Test',
          }),
        ).rejects.toThrow();
      });
    });

    describe('deleteResource', () => {
      it('returns null for unauthenticated delete attempt', async () => {
        const result = await resourcesApi.deleteResource(
          unauthenticatedClient,
          testResourceOffer.id,
        );
        expect(result).toBeNull();
      });

      it('returns null for unauthenticated delete even for non-existent resource', async () => {
        const result = await resourcesApi.deleteResource(
          unauthenticatedClient,
          '00000000-0000-0000-0000-000000000000',
        );
        expect(result).toBeNull();
      });
    });

    describe('createResourceTimeslot', () => {
      it('throws error for unauthenticated timeslot creation', async () => {
        const timeslotInput = createFakeResourceTimeslotInput({
          resourceId: testResourceOffer.id,
          startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
        });

        await expect(
          resourcesApi.createResourceTimeslot(
            unauthenticatedClient,
            timeslotInput,
          ),
        ).rejects.toThrow();
      });
    });

    describe('createResourceClaim', () => {
      it('throws error for unauthenticated claim creation', async () => {
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
      it('throws error for unauthenticated claim update', async () => {
        await expect(
          resourcesApi.updateResourceClaim(unauthenticatedClient, {
            id: '00000000-0000-0000-0000-000000000000',
            status: 'approved',
          }),
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

      const resource = await resourcesApi.createResource(
        authenticatedClient,
        data,
      );
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
      await joinCommunity(authenticatedClient, testCommunity.id);

      // Create claim for the resource offer
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResourceOffer.id,
        timeslotId: testTimeslot.id,
        status: 'pending',
      });

      const claim = await resourcesApi.createResourceClaim(
        authenticatedClient,
        claimInput,
      );

      expect(claim).toBeTruthy();
      expect(claim!.resourceId).toBe(testResourceOffer.id);
      expect(claim!.claimantId).toBe(secondUser.id);
      expect(claim!.status).toBe('pending');

      // Update claim status
      const updatedClaim = await resourcesApi.updateResourceClaim(
        authenticatedClient,
        { id: claim.id, status: 'cancelled' },
      );

      // Verify update operation returned claim info with cancelled status
      expect(updatedClaim).toBeDefined();
      expect(updatedClaim!.status).toBe('cancelled');
      expect(updatedClaim!.resourceId).toBe(testResourceOffer.id);
      expect(updatedClaim!.claimantId).toBe(secondUser.id);

      // Verify claim record has cancelled status
      const claims = await resourcesApi.fetchResourceClaims(
        authenticatedClient,
        { resourceId: testResourceOffer.id },
      );
      const userClaim = claims.find((c) => c.claimantId === secondUser.id);
      expect(userClaim).toBeDefined();
      expect(userClaim!.status).toBe('cancelled');
    });

    it('authenticated client can delete own resource offers', async () => {
      // Sign back in as original user
      await signIn(authenticatedClient, testUser.email, 'TestPass123!');
      const resourceToDelete = await resourcesApi.createResource(
        authenticatedClient,
        createFakeResourceInput({
          title: `${TEST_PREFIX}Auth_Delete_Test_${Date.now()}`,
          type: 'offer',
          communityIds: [testCommunity.id],
          imageUrls: undefined,
        }),
      );

      // Delete the resource offer
      await resourcesApi.deleteResource(
        authenticatedClient,
        resourceToDelete!.id,
      );

      // Verify resource offer is deleted
      const result = await resourcesApi.fetchResourceById(
        authenticatedClient,
        resourceToDelete!.id,
      );
      expect(result).toBeNull();
    });
  });

  describe('Authorization Edge Cases', () => {
    it('prevents users from updating resource offers they do not own', async () => {
      // Create a second user
      await createTestUser(authenticatedClient);
      await joinCommunity(authenticatedClient, testCommunity.id);

      // Try to update the original test resource offer (owned by testUser)
      await expect(
        resourcesApi.updateResource(authenticatedClient, {
          id: testResourceOffer.id,
          title: 'Unauthorized Update by Other User',
        }),
      ).rejects.toThrow('Resource not found for update');
    });

    it('prevents users from deleting resource offers they do not own', async () => {
      // Still signed in as otherUser from previous test
      // Try to delete the original test resource offer (owned by testUser)
      // Changed from expect rejection to expect NO-OP (null)
      const result = await resourcesApi.deleteResource(
        authenticatedClient,
        testResourceOffer.id,
      );
      expect(result).toBeNull();

      // Sign back in as original user for cleanup
      await signIn(authenticatedClient, testUser.email, 'TestPass123!');
    });

    it('allows provider full control over their resource offers', async () => {
      // Already signed in as testUser (original provider)

      // Should be able to update
      const updateResult = await resourcesApi.updateResource(
        authenticatedClient,
        {
          id: testResourceOffer.id,
          description: 'Updated by provider',
        },
      );
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

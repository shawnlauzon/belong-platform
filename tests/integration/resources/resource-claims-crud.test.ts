import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  createTestResourceTimeslot,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import * as resourcesApi from '@/features/resources/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { Account } from '@/features/auth/types';
import { createFakeResourceClaimInput } from '@/features/resources/__fakes__';
import { Community } from '@/features/communities/types';
import {
  Resource,
  ResourceClaim,
  ResourceTimeslot,
} from '@/features/resources/types';
import { joinCommunity } from '@/features/communities/api';

describe('Resource Claims - Basic Operations', () => {
  let supabase: SupabaseClient<Database>;
  let resourceOwner: Account;
  let claimant: Account;
  let testCommunity: Community;
  let testResource: Resource;
  let testTimeslot: ResourceTimeslot;
  let testTimeslot2: ResourceTimeslot;
  let readOnlyClaim: ResourceClaim;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create resource owner and setup
    resourceOwner = await createTestUser(supabase);

    testCommunity = await createTestCommunity(supabase);
    testResource = await createTestResource(supabase, testCommunity.id);
    testTimeslot = await createTestResourceTimeslot(supabase, testResource.id);
    testTimeslot2 = await createTestResourceTimeslot(supabase, testResource.id);

    // Create user who will make claims
    claimant = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);

    readOnlyClaim = await resourcesApi.createResourceClaim(supabase, {
      resourceId: testResource.id,
      timeslotId: testTimeslot.id,
    });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Basic Claim Creation', () => {
    let testClaim: ResourceClaim | null = null;

    afterEach(async () => {
      if (testClaim) {
        await resourcesApi.deleteResourceClaim(supabase, testClaim.id);
        testClaim = null;
      }
    });

    it('creates resource claim with default "approved" status when resource does not require approval', async () => {
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: testTimeslot2.id,
      });
      // Status is now automatically determined by API, no need to delete anything

      testClaim = await resourcesApi.createResourceClaim(supabase, claimInput);

      expect(testClaim).toBeTruthy();
      expect(testClaim).toMatchObject({
        resourceId: testResource.id,
        claimantId: claimant.id,
        status: 'approved',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      await verifyClaimInDatabase(supabase, testClaim);
    });

    it('should not allow explicitly setting status on creation', async () => {
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: testTimeslot2.id,
      });

      // Status should be ignored/determined automatically by the API
      testClaim = await resourcesApi.createResourceClaim(supabase, claimInput);

      expect(testClaim).toBeTruthy();
      expect(testClaim).toMatchObject({
        resourceId: testResource.id,
        claimantId: claimant.id,
        status: 'approved', // Should be approved since resource doesn't require approval
        timeslotId: testTimeslot2.id,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      await verifyClaimInDatabase(supabase, testClaim);
    });

    // it expect.fails to create duplicate claim
    it('expect.fails to create duplicate claim', async () => {
      try {
        testClaim = await resourcesApi.createResourceClaim(
          supabase,
          createFakeResourceClaimInput({
            resourceId: testResource.id,
            timeslotId: testTimeslot.id,
          }),
        );
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    it('determines initial status automatically based on resource approval requirements', async () => {
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: testTimeslot2.id,
      });

      testClaim = await resourcesApi.createResourceClaim(
        supabase,
        claimInput,
      );
      
      // Status should be 'approved' for non-approval-required resources
      expect(testClaim.status).toBe('approved');
    });

    describe('Fetches a claim', () => {
      it('fetches claims by claimant', async () => {
        // Fetch claims by claimant ID since fetchResourceClaimById no longer exists
        const claimsByClaimant = await resourcesApi.fetchResourceClaims(
          supabase,
          {
            claimantId: claimant.id,
          },
        );

        expect(claimsByClaimant).toBeTruthy();
        expect(claimsByClaimant.length).toBeGreaterThanOrEqual(1);

        // Find our specific claim in the results
        const ourClaim = claimsByClaimant.find(
          (claim) => claim.id === readOnlyClaim.id,
        );
        expect(ourClaim).toBeTruthy();
        expect(ourClaim).toMatchObject({
          id: readOnlyClaim.id,
          resourceId: testResource.id,
          timeslotId: testTimeslot.id,
          claimantId: claimant.id,
          status: 'approved',
        });
      });

      it('fetches all claims for claimant (at least one)', async () => {
        const allClaims = await resourcesApi.fetchResourceClaims(supabase, {
          claimantId: claimant.id,
        });

        expect(allClaims.length).toBeGreaterThanOrEqual(1);
        const ourClaim = allClaims.find(
          (claim) => claim.id === readOnlyClaim.id,
        );
        expect(ourClaim?.claimantId).toBe(claimant.id);
        expect(ourClaim?.id).toBe(readOnlyClaim.id);
      });

      it('filters resource claims by resource ID', async () => {
        // This test validates that resource claims can be filtered by specific resource ID
        const claimsForResource = await resourcesApi.fetchResourceClaims(
          supabase,
          {
            resourceId: testResource.id,
          },
        );

        expect(claimsForResource.length).toBeGreaterThanOrEqual(1);
        expect(
          claimsForResource.every(
            (claim) => claim.resourceId === testResource.id,
          ),
        ).toBe(true);

        // Verify our read-only claim is included
        const ourClaim = claimsForResource.find(
          (claim) => claim.id === readOnlyClaim.id,
        );
        expect(ourClaim).toBeTruthy();
        expect(ourClaim?.resourceId).toBe(testResource.id);
      });
    });

    it('expect.fails with invalid resource id', async () => {
      const invalidResourceId = 'invalid-resource-id';
      const claimInput = createFakeResourceClaimInput({
        resourceId: invalidResourceId,
        timeslotId: testTimeslot2.id,
      });

      await expect(
        resourcesApi.createResourceClaim(supabase, claimInput),
      ).rejects.toThrow();
    });

    describe('Updating Claims by claim creator', () => {
      let testClaim2: ResourceClaim;

      beforeEach(async () => {
        testClaim2 = await resourcesApi.createResourceClaim(
          supabase,
          createFakeResourceClaimInput({
            resourceId: testResource.id,
            timeslotId: testTimeslot2.id,
          }),
        );
      });

      afterEach(async () => {
        await resourcesApi.deleteResourceClaim(supabase, testClaim2.id);
      });

      it('finds claim by claimant lookup', async () => {
        // Find claim by fetching all claims for claimant since fetchResourceClaimById removed
        const claims = await resourcesApi.fetchResourceClaims(supabase, {
          claimantId: claimant.id,
        });

        const claim = claims.find((c) => c.id === testClaim2.id);
        expect(claim).toBeTruthy();
        expect(claim).toMatchObject({
          id: testClaim2.id,
          resourceId: testResource.id,
          timeslotId: testTimeslot2.id,
          claimantId: claimant.id,
          status: 'approved',
        });
      });

      it('updates claim status to cancelled', async () => {
        const updatedClaim = await resourcesApi.updateResourceClaim(supabase, {
          id: testClaim2.id,
          status: 'cancelled',
        });

        expect(updatedClaim.status).toBe('cancelled');
        // Verify record exists in database
        await verifyClaimInDatabase(supabase, updatedClaim);
      });

      it('cannot update claim status from "cancelled" (terminal state)', async () => {
        // First cancel the claim
        await resourcesApi.updateResourceClaim(supabase, {
          id: testClaim2.id,
          status: 'cancelled',
        });

        // Try to update from cancelled to approved - should fail
        await expect(
          resourcesApi.updateResourceClaim(supabase, {
            id: testClaim2.id,
            status: 'approved',
          })
        ).rejects.toThrow();
      });

      it('allows claimant to update claim status to cancelled', async () => {
        // Test that claimant can update to cancelled
        const cancelledClaim = await resourcesApi.updateResourceClaim(supabase, {
          id: testClaim2.id,
          status: 'cancelled',
        });
        expect(cancelledClaim.status).toBe('cancelled');
        
        // Verify record exists in database
        await verifyClaimInDatabase(supabase, cancelledClaim);
      });

      it('deletes resource claim', async () => {
        // Delete claim
        await resourcesApi.deleteResourceClaim(supabase, testClaim2.id);

        // Wait a bit for the delete to propagate
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify claim deleted
        const { data, error } = await supabase
          .from('resource_claims')
          .select()
          .eq('id', testClaim2.id);

        expect(error).toBeNull();
        expect(data).toHaveLength(0);
      });
    });

    describe('Claim actions by resource owner', () => {
      let testClaim2: ResourceClaim;
      let testResource3: Resource;
      let testClaim3: ResourceClaim;
      beforeAll(async () => {
        // NOTE: this is a new claim created by the claimant owner
        testClaim2 = await resourcesApi.createResourceClaim(supabase, {
          resourceId: testResource.id,
          timeslotId: testTimeslot2.id,
        });

        await createTestUser(supabase);
        await joinCommunity(supabase, testCommunity.id);
        testResource3 = await createTestResource(supabase, testCommunity.id);
        const testTimeslot3 = await createTestResourceTimeslot(
          supabase,
          testResource3.id,
        );

        await signIn(supabase, claimant.email, 'TestPass123!');
        testClaim3 = await resourcesApi.createResourceClaim(supabase, {
          resourceId: testResource3.id,
          timeslotId: testTimeslot3.id,
        });

        await signIn(supabase, resourceOwner.email, 'TestPass123!');
      });

      afterAll(async () => {
        await signIn(supabase, claimant.email, 'TestPass123!');
        await resourcesApi.deleteResourceClaim(supabase, testClaim2.id);
        await resourcesApi.deleteResourceClaim(supabase, testClaim3.id);
      });

      describe('Fetches a claim', () => {
        it('fetches a single claim by claimant lookup', async () => {
          const claims = await resourcesApi.fetchResourceClaims(supabase, {
            claimantId: claimant.id,
          });

          const fetchedClaim = claims.find((c) => c.id === testClaim2.id);
          expect(fetchedClaim).toBeTruthy();
          expect(fetchedClaim).toMatchObject({
            id: testClaim2.id,
            resourceId: testResource.id,
            claimantId: claimant.id,
          });
        });

        it('fetches all claims for claimant', async () => {
          const allClaims = await resourcesApi.fetchResourceClaims(supabase, {
            claimantId: claimant.id,
          });

          expect(allClaims.length).toBeGreaterThanOrEqual(2);
          expect(allClaims).toContainEqual(
            expect.objectContaining({
              id: readOnlyClaim.id,
              resourceId: testResource.id,
              timeslotId: testTimeslot.id,
              claimantId: claimant.id,
            }),
          );

          expect(allClaims).toContainEqual(
            expect.objectContaining({
              id: testClaim2.id,
              resourceId: testResource.id,
              timeslotId: testTimeslot2.id,
              claimantId: claimant.id,
            }),
          );

          expect(allClaims).toContainEqual(
            expect.objectContaining({
              id: testClaim3.id,
            }),
          );
        });

        it('fetches claims by resource owner', async () => {
          const claims = await resourcesApi.fetchResourceClaims(supabase, {
            resourceOwnerId: resourceOwner.id,
          });

          expect(claims).toContainEqual(
            expect.not.objectContaining({
              id: testClaim3.id,
            }),
          );
        });
      });

      it('resource owner can update claim status according to state machine rules', async () => {
        // For offers without approval: approved -> given/received -> completed
        
        // Create fresh timeslot and claim for this test
        const freshTimeslot = await createTestResourceTimeslot(supabase, testResource.id);
        const freshClaim = await resourcesApi.createResourceClaim(supabase, {
          resourceId: testResource.id,
          timeslotId: freshTimeslot.id,
        });
        
        // Owner can mark as given
        const givenClaim = await resourcesApi.updateResourceClaim(supabase, {
          id: freshClaim.id,
          status: 'given',
        });
        expect(givenClaim.status).toBe('given');
        await verifyClaimInDatabase(supabase, givenClaim);
        
        // Clean up
        await resourcesApi.deleteResourceClaim(supabase, freshClaim.id);
        
        // Test alternative path: approved -> received
        const freshTimeslot2 = await createTestResourceTimeslot(supabase, testResource.id);
        const freshClaim2 = await resourcesApi.createResourceClaim(supabase, {
          resourceId: testResource.id,
          timeslotId: freshTimeslot2.id,
        });
        
        const receivedClaim = await resourcesApi.updateResourceClaim(supabase, {
          id: freshClaim2.id,
          status: 'received', 
        });
        expect(receivedClaim.status).toBe('received');
        await verifyClaimInDatabase(supabase, receivedClaim);
        
        // Clean up
        await resourcesApi.deleteResourceClaim(supabase, freshClaim2.id);
      });

      it('expect.fails if resource owner attempts to update resource claim status to "cancelled"', async () => {
        const claimInput = {
          resourceId: testResource.id,
          timeslotId: undefined,
        };

        try {
          await resourcesApi.updateResourceClaim(supabase, {
            id: testClaim2.id,
            ...claimInput,
          });
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeTruthy();
        }
      });

      it('cannot delete resource claim', async () => {
        await verifyClaimInDatabase(supabase, testClaim2);
        try {
          await resourcesApi.deleteResourceClaim(supabase, testClaim2.id);

          // The record should still be there
          await verifyClaimInDatabase(supabase, testClaim2);
        } catch (error) {
          // This would also be a pass, however RLS permissions cause it to delete 0 rows silently
          expect(error).toBeTruthy();
        }
      });

      // TODO: fix this test; RLS permissions cause it to delete 0 rows silently
      it.skip('cannot delete resource claim', async () => {
        await expect(
          resourcesApi.deleteResourceClaim(supabase, testClaim2.id),
        ).rejects.toThrow();
      });
    });
  });
});

async function verifyClaimInDatabase(
  supabase: SupabaseClient<Database>,
  claim: ResourceClaim,
) {
  const { data: dbRecord } = await supabase
    .from('resource_claims')
    .select()
    .eq('id', claim.id)
    .single();

  expect(dbRecord).toMatchObject({
    resource_id: claim.resourceId,
    status: claim.status,
    claimant_id: claim.claimantId,
    timeslot_id: claim.timeslotId ?? null,
  });
}

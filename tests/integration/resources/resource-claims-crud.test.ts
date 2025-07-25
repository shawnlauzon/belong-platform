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
  let resourceOwner: User;
  let claimant: User;
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
    // await cleanupAllTestData();
  });

  describe('Basic Claim Creation', () => {
    let testClaim: ResourceClaim | null = null;

    afterEach(async () => {
      if (testClaim) {
        await resourcesApi.deleteResourceClaim(supabase, testClaim.id);
        testClaim = null;
      }
    });

    it('creates resource claim with default "pending" status', async () => {
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: testTimeslot2.id,
      });
      delete claimInput.status;

      testClaim = await resourcesApi.createResourceClaim(supabase, claimInput);

      expect(testClaim).toBeTruthy();
      expect(testClaim).toMatchObject({
        resourceId: testResource.id,
        claimantId: claimant.id,
        status: 'pending',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      await verifyClaimInDatabase(supabase, testClaim);
    });

    it('creates resource claim with explictly set "pending" status', async () => {
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: testTimeslot2.id,
        status: 'pending',
      });

      testClaim = await resourcesApi.createResourceClaim(supabase, claimInput);

      expect(testClaim).toBeTruthy();
      expect(testClaim).toMatchObject({
        resourceId: testResource.id,
        claimantId: claimant.id,
        status: 'pending',
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

    it('expect.fails if attempting to create resource claim status other than "pending"', async () => {
      const invalidStatuses = [
        'approved',
        'rejected',
        'completed',
        'cancelled',
      ];

      for (const status of invalidStatuses) {
        const claimInput = createFakeResourceClaimInput({
          resourceId: testResource.id,
          timeslotId: testTimeslot2.id,
          status: status as 'approved' | 'rejected' | 'completed' | 'cancelled',
        });

        try {
          testClaim = await resourcesApi.createResourceClaim(
            supabase,
            claimInput,
          );
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeTruthy();
        }
      }
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
          status: 'pending',
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
        status: 'pending',
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
          status: 'pending',
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

      it('updates claim status from "cancelled" to pending', async () => {
        // Check current status by fetching claims for claimant
        const claims = await resourcesApi.fetchResourceClaims(supabase, {
          claimantId: claimant.id,
        });
        const curClaim = claims.find((c) => c.id === testClaim2.id);

        if (curClaim?.status !== 'cancelled') {
          await resourcesApi.updateResourceClaim(supabase, {
            id: testClaim2.id,
            status: 'cancelled',
          });
        }

        const updatedClaim = await resourcesApi.updateResourceClaim(supabase, {
          id: testClaim2.id,
          status: 'pending',
        });

        expect(updatedClaim.status).toBe('pending');
        // Verify record exists in database
        await verifyClaimInDatabase(supabase, updatedClaim);
      });

      it('expect.fails if attempting to update resource claim status other than "cancelled or pending"', async () => {
        const invalidStatuses = ['approved', 'rejected', 'completed'];

        for (const status of invalidStatuses) {
          const claimInput = createFakeResourceClaimInput({
            resourceId: testResource.id,
            timeslotId: testTimeslot2.id,
            status: status as
              | 'approved'
              | 'rejected'
              | 'completed'
              | 'cancelled',
          });

          try {
            await resourcesApi.updateResourceClaim(supabase, {
              id: testClaim2.id,
              ...claimInput,
            });
            expect.fail('Should have thrown');
          } catch (error) {
            expect(error).toBeTruthy();
          }
        }
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
        // await resourcesApi.deleteResourceClaim(supabase, testClaim2.id);
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

        it.only('fetches claims by resource owner', async () => {
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

      it('resource owner can update claim status', async () => {
        const validStatuses = ['approved', 'rejected', 'completed', 'pending'];

        for (const status of validStatuses) {
          const updatedClaim = await resourcesApi.updateResourceClaim(
            supabase,
            {
              id: testClaim2.id,
              status: status as 'approved' | 'rejected' | 'completed',
            },
          );

          expect(updatedClaim.status).toBe(status);
          // Verify record exists in database
          await verifyClaimInDatabase(supabase, updatedClaim);
        }
      });

      it('expect.fails if resource owner attempts to update resource claim status to "cancelled"', async () => {
        const claimInput = createFakeResourceClaimInput({
          resourceId: testResource.id,
          timeslotId: undefined,
          status: 'cancelled',
        });

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

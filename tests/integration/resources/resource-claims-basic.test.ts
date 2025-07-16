import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
} from '../helpers/test-data';
import { cleanupAllTestData, cleanupResourceClaims } from '../helpers/cleanup';
import * as resourcesApi from '@/features/resources/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import { createFakeResourceClaimInput } from '@/features/resources/__fakes__';
import { Community } from '@/features/communities/types';
import { Resource, ResourceClaim } from '@/features/resources/types';
import { joinCommunity } from '@/features/communities/api';

describe('Resource Claims - Basic Operations', () => {
  let supabase: SupabaseClient<Database>;
  let resourceOwner: User;
  let claimant: User;
  let testCommunity: Community;
  let testResource: Resource;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create resource owner and setup
    resourceOwner = await createTestUser(supabase);

    testCommunity = await createTestCommunity(supabase);
    testResource = await createTestResource(supabase, testCommunity.id);

    // Create user who will make claims
    claimant = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Basic Claim Creation', () => {
    afterEach(async () => {
      await cleanupResourceClaims(testResource.id);
    });

    it('creates resource claim with default "pending" status', async () => {
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
      });
      delete claimInput.status;

      const claim = await resourcesApi.createResourceClaim(
        supabase,
        claimInput,
      );

      expect(claim).toBeTruthy();
      expect(claim).toMatchObject({
        resourceId: testResource.id,
        userId: claimant.id,
        status: 'pending',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      await verifyClaimInDatabase(supabase, claim);
    });

    it('creates resource claim with explictly set "pending" status', async () => {
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: undefined,
        status: 'pending',
      });

      const claim = await resourcesApi.createResourceClaim(
        supabase,
        claimInput,
      );

      expect(claim).toBeTruthy();
      expect(claim).toMatchObject({
        resourceId: testResource.id,
        userId: claimant.id,
        status: 'pending',
        timeslotId: undefined,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      await verifyClaimInDatabase(supabase, claim);
    });

    it('fails if attempting to create resource claim status other than "pending"', async () => {
      const invalidStatuses = [
        'approved',
        'rejected',
        'completed',
        'cancelled',
      ];

      for (const status of invalidStatuses) {
        const claimInput = createFakeResourceClaimInput({
          resourceId: testResource.id,
          timeslotId: undefined,
          status: status as 'approved' | 'rejected' | 'completed' | 'cancelled',
        });

        await expect(
          resourcesApi.createResourceClaim(supabase, claimInput),
        ).rejects.toThrow();
      }
    });
  });

  describe('A claim is already created', () => {
    let claim: ResourceClaim;
    beforeAll(async () => {
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: undefined,
      });

      claim = await resourcesApi.createResourceClaim(supabase, claimInput);
    });

    describe('Fetches a claim', () => {
      it('fetches a single claim', async () => {
        // Fetch all claims for this resource
        const fetchedClaim = await resourcesApi.fetchResourceClaimById(
          supabase,
          claim.id,
        );

        expect(fetchedClaim).toBeTruthy();
        expect(fetchedClaim?.userId).toBe(claimant.id);
        expect(fetchedClaim?.id).toBe(claim.id);
      });

      it('fetches all claims (only one) for a resource', async () => {
        // Fetch all claims for this resource
        const allClaims = await resourcesApi.fetchResourceClaims(supabase, {
          resourceId: testResource.id,
        });

        expect(allClaims).toHaveLength(1);
        expect(allClaims[0].userId).toBe(claimant.id);
        expect(allClaims[0].id).toBe(claim.id);
      });
    });

    it('fails with invalid resource id', async () => {
      const invalidResourceId = 'invalid-resource-id';
      const claimInput = createFakeResourceClaimInput({
        resourceId: invalidResourceId,
        timeslotId: undefined,
        status: 'pending',
      });

      await expect(
        resourcesApi.createResourceClaim(supabase, claimInput),
      ).rejects.toThrow();
    });

    describe('Updating Claims by claim creator', () => {
      it('updates claim status to cancelled', async () => {
        const updatedClaim = await resourcesApi.updateResourceClaim(
          supabase,
          claim.id,
          {
            status: 'cancelled',
          },
        );

        expect(updatedClaim.status).toBe('cancelled');
        // Verify record exists in database
        await verifyClaimInDatabase(supabase, updatedClaim);
      });

      it('updates claim status from "cancelled" to pending', async () => {
        const curClaim = await resourcesApi.fetchResourceClaimById(
          supabase,
          claim.id,
        );
        if (curClaim?.status !== 'cancelled') {
          await resourcesApi.updateResourceClaim(supabase, claim.id, {
            status: 'cancelled',
          });
        }

        const updatedClaim = await resourcesApi.updateResourceClaim(
          supabase,
          claim.id,
          {
            status: 'pending',
          },
        );

        expect(updatedClaim.status).toBe('pending');
        // Verify record exists in database
        await verifyClaimInDatabase(supabase, updatedClaim);
      });

      it('fails if attempting to update resource claim status other than "cancelled or pending"', async () => {
        const invalidStatuses = ['approved', 'rejected', 'completed'];

        for (const status of invalidStatuses) {
          const claimInput = createFakeResourceClaimInput({
            resourceId: testResource.id,
            timeslotId: undefined,
            status: status as
              | 'approved'
              | 'rejected'
              | 'completed'
              | 'cancelled',
          });

          await expect(
            resourcesApi.updateResourceClaim(supabase, claim.id, claimInput),
          ).rejects.toThrow();
        }
      });
    });

    describe('Claim actions by resource owner', () => {
      beforeAll(async () => {
        await signIn(supabase, resourceOwner.email, 'TestPass123!');
      });

      afterAll(async () => {
        await signIn(supabase, claimant.email, 'TestPass123!');
      });

      describe('Fetches a claim', () => {
        it('fetches a single claim', async () => {
          // Fetch all claims for this resource
          const fetchedClaim = await resourcesApi.fetchResourceClaimById(
            supabase,
            claim.id,
          );

          expect(fetchedClaim).toBeTruthy();
          expect(fetchedClaim?.userId).toBe(claimant.id);
          expect(fetchedClaim?.id).toBe(claim.id);
        });

        it('fetches all claims (only one) for a resource', async () => {
          // Fetch all claims for this resource
          const allClaims = await resourcesApi.fetchResourceClaims(supabase, {
            resourceId: testResource.id,
          });

          expect(allClaims).toHaveLength(1);
          expect(allClaims[0].userId).toBe(claimant.id);
          expect(allClaims[0].id).toBe(claim.id);
        });
      });

      it('resource owner can update claim status', async () => {
        const validStatuses = ['approved', 'rejected', 'completed', 'pending'];

        for (const status of validStatuses) {
          const updatedClaim = await resourcesApi.updateResourceClaim(
            supabase,
            claim.id,
            {
              status: status as 'approved' | 'rejected' | 'completed',
            },
          );

          expect(updatedClaim.status).toBe(status);
          // Verify record exists in database
          await verifyClaimInDatabase(supabase, updatedClaim);
        }
      });

      it('fails if resource owner attempts to update resource claim status to "cancelled"', async () => {
        const claimInput = createFakeResourceClaimInput({
          resourceId: testResource.id,
          timeslotId: undefined,
          status: 'cancelled',
        });

        await expect(
          resourcesApi.updateResourceClaim(supabase, claim.id, claimInput),
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
    user_id: claim.userId,
    timeslot_id: claim.timeslotId ?? null,
  });
}

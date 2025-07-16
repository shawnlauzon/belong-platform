import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
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
import {
  createFakeResourceClaimInput,
  createFakeResourceTimeslotInput,
} from '@/features/resources/__fakes__';
import { Community } from '@/features/communities/types';
import { Resource, ResourceTimeslot } from '@/features/resources/types';

describe('Resource Claims - Timeslot Operations', () => {
  let supabase: SupabaseClient<Database>;
  let resourceOwner: User;
  let claimant: User;
  let testCommunity: Community;
  let testResource: Resource;
  let testTimeslot: ResourceTimeslot;
  let secondTimeslot: ResourceTimeslot;
  const createdTimeslots: ResourceTimeslot[] = [];

  beforeAll(async () => {
    supabase = createTestClient();

    // Create resource owner and setup
    resourceOwner = await createTestUser(supabase);
    await signIn(supabase, resourceOwner.email, 'TestPass123!');

    testCommunity = await createTestCommunity(supabase);
    testResource = await createTestResource(supabase, testCommunity.id);

    // Create a test timeslot
    const timeslotInput = createFakeResourceTimeslotInput({
      resourceId: testResource.id,
      startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      maxClaims: 2,
    });

    testTimeslot = await resourcesApi.createResourceTimeslot(
      supabase,
      timeslotInput,
    );
    createdTimeslots.push(testTimeslot);

    // Create second timeslot
    const secondTimeslotInput = createFakeResourceTimeslotInput({
      resourceId: testResource.id,
      startTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
      endTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
      maxClaims: 2,
    });

    secondTimeslot = await resourcesApi.createResourceTimeslot(
      supabase,
      secondTimeslotInput,
    );
    createdTimeslots.push(secondTimeslot);

    // Create user who will make claims
    claimant = await createTestUser(supabase);
  });

  afterEach(async () => {
    await cleanupResourceClaims(testResource.id);
  });

  afterAll(async () => {
    // Clean up created timeslots
    for (const timeslot of createdTimeslots) {
      await resourcesApi.deleteResourceTimeslot(supabase, timeslot.id);
    }
    await cleanupAllTestData();
  });

  describe('Timeslot Claim Creation', () => {
    it('creates resource claim for specific timeslot', async () => {
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: testTimeslot.id,
        status: 'pending',
      });

      const claim = await resourcesApi.createResourceClaim(
        supabase,
        claimInput,
      );

      expect(claim).toBeTruthy();
      expect(claim.resourceId).toBe(testResource.id);
      expect(claim.userId).toBe(claimant.id);
      expect(claim.timeslotId).toBe(testTimeslot.id);
      expect(claim.status).toBe('pending');
      expect(claim.createdAt).toBeInstanceOf(Date);
      expect(claim.updatedAt).toBeInstanceOf(Date);
    });

    it('allows multiple users to claim same timeslot up to max capacity', async () => {
      // First user (claimant) claims timeslot
      const firstClaimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: testTimeslot.id,
        status: 'pending',
      });

      const firstClaim = await resourcesApi.createResourceClaim(
        supabase,
        firstClaimInput,
      );

      const secondUser = await createTestUser(supabase);

      try {
        const secondClaimInput = createFakeResourceClaimInput({
          resourceId: testResource.id,
          timeslotId: testTimeslot.id,
          status: 'pending',
        });

        const secondClaim = await resourcesApi.createResourceClaim(
          supabase,
          secondClaimInput,
        );

        expect(firstClaim.timeslotId).toBe(testTimeslot.id);
        expect(secondClaim.timeslotId).toBe(testTimeslot.id);
        expect(firstClaim.userId).toBe(claimant.id);
        expect(secondClaim.userId).toBe(secondUser.id);
        expect(firstClaim.id).not.toBe(secondClaim.id);
      } finally {
        await signIn(supabase, claimant.email, 'TestPass123!');
      }
    });

    it('allows same user to claim multiple different timeslots', async () => {
      // First claim on first timeslot
      const firstClaimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: testTimeslot.id,
        status: 'pending',
      });

      const firstClaim = await resourcesApi.createResourceClaim(
        supabase,
        firstClaimInput,
      );

      // Second claim on second timeslot by same user
      const secondClaimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: secondTimeslot.id,
        status: 'pending',
      });

      const secondClaim = await resourcesApi.createResourceClaim(
        supabase,
        secondClaimInput,
      );

      expect(firstClaim.userId).toBe(claimant.id);
      expect(secondClaim.userId).toBe(claimant.id);
      expect(firstClaim.timeslotId).toBe(testTimeslot.id);
      expect(secondClaim.timeslotId).toBe(secondTimeslot.id);
      expect(firstClaim.id).not.toBe(secondClaim.id);
    });
  });

  describe('Error Handling', () => {
    it('fails with invalid timeslot id', async () => {
      const invalidTimeslotId = 'invalid-timeslot-id';
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: invalidTimeslotId,
        status: 'pending',
      });

      await expect(
        resourcesApi.createResourceClaim(supabase, claimInput),
      ).rejects.toThrow();
    });
  });
});

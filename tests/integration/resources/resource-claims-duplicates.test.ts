import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
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

describe('Resource Claims - Duplicate Prevention', () => {
  let supabase: SupabaseClient<Database>;
  let resourceOwner: User;
  let claimant: User;
  let testCommunity: Community;
  let testResource: Resource;
  let testTimeslot: ResourceTimeslot;
  let createdTimeslots: ResourceTimeslot[] = [];

  beforeAll(async () => {
    supabase = createTestClient();

    // Create resource owner and setup
    resourceOwner = await createTestUser(supabase);
    await signIn(supabase, resourceOwner.email, 'TestPass123!');

    testCommunity = await createTestCommunity(supabase);
    testResource = await createTestResource(supabase, testCommunity.id);

    // Create user who will make claims
    claimant = await createTestUser(supabase);

    // Create a test timeslot for duplicate testing
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
  });

  beforeEach(async () => {
    // Start each test with claimant signed in
    await signIn(supabase, claimant.email, 'TestPass123!');
  });

  afterEach(async () => {
    await cleanupResourceClaims(testResource.id);
  });

  afterAll(async () => {
    // Clean up created timeslots
    for (const timeslot of createdTimeslots) {
      try {
        await resourcesApi.deleteResourceTimeslot(supabase, timeslot.id);
      } catch (error) {
        // Ignore errors in cleanup
      }
    }
    await cleanupAllTestData();
  });

  describe('Non-Timeslotted Resource Duplicates', () => {
    it('should prevent duplicate claims for non-timeslotted resources', async () => {
      // First claim succeeds
      const firstClaimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: undefined,
        status: 'pending',
      });

      const firstClaim = await resourcesApi.createResourceClaim(
        supabase,
        firstClaimInput,
      );

      expect(firstClaim).toBeTruthy();

      // Second claim by same user should fail
      const secondClaimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: undefined,
        status: 'pending',
      });

      await expect(
        resourcesApi.createResourceClaim(supabase, secondClaimInput),
      ).rejects.toThrow();
    });
  });

  describe('Timeslotted Resource Duplicates', () => {
    it('correctly prevents duplicate claims for same timeslot by same user', async () => {
      // First claim for timeslot succeeds
      const firstClaimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: testTimeslot.id,
        status: 'pending',
      });

      const firstClaim = await resourcesApi.createResourceClaim(
        supabase,
        firstClaimInput,
      );

      expect(firstClaim).toBeTruthy();
      expect(firstClaim.timeslotId).toBe(testTimeslot.id);

      // Second claim for same timeslot by same user should fail
      const secondClaimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: testTimeslot.id,
        status: 'pending',
      });

      await expect(
        resourcesApi.createResourceClaim(supabase, secondClaimInput),
      ).rejects.toThrow();
    });
  });

  describe('Mixed Claims Scenarios', () => {
    it('allows same user to have both timeslotted and non-timeslotted claims for same resource', async () => {
      // Create non-timeslotted claim
      const nonTimeslottedClaimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: undefined,
        status: 'pending',
      });

      await resourcesApi.createResourceClaim(
        supabase,
        nonTimeslottedClaimInput,
      );

      // Create second timeslot first
      const timeslot = await resourcesApi.createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: testResource.id,
          startTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
          endTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
          maxClaims: 5,
        }),
      );

      createdTimeslots.push(timeslot);

      // Create both types of claims
      await resourcesApi.createResourceClaim(
        supabase,
        createFakeResourceClaimInput({
          resourceId: testResource.id,
          timeslotId: undefined,
          status: 'pending',
        }),
      );

      await resourcesApi.createResourceClaim(
        supabase,
        createFakeResourceClaimInput({
          resourceId: testResource.id,
          timeslotId: timeslot.id,
          status: 'pending',
        }),
      );

      // Fetch all claims for this resource
      const allClaims = await resourcesApi.fetchResourceClaims(supabase, {
        resourceId: testResource.id,
      });

      expect(allClaims).toHaveLength(2);
      expect(allClaims.some(claim => claim.timeslotId === undefined)).toBe(true);
      expect(allClaims.some(claim => claim.timeslotId === timeslot.id)).toBe(true);
    });

    it('fetches claims correctly by filtering timeslotted vs non-timeslotted', async () => {
      // Create both types of claims (already tested above this works)
      const timeslot = await resourcesApi.createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: testResource.id,
          startTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
          maxClaims: 5,
        }),
      );

      createdTimeslots.push(timeslot);

      // Create both types of claims
      await resourcesApi.createResourceClaim(
        supabase,
        createFakeResourceClaimInput({
          resourceId: testResource.id,
          timeslotId: undefined,
          status: 'pending',
        }),
      );

      await resourcesApi.createResourceClaim(
        supabase,
        createFakeResourceClaimInput({
          resourceId: testResource.id,
          timeslotId: timeslot.id,
          status: 'pending',
        }),
      );

      // Test filtering
      const allClaims = await resourcesApi.fetchResourceClaims(supabase, {
        resourceId: testResource.id,
      });

      const nonTimeslottedClaims = allClaims.filter(claim => claim.timeslotId === undefined);
      const timeslottedClaims = allClaims.filter(claim => claim.timeslotId !== undefined);

      expect(nonTimeslottedClaims).toHaveLength(1);
      expect(timeslottedClaims).toHaveLength(1);
      expect(timeslottedClaims[0].timeslotId).toBe(timeslot.id);
    });
  });
});
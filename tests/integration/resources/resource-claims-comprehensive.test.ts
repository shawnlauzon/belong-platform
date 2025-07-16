import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData, cleanupResourceClaims } from '../helpers/cleanup';
import * as resourcesApi from '@/features/resources/api';
import { signIn } from '@/features/auth/api';
import { ResourceTimeslot } from '@/features/resources/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import {
  createFakeResourceClaimInput,
  createFakeResourceTimeslotInput,
} from '@/features/resources/__fakes__';
import { Community } from '@/features/communities/types';
import { Resource } from '@/features/resources/types';

describe('Resources API - Comprehensive Claims Testing', () => {
  // NOTE: This test suite demonstrates the difference between timeslotted and non-timeslotted resources
  // CURRENT STATE: Unique constraint works correctly for timeslotted resources but allows duplicates for non-timeslotted resources
  // INCLUDES: Test showing the bug for non-timeslotted resources and a skipped test for the expected behavior after fix

  let supabase: SupabaseClient<Database>;
  let resourceOwner: User;
  let communityMember: User;
  let testCommunity: Community;
  let testResource: Resource;
  let createdTimeslots: ResourceTimeslot[] = [];

  beforeAll(async () => {
    supabase = createTestClient();

    // Create resource owner and setup
    resourceOwner = await createTestUser(supabase);
    await signIn(supabase, resourceOwner.email, 'TestPass123!');

    testCommunity = await createTestCommunity(supabase);
    testResource = await createTestResource(supabase, testCommunity.id);

    // Create community member who will respond to resources
    communityMember = await createTestUser(supabase);
    await signIn(supabase, communityMember.email, 'TestPass123!');
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  afterEach(async () => {
    await cleanupResourceClaims(testResource.id);

    // Clean up created timeslots
    for (const timeslot of createdTimeslots) {
      try {
        await resourcesApi.deleteResourceTimeslot(supabase, timeslot.id);
      } catch (error) {
        // Ignore errors in cleanup
      }
    }
    createdTimeslots = [];
  });

  describe('Non-Timeslotted Resource Claims', () => {
    // Tests for basic resource claims without timeslots (timeslotId = null)

    it('creates resource claim with default "pending" status', async () => {
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        userId: communityMember.id,
        timeslotId: undefined, // No timeslot for basic resource claim
        status: 'pending', // Default status
      });

      const claim = await resourcesApi.createResourceClaim(
        supabase,
        claimInput,
      );

      expect(claim).toBeTruthy();
      expect(claim.resourceId).toBe(testResource.id);
      expect(claim.userId).toBe(communityMember.id);
      expect(claim.status).toBe('pending');
      expect(claim.timeslotId).toBeUndefined();
      expect(claim.createdAt).toBeInstanceOf(Date);
      expect(claim.updatedAt).toBeInstanceOf(Date);

      // Verify record exists in database
      const { data: dbRecord } = await supabase
        .from('resource_claims')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', communityMember.id)
        .maybeSingle();

      expect(dbRecord).toBeTruthy();
      expect(dbRecord!.status).toBe('pending');
      expect(dbRecord!.timeslot_id).toBeNull();
    });

    it('creates resource claim with "approved" status', async () => {
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        userId: communityMember.id,
        timeslotId: undefined, // No timeslot for basic resource claim
        status: 'approved',
      });

      const claim = await resourcesApi.createResourceClaim(
        supabase,
        claimInput,
      );

      expect(claim).toBeTruthy();
      expect(claim.resourceId).toBe(testResource.id);
      expect(claim.userId).toBe(communityMember.id);
      expect(claim.status).toBe('approved');
      expect(claim.timeslotId).toBeUndefined();

      // Verify record exists in database
      const { data: dbRecord } = await supabase
        .from('resource_claims')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', communityMember.id)
        .maybeSingle();

      expect(dbRecord).toBeTruthy();
      expect(dbRecord!.status).toBe('approved');
      expect(dbRecord!.timeslot_id).toBeNull();
    });

    it('should prevent duplicate claims for non-timeslotted resources', async () => {
      // This test should be enabled once the constraint is fixed
      // It demonstrates the expected behavior after the fix

      // First claim
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        userId: communityMember.id,
        timeslotId: undefined, // No timeslot for basic resource claim
        status: 'pending',
      });
      const firstClaim = await resourcesApi.createResourceClaim(
        supabase,
        claimInput,
      );

      // Second claim with same resource and user but null timeslot
      // EXPECTED BEHAVIOR: This should fail due to unique constraint
      await expect(
        resourcesApi.createResourceClaim(supabase, claimInput),
      ).rejects.toThrow();

      // Verify that only one claim exists
      const allClaims = await resourcesApi.fetchResourceClaims(supabase, {
        resourceId: testResource.id,
        userId: communityMember.id,
      });

      expect(allClaims.length).toBe(1);
      expect(allClaims[0].timeslotId).toBeUndefined();
      expect(allClaims[0].resourceId).toBe(testResource.id);
      expect(allClaims[0].userId).toBe(communityMember.id);
      expect(allClaims[0].id).toBe(firstClaim.id);
    });

    it('allows multiple users to claim same non-timeslotted resource', async () => {
      // Create second user
      const secondUser = await createTestUser(supabase);
      await signIn(supabase, secondUser.email, 'TestPass123!');

      // First user claims resource
      const firstClaimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        userId: communityMember.id,
        timeslotId: undefined, // No timeslot for basic resource claim
        status: 'pending',
      });

      const firstClaim = await resourcesApi.createResourceClaim(
        supabase,
        firstClaimInput,
      );

      // Second user claims same resource - should succeed
      const secondClaimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        userId: secondUser.id,
        timeslotId: undefined, // No timeslot for basic resource claim
        status: 'pending',
      });

      const secondClaim = await resourcesApi.createResourceClaim(
        supabase,
        secondClaimInput,
      );

      expect(firstClaim.resourceId).toBe(testResource.id);
      expect(secondClaim.resourceId).toBe(testResource.id);
      expect(firstClaim.userId).toBe(communityMember.id);
      expect(secondClaim.userId).toBe(secondUser.id);
      expect(firstClaim.timeslotId).toBeUndefined();
      expect(secondClaim.timeslotId).toBeUndefined();
      expect(firstClaim.id).not.toBe(secondClaim.id);
    });

    it('allows status change from pending to approved via update', async () => {
      // First create claim as 'pending'
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        userId: communityMember.id,
        timeslotId: undefined, // No timeslot for basic resource claim
        status: 'pending',
      });
      const firstClaim = await resourcesApi.createResourceClaim(
        supabase,
        claimInput,
      );
      expect(firstClaim.status).toBe('pending');

      // Change to 'approved' via update
      const updatedClaim = await resourcesApi.updateResourceClaim(
        supabase,
        firstClaim.id,
        {
          status: 'approved',
        },
      );
      expect(updatedClaim?.status).toBe('approved');
      expect(updatedClaim?.resourceId).toBe(testResource.id);
      expect(updatedClaim?.userId).toBe(communityMember.id);
      expect(updatedClaim?.timeslotId).toBeUndefined();

      // Verify only one record exists with updated status
      const { data: dbRecords } = await supabase
        .from('resource_claims')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', communityMember.id);

      expect(dbRecords).toHaveLength(1);
      expect(dbRecords![0].status).toBe('approved');
    });

    it('allows status change from approved to completed via update', async () => {
      // First create claim as 'approved'
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        userId: communityMember.id,
        timeslotId: undefined, // No timeslot for basic resource claim
        status: 'approved',
      });
      const firstClaim = await resourcesApi.createResourceClaim(
        supabase,
        claimInput,
      );
      expect(firstClaim.status).toBe('approved');

      // Change to 'completed' via update
      const updatedClaim = await resourcesApi.updateResourceClaim(
        supabase,
        firstClaim.id,
        {
          status: 'completed',
        },
      );
      expect(updatedClaim?.status).toBe('completed');
      expect(updatedClaim?.resourceId).toBe(testResource.id);
      expect(updatedClaim?.userId).toBe(communityMember.id);
      expect(updatedClaim?.timeslotId).toBeUndefined();

      // Verify only one record exists with updated status
      const { data: dbRecords } = await supabase
        .from('resource_claims')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', communityMember.id);

      expect(dbRecords).toHaveLength(1);
      expect(dbRecords![0].status).toBe('completed');
    });

    it('fails with invalid resource id', async () => {
      const claimInput = createFakeResourceClaimInput({
        resourceId: 'invalid-resource-id',
        userId: communityMember.id,
        timeslotId: undefined, // No timeslot for basic resource claim
        status: 'pending',
      });
      await expect(
        resourcesApi.createResourceClaim(supabase, claimInput),
      ).rejects.toThrow();
    });

    it('resource owner can claim own resource (for coordination)', async () => {
      // Switch to resource owner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      try {
        const claimInput = createFakeResourceClaimInput({
          resourceId: testResource.id,
          userId: resourceOwner.id,
          timeslotId: undefined, // No timeslot for basic resource claim
          status: 'pending',
        });
        const claim = await resourcesApi.createResourceClaim(
          supabase,
          claimInput,
        );
        expect(claim.userId).toBe(resourceOwner.id);
        expect(claim.resourceId).toBe(testResource.id);
        expect(claim.timeslotId).toBeUndefined();
      } finally {
        // Switch back to community member
        await signIn(supabase, communityMember.email, 'TestPass123!');
      }
    });
  });

  describe('Timeslotted Resource Claims', () => {
    // Tests for resource claims with specific timeslots (timeslotId != null)
    let testTimeslot: ResourceTimeslot;

    beforeEach(async () => {
      // Create a timeslot for each test
      const startTime = new Date(Date.now() + 86400000); // Tomorrow
      const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later

      const timeslotInput = createFakeResourceTimeslotInput({
        resourceId: testResource.id,
        startTime,
        endTime,
        maxClaims: 5,
      });

      testTimeslot = await resourcesApi.createResourceTimeslot(
        supabase,
        timeslotInput,
      );
      createdTimeslots.push(testTimeslot);
    });

    it('creates resource claim for specific timeslot', async () => {
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        userId: communityMember.id,
        timeslotId: testTimeslot.id,
        status: 'pending',
      });

      const claim = await resourcesApi.createResourceClaim(
        supabase,
        claimInput,
      );

      expect(claim).toBeTruthy();
      expect(claim.resourceId).toBe(testResource.id);
      expect(claim.userId).toBe(communityMember.id);
      expect(claim.timeslotId).toBe(testTimeslot.id);
      expect(claim.status).toBe('pending');
      expect(claim.createdAt).toBeInstanceOf(Date);
      expect(claim.updatedAt).toBeInstanceOf(Date);

      // Verify record exists in database
      const { data: dbRecord } = await supabase
        .from('resource_claims')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', communityMember.id)
        .eq('timeslot_id', testTimeslot.id)
        .single();

      expect(dbRecord).toBeTruthy();
      expect(dbRecord!.status).toBe('pending');
      expect(dbRecord!.timeslot_id).toBe(testTimeslot.id);
    });

    it('correctly prevents duplicate claims for same timeslot by same user', async () => {
      // This test shows that the constraint DOES work correctly for timeslotted resources
      // because timeslot_id is not NULL, so the unique constraint can properly enforce uniqueness

      // Create first claim for this timeslot
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        userId: communityMember.id,
        timeslotId: testTimeslot.id,
        status: 'pending',
      });

      const firstClaim = await resourcesApi.createResourceClaim(
        supabase,
        claimInput,
      );

      expect(firstClaim.timeslotId).toBe(testTimeslot.id);

      // Try to create second claim for same timeslot by same user - should fail
      // This works correctly because timeslot_id is not NULL, so the unique constraint
      // UNIQUE(resource_id, user_id, timeslot_id) properly prevents duplicates
      await expect(
        resourcesApi.createResourceClaim(supabase, claimInput),
      ).rejects.toThrow();
    });

    it('allows multiple users to claim same timeslot up to max capacity', async () => {
      // Create second user
      const secondUser = await createTestUser(supabase);
      await signIn(supabase, secondUser.email, 'TestPass123!');

      // First user claims timeslot
      const firstClaimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        userId: communityMember.id,
        timeslotId: testTimeslot.id,
        status: 'pending',
      });

      const firstClaim = await resourcesApi.createResourceClaim(
        supabase,
        firstClaimInput,
      );

      // Second user claims same timeslot - should succeed
      const secondClaimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        userId: secondUser.id,
        timeslotId: testTimeslot.id,
        status: 'pending',
      });

      const secondClaim = await resourcesApi.createResourceClaim(
        supabase,
        secondClaimInput,
      );

      expect(firstClaim.timeslotId).toBe(testTimeslot.id);
      expect(secondClaim.timeslotId).toBe(testTimeslot.id);
      expect(firstClaim.userId).toBe(communityMember.id);
      expect(secondClaim.userId).toBe(secondUser.id);
      expect(firstClaim.id).not.toBe(secondClaim.id);
    });

    it('allows same user to claim multiple different timeslots', async () => {
      // Create second timeslot
      const startTime2 = new Date(Date.now() + 172800000); // Day after tomorrow
      const endTime2 = new Date(startTime2.getTime() + 3600000); // 1 hour later

      const secondTimeslot = await resourcesApi.createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: testResource.id,
          startTime: startTime2,
          endTime: endTime2,
          maxClaims: 5,
        }),
      );

      createdTimeslots.push(secondTimeslot);

      // User claims first timeslot
      const firstClaimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        userId: communityMember.id,
        timeslotId: testTimeslot.id,
        status: 'pending',
      });

      const firstClaim = await resourcesApi.createResourceClaim(
        supabase,
        firstClaimInput,
      );

      // Same user claims second timeslot - should succeed
      const secondClaimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        userId: communityMember.id,
        timeslotId: secondTimeslot.id,
        status: 'pending',
      });

      const secondClaim = await resourcesApi.createResourceClaim(
        supabase,
        secondClaimInput,
      );

      expect(firstClaim.timeslotId).toBe(testTimeslot.id);
      expect(secondClaim.timeslotId).toBe(secondTimeslot.id);
      expect(firstClaim.userId).toBe(communityMember.id);
      expect(secondClaim.userId).toBe(communityMember.id);
      expect(firstClaim.id).not.toBe(secondClaim.id);
    });

    it('allows status updates for timeslot-based claims', async () => {
      // Create claim for this timeslot
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        userId: communityMember.id,
        timeslotId: testTimeslot.id,
        status: 'pending',
      });

      const claim = await resourcesApi.createResourceClaim(
        supabase,
        claimInput,
      );

      expect(claim.status).toBe('pending');

      // Update claim status to approved
      const updatedClaim = await resourcesApi.updateResourceClaim(
        supabase,
        claim.id,
        {
          status: 'approved',
        },
      );

      expect(updatedClaim?.status).toBe('approved');
      expect(updatedClaim?.timeslotId).toBe(testTimeslot.id);
      expect(updatedClaim?.resourceId).toBe(testResource.id);
      expect(updatedClaim?.userId).toBe(communityMember.id);

      // Verify database record has been updated
      const { data: dbRecord } = await supabase
        .from('resource_claims')
        .select('*')
        .eq('id', claim.id)
        .single();

      expect(dbRecord).toBeTruthy();
      expect(dbRecord!.status).toBe('approved');
      expect(dbRecord!.timeslot_id).toBe(testTimeslot.id);
    });

    it('fails with invalid timeslot id', async () => {
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        userId: communityMember.id,
        timeslotId: 'invalid-timeslot-id',
        status: 'pending',
      });
      await expect(
        resourcesApi.createResourceClaim(supabase, claimInput),
      ).rejects.toThrow();
    });
  });

  describe('Mixed Claims Scenarios', () => {
    // Tests that demonstrate the interaction between timeslotted and non-timeslotted claims

    it('allows same user to have both timeslotted and non-timeslotted claims for same resource', async () => {
      // Create a timeslot
      const startTime = new Date(Date.now() + 86400000); // Tomorrow
      const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later

      const timeslot = await resourcesApi.createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: testResource.id,
          startTime,
          endTime,
          maxClaims: 5,
        }),
      );

      createdTimeslots.push(timeslot);

      // User makes a non-timeslotted claim
      const nonTimeslottedClaimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        userId: communityMember.id,
        timeslotId: undefined, // No timeslot
        status: 'pending',
      });

      const nonTimeslottedClaim = await resourcesApi.createResourceClaim(
        supabase,
        nonTimeslottedClaimInput,
      );

      // Same user makes a timeslotted claim - should succeed
      const timeslottedClaimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        userId: communityMember.id,
        timeslotId: timeslot.id,
        status: 'pending',
      });

      const timeslottedClaim = await resourcesApi.createResourceClaim(
        supabase,
        timeslottedClaimInput,
      );

      expect(nonTimeslottedClaim.timeslotId).toBeUndefined();
      expect(timeslottedClaim.timeslotId).toBe(timeslot.id);
      expect(nonTimeslottedClaim.userId).toBe(communityMember.id);
      expect(timeslottedClaim.userId).toBe(communityMember.id);
      expect(nonTimeslottedClaim.id).not.toBe(timeslottedClaim.id);
    });

    it('fetches claims correctly by filtering timeslotted vs non-timeslotted', async () => {
      // Create a timeslot
      const startTime = new Date(Date.now() + 86400000); // Tomorrow
      const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later

      const timeslot = await resourcesApi.createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: testResource.id,
          startTime,
          endTime,
          maxClaims: 5,
        }),
      );

      createdTimeslots.push(timeslot);

      // Create both types of claims
      const nonTimeslottedClaim = await resourcesApi.createResourceClaim(
        supabase,
        createFakeResourceClaimInput({
          resourceId: testResource.id,
          userId: communityMember.id,
          timeslotId: undefined,
          status: 'pending',
        }),
      );

      const timeslottedClaim = await resourcesApi.createResourceClaim(
        supabase,
        createFakeResourceClaimInput({
          resourceId: testResource.id,
          userId: communityMember.id,
          timeslotId: timeslot.id,
          status: 'pending',
        }),
      );

      // Fetch all claims for this resource
      const allClaims = await resourcesApi.fetchResourceClaims(supabase, {
        resourceId: testResource.id,
      });

      expect(allClaims).toHaveLength(2);
      expect(allClaims.some((c) => c.timeslotId === undefined)).toBe(true);
      expect(allClaims.some((c) => c.timeslotId === timeslot.id)).toBe(true);

      // Fetch claims for specific timeslot
      const timeslottedClaims = await resourcesApi.fetchResourceClaims(
        supabase,
        {
          timeslotId: timeslot.id,
        },
      );

      expect(timeslottedClaims).toHaveLength(1);
      expect(timeslottedClaims[0].timeslotId).toBe(timeslot.id);
    });
  });
});

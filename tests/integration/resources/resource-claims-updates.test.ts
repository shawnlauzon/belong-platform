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

describe('Resource Claims - Status Updates', () => {
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

    // Create a test timeslot for update testing
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

  describe('Non-Timeslotted Claim Updates', () => {
    it('allows status change from pending to approved via update', async () => {
      // Create initial claim
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: undefined,
        status: 'pending',
      });

      const createdClaim = await resourcesApi.createResourceClaim(
        supabase,
        claimInput,
      );

      expect(createdClaim.status).toBe('pending');

      // Update status to approved
      const updatedClaim = await resourcesApi.updateResourceClaim(
        supabase,
        createdClaim.id,
        { status: 'approved' },
      );

      expect(updatedClaim).toBeTruthy();
      if (updatedClaim) {
        expect(updatedClaim.id).toBe(createdClaim.id);
        expect(updatedClaim.status).toBe('approved');
        expect(updatedClaim.resourceId).toBe(testResource.id);
        expect(updatedClaim.userId).toBe(claimant.id);
        expect(updatedClaim.timeslotId).toBeUndefined();

        // Verify database record has been updated with all expected fields
        const { data: dbRecord } = await supabase
          .from('resource_claims')
          .select()
          .eq('id', createdClaim.id)
          .single();

        expect(dbRecord).toBeTruthy();
        expect(dbRecord?.status).toBe('approved');
      }
    });

    it('allows status change from approved to completed via update', async () => {
      // Create initial claim
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: undefined,
        status: 'approved',
      });

      const createdClaim = await resourcesApi.createResourceClaim(
        supabase,
        claimInput,
      );

      expect(createdClaim.status).toBe('approved');

      // Update status to completed
      const updatedClaim = await resourcesApi.updateResourceClaim(
        supabase,
        createdClaim.id,
        { status: 'completed' },
      );

      expect(updatedClaim).toBeTruthy();
      if (updatedClaim) {
        expect(updatedClaim.id).toBe(createdClaim.id);
        expect(updatedClaim.status).toBe('completed');
        expect(updatedClaim.resourceId).toBe(testResource.id);
        expect(updatedClaim.userId).toBe(claimant.id);

        // Verify database record has been updated with all expected fields
        const { data: dbRecord } = await supabase
          .from('resource_claims')
          .select()
          .eq('id', createdClaim.id)
          .single();

        expect(dbRecord).toBeTruthy();
        expect(dbRecord?.status).toBe('completed');
      }
    });
  });

  describe('Timeslotted Claim Updates', () => {
    it('allows status updates for timeslot-based claims', async () => {
      // Create initial timeslot claim
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: testTimeslot.id,
        status: 'pending',
      });

      const createdClaim = await resourcesApi.createResourceClaim(
        supabase,
        claimInput,
      );

      expect(createdClaim.status).toBe('pending');
      expect(createdClaim.timeslotId).toBe(testTimeslot.id);

      // Update status to approved
      const updatedClaim = await resourcesApi.updateResourceClaim(
        supabase,
        createdClaim.id,
        { status: 'approved' },
      );

      expect(updatedClaim).toBeTruthy();
      if (updatedClaim) {
        expect(updatedClaim.id).toBe(createdClaim.id);
        expect(updatedClaim.status).toBe('approved');
        expect(updatedClaim.timeslotId).toBe(testTimeslot.id);
        expect(updatedClaim.userId).toBe(claimant.id);

        // Verify database record
        const { data: dbRecord } = await supabase
          .from('resource_claims')
          .select()
          .eq('id', createdClaim.id)
          .single();

        expect(dbRecord).toBeTruthy();
        expect(dbRecord?.status).toBe('approved');
        expect(dbRecord?.timeslot_id).toBe(testTimeslot.id);
      }
    });
  });

  describe('Update Error Handling', () => {
    it('handles updates for non-existent claims gracefully', async () => {
      const nonExistentClaimId = 'non-existent-claim-id';

      const result = await resourcesApi.updateResourceClaim(
        supabase,
        nonExistentClaimId,
        { status: 'approved' },
      );

      // Should return null for non-existent claims
      expect(result).toBeNull();
    });
  });
});
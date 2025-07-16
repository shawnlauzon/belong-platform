import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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
import { Resource } from '@/features/resources/types';

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
    await signIn(supabase, resourceOwner.email, 'TestPass123!');

    testCommunity = await createTestCommunity(supabase);
    testResource = await createTestResource(supabase, testCommunity.id);

    // Create user who will make claims
    claimant = await createTestUser(supabase);
  });

  beforeEach(async () => {
    // Start each test with claimant signed in
    await signIn(supabase, claimant.email, 'TestPass123!');
  });

  afterEach(async () => {
    await cleanupResourceClaims(testResource.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Basic Claim Creation', () => {
    it('creates resource claim with default "pending" status', async () => {
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
      expect(claim.resourceId).toBe(testResource.id);
      expect(claim.userId).toBe(claimant.id);
      expect(claim.status).toBe('pending');
      expect(claim.timeslotId).toBeUndefined();
      expect(claim.createdAt).toBeInstanceOf(Date);
      expect(claim.updatedAt).toBeInstanceOf(Date);

      // Verify record exists in database
      const { data: dbRecord } = await supabase
        .from('resource_claims')
        .select()
        .eq('id', claim.id)
        .single();

      expect(dbRecord).toBeTruthy();
      expect(dbRecord?.user_id).toBe(claimant.id);
      expect(dbRecord?.resource_id).toBe(testResource.id);
      expect(dbRecord?.status).toBe('pending');
    });

    it('creates resource claim with "approved" status', async () => {
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: undefined,
        status: 'approved',
      });

      const claim = await resourcesApi.createResourceClaim(
        supabase,
        claimInput,
      );

      expect(claim).toBeTruthy();
      expect(claim.resourceId).toBe(testResource.id);
      expect(claim.userId).toBe(claimant.id);
      expect(claim.status).toBe('approved');
      expect(claim.timeslotId).toBeUndefined();
      expect(claim.createdAt).toBeInstanceOf(Date);
      expect(claim.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Fetching Claims', () => {
    it('fetches all claims for a resource', async () => {
      // Create a claim first
      const claimInput = createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: undefined,
        status: 'pending',
      });

      const firstClaim = await resourcesApi.createResourceClaim(
        supabase,
        claimInput,
      );

      // Fetch all claims for this resource
      const allClaims = await resourcesApi.fetchResourceClaims(supabase, {
        resourceId: testResource.id,
      });

      expect(allClaims).toHaveLength(1);
      expect(allClaims[0].userId).toBe(claimant.id);
      expect(allClaims[0].id).toBe(firstClaim.id);
    });
  });

  describe('Error Handling', () => {
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
  });
});
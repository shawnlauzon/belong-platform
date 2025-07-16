/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
} from '../helpers/test-data';
import { cleanupAllTestData, cleanupResourceClaims } from '../helpers/cleanup';
import * as resourcesApi from '@/features/resources/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import {
  createFakeResourceClaimInput,
  createFakeResourceTimeslotInput,
} from '@/features/resources/__fakes__';
import { Community } from '@/features/communities/types';
import { Resource, ResourceTimeslot } from '@/features/resources/types';

describe('Resource Claims - Open Time', () => {
  let supabase: SupabaseClient<Database>;
  let resourceOwner: User;
  let claimant: User;
  let testCommunity: Community;
  let testResource: Resource;
  let testTimeslot: ResourceTimeslot;
  const createdTimeslots: ResourceTimeslot[] = [];

  beforeAll(async () => {
    supabase = createTestClient();

    // Create resource owner and setup
    resourceOwner = await createTestUser(supabase);

    testCommunity = await createTestCommunity(supabase);
    testResource = await createTestResource(supabase, testCommunity.id);

    // Create user who will make claims
    claimant = await createTestUser(supabase);
  });

  afterEach(async () => {
    await cleanupResourceClaims(testResource.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

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

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
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
import {
  Resource,
  ResourceClaim,
  ResourceTimeslot,
} from '@/features/resources/types';
import { joinCommunity } from '@/features/communities/api';

describe('Resource Claims - Timeslot Operations', () => {
  let supabase: SupabaseClient<Database>;
  let resourceOwner: User;
  let claimant: User;
  let testCommunity: Community;
  let testResource: Resource;
  let testTimeslot: ResourceTimeslot;
  let secondTimeslot: ResourceTimeslot;

  let firstClaim: ResourceClaim | null = null;
  let secondClaim: ResourceClaim | null = null;
  let secondClaimUser: User | null = null;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create resource owner and setup
    resourceOwner = await createTestUser(supabase);
    await signIn(supabase, resourceOwner.email, 'TestPass123!');

    testCommunity = await createTestCommunity(supabase);
    testResource = await createTestResource(supabase, testCommunity.id);

    // Create a test timeslot
    testTimeslot = await resourcesApi.createResourceTimeslot(
      supabase,
      createFakeResourceTimeslotInput({
        resourceId: testResource.id,
        startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        maxClaims: 2,
      }),
    );

    secondTimeslot = await resourcesApi.createResourceTimeslot(
      supabase,
      createFakeResourceTimeslotInput({
        resourceId: testResource.id,
        startTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
        maxClaims: 2,
      }),
    );

    // Create user who will make claims
    claimant = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  afterEach(async () => {
    await signIn(supabase, claimant.email, 'TestPass123!');
    if (firstClaim) {
      await resourcesApi.deleteResourceClaim(supabase, firstClaim.id);
      firstClaim = null;
    }
    if (secondClaim) {
      if (secondClaimUser && secondClaimUser !== claimant) {
        await signIn(supabase, secondClaimUser.email, 'TestPass123!');
      }

      await resourcesApi.deleteResourceClaim(supabase, secondClaim.id);
      secondClaim = null;

      if (secondClaimUser && secondClaimUser !== claimant) {
        await signIn(supabase, claimant.email, 'TestPass123!');
        secondClaimUser = null;
      }
    }

    // wait
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  it('allows multiple users to claim same timeslot up to max capacity', async () => {
    firstClaim = await resourcesApi.createResourceClaim(
      supabase,
      createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: testTimeslot.id,
      }),
    );

    secondClaimUser = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);

    secondClaim = await resourcesApi.createResourceClaim(
      supabase,
      createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: testTimeslot.id,
      }),
    );

    expect(firstClaim.timeslotId).toBe(testTimeslot.id);
    expect(secondClaim.timeslotId).toBe(testTimeslot.id);
    expect(firstClaim.userId).toBe(claimant.id);
    expect(secondClaim.userId).toBe(secondClaimUser.id);
    expect(firstClaim.id).not.toBe(secondClaim.id);
  });

  it('allows same user to claim multiple different timeslots', async () => {
    firstClaim = await resourcesApi.createResourceClaim(
      supabase,
      createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: testTimeslot.id,
      }),
    );

    // Second claim on second timeslot by same user
    secondClaim = await resourcesApi.createResourceClaim(
      supabase,
      createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: secondTimeslot.id,
      }),
    );

    expect(firstClaim.userId).toBe(claimant.id);
    expect(secondClaim.userId).toBe(claimant.id);
    expect(firstClaim.timeslotId).toBe(testTimeslot.id);
    expect(secondClaim.timeslotId).toBe(secondTimeslot.id);
    expect(firstClaim.id).not.toBe(secondClaim.id);
  });

  it('correctly prevents duplicate claims for same timeslot by same user', async () => {
    // First claim for timeslot succeeds
    firstClaim = await resourcesApi.createResourceClaim(
      supabase,
      createFakeResourceClaimInput({
        resourceId: testResource.id,
        timeslotId: testTimeslot.id,
      }),
    );

    expect(firstClaim).toBeTruthy();
    expect(firstClaim.timeslotId).toBe(testTimeslot.id);

    // Second claim for same timeslot by same user should fail
    await expect(
      resourcesApi.createResourceClaim(
        supabase,
        createFakeResourceClaimInput({
          resourceId: testResource.id,
          timeslotId: testTimeslot.id,
        }),
      ),
    ).rejects.toThrow();
  });

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

  it('requires a timestot for timeslotted resources', async () => {
    const claimInput = createFakeResourceClaimInput({
      resourceId: testResource.id,
      timeslotId: undefined,
      status: 'pending',
    });

    await expect(
      resourcesApi.createResourceClaim(supabase, claimInput),
    ).rejects.toThrow();
  });
});

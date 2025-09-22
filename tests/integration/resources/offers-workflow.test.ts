import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  createTestResourceTimeslot,
} from '../helpers/test-data';
import { signIn } from '@/features/auth/api';
import { joinCommunity } from '@/features/communities/api';
import {
  createResourceClaim,
  updateResourceClaim,
} from '@/features/resources/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities/types';
import type { Resource, ResourceTimeslot } from '@/features/resources/types';

describe('Resource Offers - Workflow', () => {
  let supabase: SupabaseClient<Database>;
  let owner: Account;
  let claimant: Account;
  let community: Community;
  let offer: Resource;
  let timeslot: ResourceTimeslot;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create owner (automatically signed in)
    owner = await createTestUser(supabase);

    // Create community (owner automatically becomes member)
    community = await createTestCommunity(supabase);

    // Create offer and timeslot while owner is signed in
    offer = await createTestResource(supabase, community.id, 'offer');
    timeslot = await createTestResourceTimeslot(supabase, offer.id);

    // Create claimant (automatically signed in as claimant now)
    claimant = await createTestUser(supabase);

    // Claimant joins community
    await joinCommunity(supabase, community.id);
  });

  beforeEach(async () => {
    // At end of beforeEach: claimant is signed in
    await signIn(supabase, claimant.email, 'TestPass123!');
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it('should create resource offer', async () => {
    expect(offer.id).toBeDefined();
    expect(offer.type).toBe('offer');
  });

  it('should allow claiming offer without approval and start in approved state', async () => {
    // Claimant is already signed in from beforeEach
    const claim = await createResourceClaim(supabase, {
      resourceId: offer.id,
      timeslotId: timeslot.id,
    });

    expect(claim.id).toBeDefined();
    expect(claim.status).toBe('approved'); // Should start approved since offer doesn't require approval
  });

  it('should allow owner to mark as given', async () => {
    // Create fresh timeslot for this test
    const freshTimeslot = await createTestResourceTimeslot(supabase, offer.id);

    // Claimant is already signed in from beforeEach
    const claim = await createResourceClaim(supabase, {
      resourceId: offer.id,
      timeslotId: freshTimeslot.id,
    });

    await signIn(supabase, owner.email, 'TestPass123!');
    const updatedClaim = await updateResourceClaim(supabase, {
      id: claim.id,
      status: 'given',
    });

    expect(updatedClaim.status).toBe('given');
  });

  it('should allow resource owner to mark as given from approved state', async () => {
    // Create fresh timeslot for this test
    const freshTimeslot = await createTestResourceTimeslot(supabase, offer.id);

    // Use shared data from beforeEach
    const claim = await createResourceClaim(supabase, {
      resourceId: offer.id,
      timeslotId: freshTimeslot.id,
    });

    // Switch to resource owner to mark as given
    await signIn(supabase, owner.email, 'TestPass123!');

    // For offers: resource owner can mark as given directly from approved
    const updatedClaim = await updateResourceClaim(supabase, {
      id: claim.id,
      status: 'given',
    });

    expect(updatedClaim.status).toBe('given');
  });
});

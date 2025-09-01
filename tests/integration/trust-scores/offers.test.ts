import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest';
import { createTestClient, createServiceClient } from '../helpers/test-client';
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
  deleteResourceClaim,
  updateResourceClaim,
} from '@/features/resources/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import {
  POINTS_CONFIG,
  getCurrentTrustScore,
  verifyTrustScoreLog,
} from './helpers';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';
import type {
  Resource,
  ResourceTimeslot,
  ResourceClaim,
} from '@/features/resources/types';

describe('Trust Score Points - Offers', () => {
  let supabase: SupabaseClient<Database>;
  let serviceClient: SupabaseClient<Database>;
  let owner: User;
  let claimant: User;
  let community: Community;
  let offer: Resource;
  let timeslot: ResourceTimeslot;
  let testClaim: ResourceClaim | null = null;

  beforeAll(async () => {
    supabase = createTestClient();
    serviceClient = createServiceClient();

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

  afterEach(async () => {
    if (testClaim) {
      await deleteResourceClaim(supabase, testClaim.id);
    }
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it('should award points for creating offer', async () => {
    // Switch to owner context to check their points
    await signIn(supabase, owner.email, 'TestPass123!');

    const scoreAfterCommunity = await getCurrentTrustScore(
      supabase,
      owner.id,
      community.id,
    );

    await createTestResource(supabase, community.id, 'offer');

    const scoreAfterOffer = await getCurrentTrustScore(
      supabase,
      owner.id,
      community.id,
    );
    expect(scoreAfterOffer - scoreAfterCommunity).toBe(
      POINTS_CONFIG.RESOURCE_OFFER,
    );
  });

  it('should log offer creation action', async () => {
    // Switch to owner context to create another offer
    await signIn(supabase, owner.email, 'TestPass123!');

    await createTestResource(supabase, community.id, 'offer');

    await verifyTrustScoreLog(
      serviceClient,
      owner.id,
      community.id,
      'resource_offer',
      POINTS_CONFIG.RESOURCE_OFFER,
      'Resource offer creation log',
    );
  });

  it('should not award points for creating request', async () => {
    // Switch to owner context
    await signIn(supabase, owner.email, 'TestPass123!');

    const scoreAfterCommunity = await getCurrentTrustScore(
      supabase,
      owner.id,
      community.id,
    );

    await createTestResource(supabase, community.id, 'request');

    const scoreAfterRequest = await getCurrentTrustScore(
      supabase,
      owner.id,
      community.id,
    );
    expect(scoreAfterRequest - scoreAfterCommunity).toBe(0);
  });

  it('should award points for claiming offer', async () => {
    // Claimant is already signed in from beforeEach

    const scoreBeforeClaim = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );

    testClaim = await createResourceClaim(supabase, {
      resourceId: offer.id,
      timeslotId: timeslot.id,
    });

    const scoreAfterClaim = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );
    expect(scoreAfterClaim - scoreBeforeClaim).toBe(
      POINTS_CONFIG.OFFER_APPROVED,
    );
  });

  it('should not award points for given status', async () => {
    testClaim = await createResourceClaim(supabase, {
      resourceId: offer.id,
      timeslotId: timeslot.id,
    });

    const scoreBeforeGiven = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );

    await signIn(supabase, owner.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: testClaim.id, status: 'given' });

    const scoreAfterGiven = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );
    expect(scoreAfterGiven - scoreBeforeGiven).toBe(0);
  });

  it('should not award points for received status', async () => {
    // Use shared data from beforeEach
    testClaim = await createResourceClaim(supabase, {
      resourceId: offer.id,
      timeslotId: timeslot.id,
    });

    const scoreBeforeReceived = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );

    // For offers: claimant can mark as received directly from approved
    await updateResourceClaim(supabase, {
      id: testClaim.id,
      status: 'received',
    });

    const scoreAfterReceived = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );
    expect(scoreAfterReceived - scoreBeforeReceived).toBe(0);
  });

  it('should allow claimant to mark as completed after given', async () => {
    // Use shared data from beforeEach
    testClaim = await createResourceClaim(supabase, {
      resourceId: offer.id,
      timeslotId: timeslot.id,
    });

    // For offers: owner marks as given
    await signIn(supabase, owner.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: testClaim.id, status: 'given' });

    // For offers: claimant marks as completed (business logic requires this)
    await signIn(supabase, claimant.email, 'TestPass123!');
    const updatedClaim = await updateResourceClaim(supabase, {
      id: testClaim.id,
      status: 'completed',
    });

    expect(updatedClaim.status).toBe('completed');
  });

  it('should award points for completed status', async () => {
    // Use shared data from beforeEach
    testClaim = await createResourceClaim(supabase, {
      resourceId: offer.id,
      timeslotId: timeslot.id,
    });

    // For offers: owner marks as given
    await signIn(supabase, owner.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: testClaim.id, status: 'given' });

    const scoreBeforeCompleted = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );

    // For offers: claimant marks as completed (business logic requires this)
    await signIn(supabase, claimant.email, 'TestPass123!');
    await updateResourceClaim(supabase, {
      id: testClaim.id,
      status: 'completed',
    });

    const scoreAfterCompleted = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );
    expect(scoreAfterCompleted - scoreBeforeCompleted).toBe(
      POINTS_CONFIG.OFFER_COMPLETED,
    );
  });

  it('should log completed action', async () => {
    // Use shared data from beforeEach
    testClaim = await createResourceClaim(supabase, {
      resourceId: offer.id,
      timeslotId: timeslot.id,
    });

    // For offers: owner marks as given
    await signIn(supabase, owner.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: testClaim.id, status: 'given' });

    // For offers: claimant marks as completed (business logic requires this)
    await signIn(supabase, claimant.email, 'TestPass123!');
    await updateResourceClaim(supabase, {
      id: testClaim.id,
      status: 'completed',
    });

    await verifyTrustScoreLog(
      serviceClient,
      claimant.id,
      community.id,
      'resource_completion',
      POINTS_CONFIG.OFFER_COMPLETED,
      'Offer completion log',
    );
  });
});

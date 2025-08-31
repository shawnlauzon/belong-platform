import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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
  updateResourceClaim,
} from '@/features/resources/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import {
  POINTS_CONFIG,
  getCurrentTrustScore,
  verifyTrustScoreIncrement,
  verifyTrustScoreLog,
} from './helpers';

describe('Trust Score Points - Offers', () => {
  let supabase: SupabaseClient<Database>;
  let serviceClient: SupabaseClient<Database>;

  beforeAll(async () => {
    supabase = createTestClient();
    serviceClient = createServiceClient();
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it('should create resource offer', async () => {
    const user = await createTestUser(supabase);
    await signIn(supabase, user.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);

    const offer = await createTestResource(supabase, community.id, 'offer');

    expect(offer.id).toBeDefined();
    expect(offer.type).toBe('offer');
  });

  it('should award 50 points for creating offer', async () => {
    const user = await createTestUser(supabase);
    await signIn(supabase, user.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const scoreAfterCommunity = await getCurrentTrustScore(
      supabase,
      user.id,
      community.id,
    );

    await createTestResource(supabase, community.id, 'offer');
    await new Promise((resolve) => setTimeout(resolve, 300));

    const scoreAfterOffer = await getCurrentTrustScore(
      supabase,
      user.id,
      community.id,
    );
    expect(scoreAfterOffer - scoreAfterCommunity).toBe(
      POINTS_CONFIG.RESOURCE_OFFER,
    );
  });

  it('should log offer creation action', async () => {
    const user = await createTestUser(supabase);
    await signIn(supabase, user.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);

    await createTestResource(supabase, community.id, 'offer');
    await new Promise((resolve) => setTimeout(resolve, 300));

    await verifyTrustScoreLog(
      serviceClient,
      user.id,
      community.id,
      'resource_offer',
      POINTS_CONFIG.RESOURCE_OFFER,
      'Resource offer creation log',
    );
  });

  it('should not award points for creating request', async () => {
    const user = await createTestUser(supabase);
    await signIn(supabase, user.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const scoreAfterCommunity = await getCurrentTrustScore(
      supabase,
      user.id,
      community.id,
    );

    await createTestResource(supabase, community.id, 'request');
    await new Promise((resolve) => setTimeout(resolve, 300));

    const scoreAfterRequest = await getCurrentTrustScore(
      supabase,
      user.id,
      community.id,
    );
    expect(scoreAfterRequest - scoreAfterCommunity).toBe(0);
  });

  it('should allow claiming offer without approval', async () => {
    const owner = await createTestUser(supabase);
    await signIn(supabase, owner.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);
    const offer = await createTestResource(supabase, community.id, 'offer');
    const timeslot = await createTestResourceTimeslot(supabase, offer.id);

    const claimant = await createTestUser(supabase);
    await signIn(supabase, claimant.email, 'TestPass123!');
    await joinCommunity(supabase, community.id);

    const claim = await createResourceClaim(supabase, {
      resourceId: offer.id,
      timeslotId: timeslot.id,
    });

    expect(claim.id).toBeDefined();
  });

  it('should award 25 points for claiming offer', async () => {
    const owner = await createTestUser(supabase);
    await signIn(supabase, owner.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);
    const offer = await createTestResource(supabase, community.id, 'offer');
    const timeslot = await createTestResourceTimeslot(supabase, offer.id);

    const claimant = await createTestUser(supabase);
    await signIn(supabase, claimant.email, 'TestPass123!');
    await joinCommunity(supabase, community.id);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const scoreBeforeClaim = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );

    await createResourceClaim(supabase, {
      resourceId: offer.id,
      timeslotId: timeslot.id,
    });
    await new Promise((resolve) => setTimeout(resolve, 300));

    const scoreAfterClaim = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );
    expect(scoreAfterClaim - scoreBeforeClaim).toBe(
      POINTS_CONFIG.OFFER_APPROVED,
    );
  });

  it('should allow owner to mark as given', async () => {
    const owner = await createTestUser(supabase);
    await signIn(supabase, owner.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);
    const offer = await createTestResource(supabase, community.id, 'offer');
    const timeslot = await createTestResourceTimeslot(supabase, offer.id);

    const claimant = await createTestUser(supabase);
    await signIn(supabase, claimant.email, 'TestPass123!');
    await joinCommunity(supabase, community.id);
    const claim = await createResourceClaim(supabase, {
      resourceId: offer.id,
      timeslotId: timeslot.id,
    });

    await signIn(supabase, owner.email, 'TestPass123!');
    const updatedClaim = await updateResourceClaim(supabase, {
      id: claim.id,
      status: 'given',
    });

    expect(updatedClaim.status).toBe('given');
  });

  it('should not award points for given status', async () => {
    const owner = await createTestUser(supabase);
    await signIn(supabase, owner.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);
    const offer = await createTestResource(supabase, community.id, 'offer');
    const timeslot = await createTestResourceTimeslot(supabase, offer.id);

    const claimant = await createTestUser(supabase);
    await signIn(supabase, claimant.email, 'TestPass123!');
    await joinCommunity(supabase, community.id);
    const claim = await createResourceClaim(supabase, {
      resourceId: offer.id,
      timeslotId: timeslot.id,
    });
    await new Promise((resolve) => setTimeout(resolve, 300));

    const scoreBeforeGiven = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );

    await signIn(supabase, owner.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: claim.id, status: 'given' });
    await new Promise((resolve) => setTimeout(resolve, 300));

    const scoreAfterGiven = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );
    expect(scoreAfterGiven - scoreBeforeGiven).toBe(0);
  });

  it('should allow claimant to mark as received', async () => {
    const owner = await createTestUser(supabase);
    await signIn(supabase, owner.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);
    const offer = await createTestResource(supabase, community.id, 'offer');
    const timeslot = await createTestResourceTimeslot(supabase, offer.id);

    const claimant = await createTestUser(supabase);
    await signIn(supabase, claimant.email, 'TestPass123!');
    await joinCommunity(supabase, community.id);
    const claim = await createResourceClaim(supabase, {
      resourceId: offer.id,
      timeslotId: timeslot.id,
    });

    // Owner must mark as given
    await signIn(supabase, owner.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: claim.id, status: 'given' });

    // Claimant must mark as received
    await signIn(supabase, claimant.email, 'TestPass123!');
    const updatedClaim = await updateResourceClaim(supabase, {
      id: claim.id,
      status: 'received',
    });

    expect(updatedClaim.status).toBe('received');
  });

  it('should not award points for received status', async () => {
    const owner = await createTestUser(supabase);
    await signIn(supabase, owner.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);
    const offer = await createTestResource(supabase, community.id, 'offer');
    const timeslot = await createTestResourceTimeslot(supabase, offer.id);

    const claimant = await createTestUser(supabase);
    await signIn(supabase, claimant.email, 'TestPass123!');
    await joinCommunity(supabase, community.id);
    const claim = await createResourceClaim(supabase, {
      resourceId: offer.id,
      timeslotId: timeslot.id,
    });

    // Owner must mark as given
    await signIn(supabase, owner.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: claim.id, status: 'given' });
    await new Promise((resolve) => setTimeout(resolve, 300));

    const scoreBeforeReceived = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );

    // Claimant must mark as received
    await signIn(supabase, claimant.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: claim.id, status: 'received' });
    await new Promise((resolve) => setTimeout(resolve, 300));

    const scoreAfterReceived = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );
    expect(scoreAfterReceived - scoreBeforeReceived).toBe(0);
  });

  it('should allow owner to mark as completed', async () => {
    const owner = await createTestUser(supabase);
    await signIn(supabase, owner.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);
    const offer = await createTestResource(supabase, community.id, 'offer');
    const timeslot = await createTestResourceTimeslot(supabase, offer.id);

    const claimant = await createTestUser(supabase);
    await signIn(supabase, claimant.email, 'TestPass123!');
    await joinCommunity(supabase, community.id);
    const claim = await createResourceClaim(supabase, {
      resourceId: offer.id,
      timeslotId: timeslot.id,
    });

    // Owner must mark as given
    await signIn(supabase, owner.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: claim.id, status: 'given' });

    // Claimant must mark as received
    await signIn(supabase, claimant.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: claim.id, status: 'received' });

    await signIn(supabase, owner.email, 'TestPass123!');
    const updatedClaim = await updateResourceClaim(supabase, {
      id: claim.id,
      status: 'completed',
    });

    expect(updatedClaim.status).toBe('completed');
  });

  it('should award 50 points for completed status', async () => {
    const owner = await createTestUser(supabase);
    await signIn(supabase, owner.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);
    const offer = await createTestResource(supabase, community.id, 'offer');
    const timeslot = await createTestResourceTimeslot(supabase, offer.id);

    const claimant = await createTestUser(supabase);
    await signIn(supabase, claimant.email, 'TestPass123!');
    await joinCommunity(supabase, community.id);
    const claim = await createResourceClaim(supabase, {
      resourceId: offer.id,
      timeslotId: timeslot.id,
    });

    // Owner must mark as given
    await signIn(supabase, owner.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: claim.id, status: 'given' });

    // Claimant must mark as received
    await signIn(supabase, claimant.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: claim.id, status: 'received' });
    await new Promise((resolve) => setTimeout(resolve, 300));

    const scoreBeforeCompleted = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );

    await signIn(supabase, owner.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: claim.id, status: 'completed' });
    await new Promise((resolve) => setTimeout(resolve, 300));

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
    const owner = await createTestUser(supabase);
    await signIn(supabase, owner.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);
    const offer = await createTestResource(supabase, community.id, 'offer');
    const timeslot = await createTestResourceTimeslot(supabase, offer.id);

    const claimant = await createTestUser(supabase);
    await signIn(supabase, claimant.email, 'TestPass123!');
    await joinCommunity(supabase, community.id);
    const claim = await createResourceClaim(supabase, {
      resourceId: offer.id,
      timeslotId: timeslot.id,
    });

    // Owner must mark as given
    await signIn(supabase, owner.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: claim.id, status: 'given' });

    // Claimant must mark as received
    await signIn(supabase, claimant.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: claim.id, status: 'received' });

    await signIn(supabase, owner.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: claim.id, status: 'completed' });
    await new Promise((resolve) => setTimeout(resolve, 300));

    await verifyTrustScoreLog(
      serviceClient,
      claimant.id,
      community.id,
      'resource_completion',
      POINTS_CONFIG.OFFER_COMPLETED,
      'Offer completion log',
    );
  });

  it('should accumulate points through full offer flow', async () => {
    const owner = await createTestUser(supabase);
    await signIn(supabase, owner.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);
    const offer = await createTestResource(supabase, community.id, 'offer');
    const timeslot = await createTestResourceTimeslot(supabase, offer.id);

    const claimant = await createTestUser(supabase);
    await signIn(supabase, claimant.email, 'TestPass123!');
    await joinCommunity(supabase, community.id);

    const claim = await createResourceClaim(supabase, {
      resourceId: offer.id,
      timeslotId: timeslot.id,
    });

    // Owner must mark as given
    await signIn(supabase, owner.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: claim.id, status: 'given' });

    // Claimant must mark as received
    await signIn(supabase, claimant.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: claim.id, status: 'received' });

    await signIn(supabase, owner.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: claim.id, status: 'completed' });
    await new Promise((resolve) => setTimeout(resolve, 300));

    const finalScore = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );
    const expectedTotal =
      POINTS_CONFIG.COMMUNITY_JOIN +
      POINTS_CONFIG.OFFER_APPROVED +
      POINTS_CONFIG.OFFER_COMPLETED;
    expect(finalScore).toBe(expectedTotal);
  });
});

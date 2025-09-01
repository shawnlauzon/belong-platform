import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestClient, createServiceClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { fetchTrustScores } from '@/features/trust-scores/api';
import { createTestUser, createTestCommunity } from '../helpers/test-data';
import { signIn } from '@/features/auth/api';
import { joinCommunity, leaveCommunity } from '@/features/communities/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import {
  POINTS_CONFIG,
  getCurrentTrustScore,
  verifyTrustScoreLog,
  createTestConnectionAndJoin,
} from './helpers';
import type { User } from '@/features/users/types';

describe('Trust Score Points - Communities', () => {
  let supabase: SupabaseClient<Database>;
  let serviceClient: SupabaseClient<Database>;
  let testUser: User;

  beforeAll(async () => {
    supabase = createTestClient();
    serviceClient = createServiceClient();

    // Create fresh user for each test (automatically signed in)
    testUser = await createTestUser(supabase);
  });

  beforeEach(async () => {
    await signIn(supabase, testUser.email, 'TestPass123!');
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it('should have zero trust scores for new user', async () => {
    const trustScores = await fetchTrustScores(supabase, testUser.id);

    expect(trustScores).toHaveLength(0);
  });

  it('should award community creation points', async () => {
    const community = await createTestCommunity(supabase);

    const trustScores = await fetchTrustScores(supabase, testUser.id);
    expect(trustScores).toHaveLength(1);
    expect(trustScores[0].communityId).toBe(community.id);
    expect(trustScores[0].score).toBeGreaterThan(0);
  });

  it('should award points for community creation', async () => {
    const community = await createTestCommunity(supabase);

    await verifyTrustScoreLog(
      serviceClient,
      testUser.id,
      community.id,
      'community_creation',
      POINTS_CONFIG.COMMUNITY_CREATION,
      'Community creation log',
    );
  });

  it('should award auto-join points when creating community', async () => {
    const community = await createTestCommunity(supabase);

    await verifyTrustScoreLog(
      serviceClient,
      testUser.id,
      community.id,
      'community_join',
      POINTS_CONFIG.COMMUNITY_JOIN,
      'Community auto-join log',
    );
  });

  it('should have correct total score after creating community', async () => {
    const community = await createTestCommunity(supabase);

    const score = await getCurrentTrustScore(
      supabase,
      testUser.id,
      community.id,
    );
    expect(score).toBe(
      POINTS_CONFIG.COMMUNITY_CREATION + POINTS_CONFIG.COMMUNITY_JOIN,
    );
  });

  it('should allow user to join existing community', async () => {
    const owner = await createTestUser(supabase);
    await signIn(supabase, owner.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);

    const joiner = await createTestUser(supabase);
    await signIn(supabase, joiner.email, 'TestPass123!');

    await joinCommunity(supabase, community.id);

    const trustScores = await fetchTrustScores(supabase, joiner.id);
    expect(trustScores).toHaveLength(1);
    expect(trustScores[0].communityId).toBe(community.id);
  });

  it('should award points for joining existing community', async () => {
    const owner = await createTestUser(supabase);
    await signIn(supabase, owner.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);

    const joiner = await createTestUser(supabase);
    await signIn(supabase, joiner.email, 'TestPass123!');
    await joinCommunity(supabase, community.id);

    const score = await getCurrentTrustScore(supabase, joiner.id, community.id);
    expect(score).toBe(POINTS_CONFIG.COMMUNITY_JOIN);
  });

  it('should log community join action', async () => {
    const owner = await createTestUser(supabase);
    await signIn(supabase, owner.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);

    const joiner = await createTestUser(supabase);
    await signIn(supabase, joiner.email, 'TestPass123!');
    await joinCommunity(supabase, community.id);

    await verifyTrustScoreLog(
      serviceClient,
      joiner.id,
      community.id,
      'community_join',
      POINTS_CONFIG.COMMUNITY_JOIN,
      'Community join log',
    );
  });

  it('should track separate scores for multiple communities', async () => {
    const community1 = await createTestCommunity(supabase);

    const community2 = await createTestCommunity(supabase);

    const trustScores = await fetchTrustScores(supabase, testUser.id);

    const score1 = trustScores.find((s) => s.communityId === community1.id);
    const score2 = trustScores.find((s) => s.communityId === community2.id);
    expect(score1?.score).toBe(
      POINTS_CONFIG.COMMUNITY_CREATION + POINTS_CONFIG.COMMUNITY_JOIN,
    );
    expect(score2?.score).toBe(
      POINTS_CONFIG.COMMUNITY_CREATION + POINTS_CONFIG.COMMUNITY_JOIN,
    );
  });

  it('should handle joining via connection invitation', async () => {
    // Create owner with their own client
    const ownerClient = createTestClient();
    const owner = await createTestUser(ownerClient);
    await signIn(ownerClient, owner.email, 'TestPass123!');
    const community = await createTestCommunity(ownerClient);

    // Create invitee with separate client
    const inviteeClient = createTestClient();
    const invitee = await createTestUser(inviteeClient);
    await signIn(inviteeClient, invitee.email, 'TestPass123!');

    // Invitee must join community first to create connection
    await joinCommunity(inviteeClient, community.id);

    // Wait for membership to be processed
    await new Promise((resolve) => setTimeout(resolve, 200));

    await createTestConnectionAndJoin(
      ownerClient,
      inviteeClient,
      serviceClient,
      owner.id,
      invitee.id,
      community.id,
    );

    const score = await getCurrentTrustScore(
      inviteeClient,
      invitee.id,
      community.id,
    );
    expect(score).toBe(POINTS_CONFIG.COMMUNITY_JOIN_WITH_INVITATION);
  });

  it('should deduct points when user leaves community', async () => {
    const owner = await createTestUser(supabase);
    await signIn(supabase, owner.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);

    const joiner = await createTestUser(supabase);
    await signIn(supabase, joiner.email, 'TestPass123!');
    
    // Join community first
    await joinCommunity(supabase, community.id);
    
    // Verify user has 50 points for joining
    const scoreAfterJoin = await getCurrentTrustScore(supabase, joiner.id, community.id);
    expect(scoreAfterJoin).toBe(POINTS_CONFIG.COMMUNITY_JOIN);

    // Leave the community
    await leaveCommunity(supabase, community.id);

    // Verify user lost the 50 points
    const scoreAfterLeave = await getCurrentTrustScore(supabase, joiner.id, community.id);
    expect(scoreAfterLeave).toBe(0);
  });

  it('should log community leave action', async () => {
    const owner = await createTestUser(supabase);
    await signIn(supabase, owner.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);

    const joiner = await createTestUser(supabase);
    await signIn(supabase, joiner.email, 'TestPass123!');
    
    await joinCommunity(supabase, community.id);
    await leaveCommunity(supabase, community.id);

    await verifyTrustScoreLog(
      serviceClient,
      joiner.id,
      community.id,
      'community_leave',
      POINTS_CONFIG.COMMUNITY_LEAVE,
      'Community leave log',
    );
  });
});

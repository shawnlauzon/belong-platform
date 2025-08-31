import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, createServiceClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { fetchTrustScores } from '@/features/trust-scores/api';
import { createTestUser, createTestCommunity } from '../helpers/test-data';
import { signIn } from '@/features/auth/api';
import { joinCommunity } from '@/features/communities/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import {
  POINTS_CONFIG,
  getCurrentTrustScore,
  verifyTrustScoreLog,
  createTestConnectionAndJoin,
} from './helpers';

describe('Trust Score Points - Communities', () => {
  let supabase: SupabaseClient<Database>;
  let serviceClient: SupabaseClient<Database>;

  beforeAll(async () => {
    supabase = createTestClient();
    serviceClient = createServiceClient();
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it('should have zero trust scores for new user', async () => {
    const user = await createTestUser(supabase);
    await signIn(supabase, user.email, 'TestPass123!');

    const trustScores = await fetchTrustScores(supabase, user.id);

    expect(trustScores).toHaveLength(0);
  });

  it('should award community creation points', async () => {
    const user = await createTestUser(supabase);
    await signIn(supabase, user.email, 'TestPass123!');

    const community = await createTestCommunity(supabase);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const trustScores = await fetchTrustScores(supabase, user.id);
    expect(trustScores).toHaveLength(1);
    expect(trustScores[0].communityId).toBe(community.id);
    expect(trustScores[0].score).toBeGreaterThan(0);
  });

  it('should award exactly 1000 points for community creation', async () => {
    const user = await createTestUser(supabase);
    await signIn(supabase, user.email, 'TestPass123!');

    const community = await createTestCommunity(supabase);
    await new Promise((resolve) => setTimeout(resolve, 300));

    await verifyTrustScoreLog(
      serviceClient,
      user.id,
      community.id,
      'community_creation',
      POINTS_CONFIG.COMMUNITY_CREATION,
      'Community creation log',
    );
  });

  it('should award auto-join points when creating community', async () => {
    const user = await createTestUser(supabase);
    await signIn(supabase, user.email, 'TestPass123!');

    const community = await createTestCommunity(supabase);
    await new Promise((resolve) => setTimeout(resolve, 300));

    await verifyTrustScoreLog(
      serviceClient,
      user.id,
      community.id,
      'community_join',
      POINTS_CONFIG.COMMUNITY_JOIN,
      'Community auto-join log',
    );
  });

  it('should have total score of 1050 after creating community', async () => {
    const user = await createTestUser(supabase);
    await signIn(supabase, user.email, 'TestPass123!');

    const community = await createTestCommunity(supabase);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const score = await getCurrentTrustScore(supabase, user.id, community.id);
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
    await new Promise((resolve) => setTimeout(resolve, 300));

    const trustScores = await fetchTrustScores(supabase, joiner.id);
    expect(trustScores).toHaveLength(1);
    expect(trustScores[0].communityId).toBe(community.id);
  });

  it('should award 50 points for joining existing community', async () => {
    const owner = await createTestUser(supabase);
    await signIn(supabase, owner.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);

    const joiner = await createTestUser(supabase);
    await signIn(supabase, joiner.email, 'TestPass123!');
    await joinCommunity(supabase, community.id);
    await new Promise((resolve) => setTimeout(resolve, 300));

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
    await new Promise((resolve) => setTimeout(resolve, 300));

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
    const user = await createTestUser(supabase);
    await signIn(supabase, user.email, 'TestPass123!');

    const community1 = await createTestCommunity(supabase);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const community2 = await createTestCommunity(supabase);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const trustScores = await fetchTrustScores(supabase, user.id);
    expect(trustScores).toHaveLength(2);

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
});

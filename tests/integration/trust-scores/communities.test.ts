import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestClient, createServiceClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { fetchTrustScores } from '@/features/trust-scores/api';
import { createTestUser, createTestCommunity } from '../helpers/test-data';
import { signIn } from '@/features/auth/api';
import {
  joinCommunity,
  leaveCommunity,
  joinCommunityWithCode,
} from '@/features/communities/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import {
  POINTS_CONFIG,
  getCurrentTrustScore,
  verifyTrustScoreLog,
  createTestConnectionAndJoin,
} from './helpers';
import { NOTIFICATION_TYPES } from '@/features/notifications';
import type { Account } from '@/features/auth/types';

describe('Trust Score Points - Communities', () => {
  let supabase: SupabaseClient<Database>;
  let serviceClient: SupabaseClient<Database>;
  let testUser: Account;

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

  // Community creation no longer awards points directly
  // Only founder role assignment awards points

  it('should award founder role points automatically', async () => {
    const community = await createTestCommunity(supabase);

    await verifyTrustScoreLog(
      serviceClient,
      testUser.id,
      community.id,
      NOTIFICATION_TYPES.COMMUNITY_MEMBER_JOINED,
      POINTS_CONFIG.COMMUNITY_FOUNDER,
      'Community founder log',
    );
  });

  it('should have correct total score after creating community', async () => {
    const community = await createTestCommunity(supabase);

    const score = await getCurrentTrustScore(
      supabase,
      testUser.id,
      community.id,
    );
    expect(score).toBe(POINTS_CONFIG.COMMUNITY_FOUNDER);
  });

  it('should allow user to join existing community', async () => {
    const owner = await createTestUser(supabase);
    await signIn(supabase, owner.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);

    const joiner = await createTestUser(supabase);
    await signIn(supabase, joiner.email, 'TestPass123!');

    const { data: { user: u } } = await supabase.auth.getUser(); await joinCommunity(supabase, u!.id, community.id);

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
    const { data: { user: u } } = await supabase.auth.getUser(); await joinCommunity(supabase, u!.id, community.id);

    const score = await getCurrentTrustScore(supabase, joiner.id, community.id);
    expect(score).toBe(POINTS_CONFIG.COMMUNITY_JOIN);
  });

  it('should log community join action', async () => {
    const owner = await createTestUser(supabase);
    await signIn(supabase, owner.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);

    const joiner = await createTestUser(supabase);
    await signIn(supabase, joiner.email, 'TestPass123!');
    const { data: { user: u } } = await supabase.auth.getUser(); await joinCommunity(supabase, u!.id, community.id);

    await verifyTrustScoreLog(
      serviceClient,
      joiner.id,
      community.id,
      NOTIFICATION_TYPES.COMMUNITY_MEMBER_JOINED,
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
    expect(score1?.score).toBe(POINTS_CONFIG.COMMUNITY_FOUNDER);
    expect(score2?.score).toBe(POINTS_CONFIG.COMMUNITY_FOUNDER);
  });

  it('should award regular join points when creating connections between existing members', async () => {
    // Create owner with their own client
    const ownerClient = createTestClient();
    const owner = await createTestUser(ownerClient);
    await signIn(ownerClient, owner.email, 'TestPass123!');
    const community = await createTestCommunity(ownerClient);

    // Create invitee with separate client
    const inviteeClient = createTestClient();
    const invitee = await createTestUser(inviteeClient);
    await signIn(inviteeClient, invitee.email, 'TestPass123!');

    // Invitee joins community first (gets regular join points)
    const { data: { user: u2 } } = await inviteeClient.auth.getUser(); await joinCommunity(inviteeClient, u2!.id, community.id);

    // Wait for membership to be processed
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Create connection between existing members (doesn't affect trust score)
    await createTestConnectionAndJoin(
      ownerClient,
      inviteeClient,
      serviceClient,
      owner.id,
      invitee.id,
      community.id,
    );

    // Score should be regular community join points (not invitation-specific)
    const score = await getCurrentTrustScore(
      inviteeClient,
      invitee.id,
      community.id,
    );
    expect(score).toBe(POINTS_CONFIG.COMMUNITY_JOIN);
  });

  it('should deduct points when user leaves community', async () => {
    const owner = await createTestUser(supabase);
    await signIn(supabase, owner.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);

    const joiner = await createTestUser(supabase);
    await signIn(supabase, joiner.email, 'TestPass123!');

    // Join community first
    const { data: { user: u } } = await supabase.auth.getUser(); await joinCommunity(supabase, u!.id, community.id);

    // Verify user has 50 points for joining
    const scoreAfterJoin = await getCurrentTrustScore(
      supabase,
      joiner.id,
      community.id,
    );
    expect(scoreAfterJoin).toBe(POINTS_CONFIG.COMMUNITY_JOIN);

    // Leave the community
    const { data: { user: u3 } } = await supabase.auth.getUser(); await leaveCommunity(supabase, u3!.id, community.id);

    // Verify user lost the 50 points
    const scoreAfterLeave = await getCurrentTrustScore(
      supabase,
      joiner.id,
      community.id,
    );
    expect(scoreAfterLeave).toBe(0);
  });

  it('should log community leave action', async () => {
    const owner = await createTestUser(supabase);
    await signIn(supabase, owner.email, 'TestPass123!');
    const community = await createTestCommunity(supabase);

    const joiner = await createTestUser(supabase);
    await signIn(supabase, joiner.email, 'TestPass123!');

    const { data: { user: u } } = await supabase.auth.getUser(); await joinCommunity(supabase, u!.id, community.id);
    const { data: { user: u3 } } = await supabase.auth.getUser(); await leaveCommunity(supabase, u3!.id, community.id);

    await verifyTrustScoreLog(
      serviceClient,
      joiner.id,
      community.id,
      NOTIFICATION_TYPES.COMMUNITY_MEMBER_LEFT,
      POINTS_CONFIG.COMMUNITY_LEAVE,
      'Community leave log',
    );
  });

  it('should award points when joining with invitation code', async () => {
    // Create community owner with their own client
    const ownerClient = createTestClient();
    const owner = await createTestUser(ownerClient);
    await signIn(ownerClient, owner.email, 'TestPass123!');
    const community = await createTestCommunity(ownerClient);

    // Get the owner's invitation code
    const { data: invitationCode, error } = await ownerClient
      .from('invitation_codes')
      .select('code')
      .eq('user_id', owner.id)
      .eq('community_id', community.id)
      .eq('is_active', true)
      .single();

    expect(error).toBeNull();
    expect(invitationCode).toBeDefined();

    // Create joiner with separate client
    const joinerClient = createTestClient();
    const joiner = await createTestUser(joinerClient);
    await signIn(joinerClient, joiner.email, 'TestPass123!');

    // Join community using invitation code
    await joinCommunityWithCode(joinerClient, joiner.id, invitationCode!.code);

    // Verify joiner received community join points
    const score = await getCurrentTrustScore(
      joinerClient,
      joiner.id,
      community.id,
    );
    expect(score).toBe(POINTS_CONFIG.COMMUNITY_JOIN);

    // Verify trust score log was created
    await verifyTrustScoreLog(
      serviceClient,
      joiner.id,
      community.id,
      NOTIFICATION_TYPES.COMMUNITY_MEMBER_JOINED,
      POINTS_CONFIG.COMMUNITY_JOIN,
      'Community join with invitation code log',
    );
  });
});

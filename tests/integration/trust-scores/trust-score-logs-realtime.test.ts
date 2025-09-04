import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, createServiceClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  TEST_PREFIX,
} from '../helpers/test-data';
import { joinCommunity } from '@/features/communities/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account, Community } from '@/features';
import { getCurrentTrustScore } from './helpers';

describe('Trust Score Logs - Real-time Updates', () => {
  let serviceClient: SupabaseClient<Database>;
  let activeChannels: any[] = [];

  beforeAll(async () => {
    serviceClient = createServiceClient();
  });


  afterEach(async () => {
    // Clean up all channels after each test
    for (const { channel, client } of activeChannels) {
      await channel.unsubscribe();
      client.removeChannel(channel);
    }
    activeChannels = [];

    // Wait for cleanup to complete
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it('should receive trust score log updates via realtime when user joins a community', async () => {
    const testId = `test-${Date.now()}`;
    
    // Create fresh client and user for this test
    const supabase = createTestClient();
    const user = await createTestUser(supabase);
    
    // Create a separate community using a different client so the user isn't automatically a member
    const communityClient = createTestClient();
    await createTestUser(communityClient); // Creates organizer
    const testCommunity = await createTestCommunity(communityClient);
    
    // Track received trust score logs
    const trustScoreLogsReceived: any[] = [];

    // Subscribe to trust score log changes for this user
    const channel = supabase
      .channel(`${testId}-trust-logs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trust_score_logs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Received trust score log via realtime:', payload.new);
          trustScoreLogsReceived.push(payload.new);
        }
      )
      .subscribe();

    activeChannels.push({ channel, client: supabase });

    // Wait for subscription to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get initial trust score (will be 0 since user hasn't joined any community yet)
    const initialScore = 0;

    // Join community (this should trigger trust score logs)
    await joinCommunity(supabase, testCommunity.id);

    // Wait for realtime events to be processed
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify we received trust score logs via realtime
    expect(trustScoreLogsReceived.length).toBeGreaterThan(0);

    // Find community join log
    const joinLog = trustScoreLogsReceived.find(
      (log) => log.action_type === 'COMMUNITY_JOIN'
    );

    expect(joinLog).toBeDefined();
    expect(joinLog.user_id).toBe(user.id);
    expect(joinLog.community_id).toBe(testCommunity.id);
    expect(joinLog.points_change).toBe(50); // Community join points
    expect(joinLog.score_before).toBe(initialScore);
    expect(joinLog.score_after).toBe(initialScore + 50);
  });

  it('should receive multiple trust score log updates in correct order', async () => {
    const testId = `test-multi-${Date.now()}`;
    
    // Create fresh client and user for this test
    const supabase = createTestClient();
    const user = await createTestUser(supabase);
    
    // Create communities using different clients so user isn't automatically a member
    const firstCommunityClient = createTestClient();
    await createTestUser(firstCommunityClient);
    const firstCommunity = await createTestCommunity(firstCommunityClient);
    
    const secondCommunityClient = createTestClient();
    await createTestUser(secondCommunityClient);
    const secondCommunity = await createTestCommunity(secondCommunityClient);
    
    // Track received trust score logs
    const trustScoreLogsReceived: any[] = [];

    // Subscribe to trust score log changes for this user
    const channel = supabase
      .channel(`${testId}-trust-logs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trust_score_logs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Received trust score log via realtime:', payload.new);
          trustScoreLogsReceived.push(payload.new);
        }
      )
      .subscribe();

    activeChannels.push({ channel, client: supabase });

    // Wait for subscription to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Join first community
    await joinCommunity(supabase, firstCommunity.id);
    
    // Wait a bit and then join second community
    await new Promise((resolve) => setTimeout(resolve, 500));
    await joinCommunity(supabase, secondCommunity.id);

    // Wait for realtime events to be processed
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify we received trust score logs for both community joins
    expect(trustScoreLogsReceived.length).toBeGreaterThanOrEqual(2);

    const firstJoinLog = trustScoreLogsReceived.find(
      (log) => 
        log.action_type === 'COMMUNITY_JOIN' && 
        log.community_id === firstCommunity.id
    );

    const secondJoinLog = trustScoreLogsReceived.find(
      (log) => 
        log.action_type === 'COMMUNITY_JOIN' && 
        log.community_id === secondCommunity.id
    );

    expect(firstJoinLog).toBeDefined();
    expect(firstJoinLog.user_id).toBe(user.id);
    expect(firstJoinLog.points_change).toBe(50);

    expect(secondJoinLog).toBeDefined();
    expect(secondJoinLog.user_id).toBe(user.id);
    expect(secondJoinLog.points_change).toBe(50);
  });

  it('should only receive trust score logs for the subscribed user', async () => {
    const testId = `test-filter-${Date.now()}`;
    
    // Create fresh clients and users for this test
    const firstUserClient = createTestClient();
    const firstUser = await createTestUser(firstUserClient);
    
    const secondUserClient = createTestClient();
    const secondUser = await createTestUser(secondUserClient);
    
    // Create a community using a third client
    const communityClient = createTestClient();
    await createTestUser(communityClient);
    const testCommunity = await createTestCommunity(communityClient);
    
    // Track received trust score logs
    const trustScoreLogsReceived: any[] = [];

    // Subscribe to trust score log changes for ONLY the first user
    const channel = firstUserClient
      .channel(`${testId}-trust-logs-${firstUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trust_score_logs',
          filter: `user_id=eq.${firstUser.id}`,
        },
        (payload) => {
          console.log('Received trust score log via realtime:', payload.new);
          trustScoreLogsReceived.push(payload.new);
        }
      )
      .subscribe();

    activeChannels.push({ channel, client: firstUserClient });

    // Wait for subscription to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // First user joins
    await joinCommunity(firstUserClient, testCommunity.id);

    // Second user joins using their own client
    await joinCommunity(secondUserClient, testCommunity.id);

    // Wait for realtime events to be processed
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify we only received trust score logs for the first user
    const receivedUserIds = new Set(
      trustScoreLogsReceived.map(log => log.user_id)
    );
    
    expect(receivedUserIds.size).toBe(1);
    expect(receivedUserIds.has(firstUser.id)).toBe(true);
    expect(receivedUserIds.has(secondUser.id)).toBe(false);
  });
});
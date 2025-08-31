/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient, createServiceClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { fetchTrustScores } from '@/features/trust-scores/api';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  createTestResourceTimeslot,
  createTestShoutout,
  createTestConnectionRequest,
} from '../helpers/test-data';
import { signIn } from '@/features/auth/api';
import { joinCommunity } from '@/features/communities/api';
import {
  createResourceClaim,
  updateResourceClaim,
} from '@/features/resources/api';
import { approveConnection } from '@/features/connections/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

// Configurable points constants for easy adjustment
const POINTS_CONFIG = {
  COMMUNITY_JOIN: 50,
  COMMUNITY_JOIN_WITH_INVITATION: 50, // Same as regular join currently
  RESOURCE_OFFER: 50,
  EVENT_CLAIM_INITIAL: 5,
  EVENT_CLAIM_CONFIRMED: 25,
  EVENT_COMPLETION: 50,
  SHOUTOUT_SENT: 10,
  SHOUTOUT_RECEIVED: 100,
} as const;

describe('Trust Score Points Distribution Integration Tests', () => {
  let supabase: SupabaseClient<Database>;
  let serviceClient: SupabaseClient<Database>;

  beforeAll(async () => {
    supabase = createTestClient();
    serviceClient = createServiceClient();
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    await cleanupAllTestData();
  });

  /**
   * Helper function to verify a user's trust score in a specific community
   */
  async function verifyTrustScore(
    userId: string,
    communityId: string,
    expectedScore: number,
    description: string,
  ) {
    const trustScores = await fetchTrustScores(supabase, userId);

    console.log(`\n=== DEBUG: ${description} ===`);
    console.log(`User ID: ${userId}`);
    console.log(`Community ID: ${communityId}`);
    console.log(`Expected Score: ${expectedScore}`);
    console.log(`All trust scores found:`, trustScores);

    // Check database directly for additional context
    const { data: directScores } = await serviceClient
      .from('trust_scores')
      .select('*')
      .eq('user_id', userId);
    console.log(`Direct DB trust_scores:`, directScores);

    // Check trust score logs for debugging
    const { data: logs } = await serviceClient
      .from('trust_score_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    console.log(`Trust score logs:`, logs);

    // Specific expectation: User should have at least one trust score
    expect(
      trustScores.length,
      `${description} - User should have at least 1 trust score`,
    ).toBeGreaterThan(0);

    // Find the specific community score
    const communityScores = trustScores.filter(
      (score) => score.communityId === communityId,
    );
    expect(
      communityScores,
      `${description} - Should have exactly 1 score for community ${communityId}`,
    ).toHaveLength(1);

    const communityScore = communityScores[0];
    expect(
      communityScore.score,
      `${description} - Score should be ${expectedScore}`,
    ).toBe(expectedScore);
    expect(
      communityScore.communityId,
      `${description} - Community ID should match`,
    ).toBe(communityId);
    expect(communityScore.userId, `${description} - User ID should match`).toBe(
      userId,
    );
  }

  /**
   * Helper function to get current trust score for a user in a community
   * Returns 0 if no score exists yet
   */
  async function getCurrentTrustScore(
    userId: string,
    communityId: string,
  ): Promise<number> {
    const trustScores = await fetchTrustScores(supabase, userId);
    const communityScore = trustScores.find(
      (score) => score.communityId === communityId,
    );
    return communityScore?.score || 0;
  }

  /**
   * Helper function to verify trust score incremented by expected amount
   */
  async function verifyTrustScoreIncrement(
    userId: string,
    communityId: string,
    previousScore: number,
    expectedIncrement: number,
    description: string,
  ) {
    const newScore = await getCurrentTrustScore(userId, communityId);
    const actualIncrement = newScore - previousScore;

    console.log(`\n=== DEBUG: ${description} ===`);
    console.log(`User ID: ${userId}`);
    console.log(`Community ID: ${communityId}`);
    console.log(`Previous Score: ${previousScore}`);
    console.log(`New Score: ${newScore}`);
    console.log(`Expected Increment: ${expectedIncrement}`);
    console.log(`Actual Increment: ${actualIncrement}`);

    expect(
      actualIncrement,
      `${description} - Score should increase by ${expectedIncrement} (was ${previousScore}, now ${newScore})`,
    ).toBe(expectedIncrement);
  }

  /**
   * Helper function to verify trust score log entries
   * More resilient to errors - looks for matching log with some flexibility
   */
  async function verifyTrustScoreLog(
    userId: string,
    communityId: string,
    actionType: string,
    pointsChange: number,
    description: string,
  ) {
    // Get all logs for this user/community combination to provide better debugging info
    const { data: allLogs, error: allLogsError } = await serviceClient
      .from('trust_score_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('community_id', communityId)
      .order('created_at', { ascending: false });

    console.log(`\n=== LOG DEBUG: ${description} ===`);
    console.log(
      `Looking for: userId=${userId}, communityId=${communityId}, actionType=${actionType}, pointsChange=${pointsChange}`,
    );

    if (allLogsError) {
      console.log('Error fetching logs:', allLogsError);
      throw new Error(
        `${description} - Failed to fetch logs: ${allLogsError.message}`,
      );
    }

    console.log(
      `Found ${allLogs?.length || 0} total logs for this user/community:`,
    );
    allLogs?.forEach((log, i) => {
      console.log(
        `  Log ${i + 1}: action=${log.action_type}, points=${log.points_change}, created=${log.created_at}`,
      );
    });

    // Basic validation
    expect(
      allLogs,
      `${description} - Should return log data array`,
    ).not.toBeNull();
    expect(
      allLogs!.length,
      `${description} - Should have at least one log entry`,
    ).toBeGreaterThan(0);

    // Look for a matching log entry (more flexible approach)
    const matchingLogs = allLogs!.filter(
      (log) =>
        log.action_type === actionType && log.points_change === pointsChange,
    );

    if (matchingLogs.length === 0) {
      console.log(
        `No matching logs found. Available action types: ${[...new Set(allLogs!.map((l) => l.action_type))].join(', ')}`,
      );
      console.log(
        `Available points values: ${[...new Set(allLogs!.map((l) => l.points_change))].join(', ')}`,
      );
    }

    expect(
      matchingLogs.length,
      `${description} - Should have at least one log entry with action_type='${actionType}' and points_change=${pointsChange}`,
    ).toBeGreaterThan(0);

    const logEntry = matchingLogs[0]; // Use the first matching entry

    // Verify the key fields (user_id and community_id should already match due to query)
    expect(logEntry.user_id, `${description} - Log user_id should match`).toBe(
      userId,
    );
    expect(
      logEntry.community_id,
      `${description} - Log community_id should match`,
    ).toBe(communityId);
    expect(
      logEntry.action_type,
      `${description} - Log action_type should match`,
    ).toBe(actionType);
    expect(
      logEntry.points_change,
      `${description} - Log points_change should match`,
    ).toBe(pointsChange);
    expect(
      logEntry.created_at,
      `${description} - Log should have created_at timestamp`,
    ).not.toBeNull();

    console.log(
      `✅ Found matching log entry: action=${logEntry.action_type}, points=${logEntry.points_change}`,
    );
  }

  /**
   * Helper function to create a connection request and join community via invitation
   */
  async function createTestConnectionAndJoin(
    inviterClient: SupabaseClient<Database>,
    inviteeClient: SupabaseClient<Database>,
    inviterId: string,
    inviteeId: string,
    communityId: string,
  ) {
    // Get inviter's connection code
    const { data: memberCode } = await serviceClient
      .from('community_member_codes')
      .select('*')
      .eq('user_id', inviterId)
      .eq('community_id', communityId)
      .single();

    if (!memberCode) {
      throw new Error('Member connection code not found');
    }

    // Create connection request from invitee to inviter using the code
    const connectionRequest = await createTestConnectionRequest(
      inviteeClient,
      communityId,
      memberCode.code,
    );

    // Approve the connection as the inviter
    await approveConnection(inviterClient, connectionRequest.id);

    // Wait for triggers to complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    return connectionRequest;
  }

  describe('Basic Trust Score System', () => {
    it('should have zero trust scores for new user', async () => {
      const user = await createTestUser(supabase);
      await signIn(supabase, user.email, 'TestPass123!');

      const trustScores = await fetchTrustScores(supabase, user.id);

      expect(trustScores).toHaveLength(0);
    });

    it('should award community creation points when user creates community', async () => {
      const user = await createTestUser(supabase);
      await signIn(supabase, user.email, 'TestPass123!');

      // Get initial score (should be 0)
      let previousScore = 0; // New user has no scores

      // Create community (this should award 1000 points)
      const community = await createTestCommunity(supabase);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify community creation increment
      await verifyTrustScoreIncrement(
        user.id,
        community.id,
        previousScore,
        1000,
        'Community creation points',
      );

      // Verify log entry
      await verifyTrustScoreLog(
        user.id,
        community.id,
        'community_creation',
        1000,
        'Community creation log',
      );
    });

    it('should award community join points when user joins existing community', async () => {
      // Create community owner
      const owner = await createTestUser(supabase);
      await signIn(supabase, owner.email, 'TestPass123!');
      const community = await createTestCommunity(supabase);

      // Create new user to join the community
      const joiner = await createTestUser(supabase);
      await signIn(supabase, joiner.email, 'TestPass123!');

      // Get initial score (should be 0)
      const previousScore = await getCurrentTrustScore(joiner.id, community.id);

      // Join community
      await joinCommunity(supabase, community.id);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify community join increment
      await verifyTrustScoreIncrement(
        joiner.id,
        community.id,
        previousScore,
        POINTS_CONFIG.COMMUNITY_JOIN,
        'Community join points',
      );

      // Verify log entry
      await verifyTrustScoreLog(
        joiner.id,
        community.id,
        'community_join',
        POINTS_CONFIG.COMMUNITY_JOIN,
        'Community join log',
      );
    });
  });

  describe('Resource Points', () => {
    it('should award resource offer points when user creates offer', async () => {
      // User creates community (previous tests verified: 1000 points)
      const user = await createTestUser(supabase);
      await signIn(supabase, user.email, 'TestPass123!');
      const community = await createTestCommunity(supabase);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Get score after community creation
      const scoreAfterCommunity = await getCurrentTrustScore(user.id, community.id);

      // Create resource offer
      await createTestResource(supabase, community.id, 'offer');
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify resource offer increment
      await verifyTrustScoreIncrement(
        user.id,
        community.id,
        scoreAfterCommunity,
        POINTS_CONFIG.RESOURCE_OFFER,
        'Resource offer points',
      );
    });

    it('should not award points for non-offer resources', async () => {
      // User creates community (previous tests verified: 1000 points)
      const user = await createTestUser(supabase);
      await signIn(supabase, user.email, 'TestPass123!');
      const community = await createTestCommunity(supabase);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Get score after community creation
      const scoreAfterCommunity = await getCurrentTrustScore(user.id, community.id);

      // Create resource request (should not award additional points)
      await createTestResource(supabase, community.id, 'request');
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify no additional points awarded
      await verifyTrustScoreIncrement(
        user.id,
        community.id,
        scoreAfterCommunity,
        0,
        'No additional points for request resources',
      );
    });
  });

  describe('Event Participation Points', () => {
    it('should award initial points when user claims event', async () => {
      // Create event organizer and community (previous tests verified: 1000 points)
      const organizer = await createTestUser(supabase);
      await signIn(supabase, organizer.email, 'TestPass123!');
      const community = await createTestCommunity(supabase);

      // Create event
      const event = await createTestResource(supabase, community.id, 'event');
      const timeslot = await createTestResourceTimeslot(supabase, event.id);

      // Create participant (joins community: 50 points)
      const participant = await createTestUser(supabase);
      await signIn(supabase, participant.email, 'TestPass123!');
      await joinCommunity(supabase, community.id);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Get score before claiming event
      const scoreBeforeClaim = await getCurrentTrustScore(
        participant.id,
        community.id,
      );

      // Claim event (should add 5 points)
      await createResourceClaim(supabase, {
        resourceId: event.id,
        timeslotId: timeslot.id,
        status: 'pending',
      });
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify event claim increment
      await verifyTrustScoreIncrement(
        participant.id,
        community.id,
        scoreBeforeClaim,
        POINTS_CONFIG.EVENT_CLAIM_INITIAL,
        'Event claim points',
      );
    });

    it('should award additional points when event claim is confirmed', async () => {
      // Setup from previous test: organizer creates community and event
      const organizer = await createTestUser(supabase);
      await signIn(supabase, organizer.email, 'TestPass123!');
      const community = await createTestCommunity(supabase);
      const event = await createTestResource(supabase, community.id, 'event');
      const timeslot = await createTestResourceTimeslot(supabase, event.id);

      // Participant joins and claims event (previous test verified: 50 + 5 = 55 points)
      const participant = await createTestUser(supabase);
      await signIn(supabase, participant.email, 'TestPass123!');
      await joinCommunity(supabase, community.id);
      const claim = await createResourceClaim(supabase, {
        resourceId: event.id,
        timeslotId: timeslot.id,
        status: 'pending',
      });
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Get score before confirmation
      const scoreBeforeConfirm = await getCurrentTrustScore(
        participant.id,
        community.id,
      );

      // Sign back in as organizer to confirm the claim
      await signIn(supabase, organizer.email, 'TestPass123!');
      // Confirm the claim (should add 25 points)
      await updateResourceClaim(supabase, { id: claim.id, status: 'approved' });
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify confirmation increment
      await verifyTrustScoreIncrement(
        participant.id,
        community.id,
        scoreBeforeConfirm,
        POINTS_CONFIG.EVENT_CLAIM_CONFIRMED,
        'Event confirmation points',
      );
    });

    it('should award completion points when event is completed', async () => {
      // Setup from previous tests: full event flow to confirmed status (55 + 25 = 80 points)
      const organizer = await createTestUser(supabase);
      await signIn(supabase, organizer.email, 'TestPass123!');
      const community = await createTestCommunity(supabase);
      const event = await createTestResource(supabase, community.id, 'event');
      const timeslot = await createTestResourceTimeslot(supabase, event.id);

      const participant = await createTestUser(supabase);
      await signIn(supabase, participant.email, 'TestPass123!');
      await joinCommunity(supabase, community.id);
      const claim = await createResourceClaim(supabase, {
        resourceId: event.id,
        timeslotId: timeslot.id,
        status: 'pending',
      });
      await updateResourceClaim(supabase, { id: claim.id, status: 'approved' });
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Get score before completion
      const scoreBeforeCompletion = await getCurrentTrustScore(
        participant.id,
        community.id,
      );

      // Sign back in as participant to complete the event
      await signIn(supabase, participant.email, 'TestPass123!');
      // Complete the event (should add completion points)
      await updateResourceClaim(supabase, {
        id: claim.id,
        status: 'completed',
      });
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify completion increment
      await verifyTrustScoreIncrement(
        participant.id,
        community.id,
        scoreBeforeCompletion,
        POINTS_CONFIG.EVENT_COMPLETION,
        'Event completion points',
      );

      // Verify log entry
      await verifyTrustScoreLog(
        participant.id,
        community.id,
        'resource_completion',
        POINTS_CONFIG.EVENT_COMPLETION,
        'Event completion log',
      );
    });
  });

  describe('Resource Creation Points', () => {
    it('should award correct points for creating resource offers', async () => {
      const user = await createTestUser(supabase);
      await signIn(supabase, user.email, 'TestPass123!');

      const community = await createTestCommunity(supabase);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Get score after community creation
      const scoreAfterCommunity = await getCurrentTrustScore(user.id, community.id);

      // Create a resource offer
      const resource = await createTestResource(
        supabase,
        community.id,
        'offer',
      );

      // Wait for trigger
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify resource offer increment
      await verifyTrustScoreIncrement(
        user.id,
        community.id,
        scoreAfterCommunity,
        POINTS_CONFIG.RESOURCE_OFFER,
        'Resource offer creation',
      );

      // Verify resource offer log entry
      await verifyTrustScoreLog(
        user.id,
        community.id,
        'resource_offer',
        POINTS_CONFIG.RESOURCE_OFFER,
        'Resource offer log',
      );
    });

    it('should not award points for non-offer resources', async () => {
      const user = await createTestUser(supabase);
      await signIn(supabase, user.email, 'TestPass123!');

      const community = await createTestCommunity(supabase);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Get score after community creation
      const scoreAfterCommunity = await getCurrentTrustScore(user.id, community.id);

      // Create a resource request (should not award points)
      await createTestResource(supabase, community.id, 'request');

      // Wait for trigger
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify no additional points awarded
      await verifyTrustScoreIncrement(
        user.id,
        community.id,
        scoreAfterCommunity,
        0,
        'Request resource (no additional points)',
      );
    });
  });

  describe('Event Participation Points', () => {
    it('should award correct points for event claim progression', async () => {
      // Create event organizer
      const organizer = await createTestUser(supabase);
      await signIn(supabase, organizer.email, 'TestPass123!');

      const community = await createTestCommunity(supabase);

      // Create event
      const event = await createTestResource(supabase, community.id, 'event');
      const timeslot = await createTestResourceTimeslot(supabase, event.id);

      // Create participant
      const participantClient = createTestClient();
      const participant = await createTestUser(participantClient);
      await signIn(participantClient, participant.email, 'TestPass123!');
      await joinCommunity(participantClient, community.id);

      // Wait for initial setup
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Claim the event (should award initial points)
      const claim = await createResourceClaim(participantClient, {
        resourceId: event.id,
        timeslotId: timeslot.id,
        status: 'pending',
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Get score before claim
      const scoreBeforeClaim = await getCurrentTrustScore(
        participant.id,
        community.id,
      );

      // Verify initial claim increment
      const scoreAfterClaim = await getCurrentTrustScore(
        participant.id,
        community.id,
      );
      await verifyTrustScoreIncrement(
        participant.id,
        community.id,
        scoreBeforeClaim,
        POINTS_CONFIG.EVENT_CLAIM_INITIAL,
        'Event claim (pending)',
      );

      // Get score before approval
      const scoreBeforeApproval = await getCurrentTrustScore(
        participant.id,
        community.id,
      );

      // Sign back in as organizer to approve the claim
      await signIn(supabase, organizer.email, 'TestPass123!');
      await updateResourceClaim(supabase, {
        id: claim.id,
        status: 'approved',
      });
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify confirmed increment
      await verifyTrustScoreIncrement(
        participant.id,
        community.id,
        scoreBeforeApproval,
        POINTS_CONFIG.EVENT_CLAIM_CONFIRMED,
        'Event claim (confirmed)',
      );

      // Get score before completion
      const scoreBeforeCompletion = await getCurrentTrustScore(
        participant.id,
        community.id,
      );

      // Sign back in as participant to complete the event
      await signIn(participantClient, participant.email, 'TestPass123!');
      await updateResourceClaim(participantClient, {
        id: claim.id,
        status: 'completed',
      });
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify completion increment
      await verifyTrustScoreIncrement(
        participant.id,
        community.id,
        scoreBeforeCompletion,
        POINTS_CONFIG.EVENT_COMPLETION,
        'Event completion',
      );

      // Verify log entries for completion
      await verifyTrustScoreLog(
        participant.id,
        community.id,
        'resource_completion',
        POINTS_CONFIG.EVENT_COMPLETION,
        'Event completion log',
      );
    });
  });

  describe('Shoutout Points', () => {
    it('should award correct points for sending and receiving shoutouts', async () => {
      // Create sender
      const sender = await createTestUser(supabase);
      await signIn(supabase, sender.email, 'TestPass123!');

      const community = await createTestCommunity(supabase);

      // Create receiver
      const receiver = await createTestUser(supabase);
      await signIn(supabase, receiver.email, 'TestPass123!');
      await joinCommunity(supabase, community.id);

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Sign back in as sender to create the shoutout
      await signIn(supabase, sender.email, 'TestPass123!');

      // Get scores before shoutout
      const senderScoreBefore = await getCurrentTrustScore(
        sender.id,
        community.id,
      );
      const receiverScoreBefore = await getCurrentTrustScore(
        receiver.id,
        community.id,
      );

      // Create shoutout (this will also create a resource since resource_id is required)
      await createTestShoutout(supabase, {
        senderId: sender.id,
        receiverId: receiver.id,
        communityId: community.id,
        message: 'Great job!',
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify sender increment (shoutout sent + resource created)
      await verifyTrustScoreIncrement(
        sender.id,
        community.id,
        senderScoreBefore,
        POINTS_CONFIG.RESOURCE_OFFER + POINTS_CONFIG.SHOUTOUT_SENT,
        'Shoutout sender increment',
      );

      // Verify receiver increment (shoutout received)
      await verifyTrustScoreIncrement(
        receiver.id,
        community.id,
        receiverScoreBefore,
        POINTS_CONFIG.SHOUTOUT_RECEIVED,
        'Shoutout receiver increment',
      );

      // Verify log entries
      await verifyTrustScoreLog(
        sender.id,
        community.id,
        'shoutout_sent',
        POINTS_CONFIG.SHOUTOUT_SENT,
        'Shoutout sent log',
      );

      await verifyTrustScoreLog(
        receiver.id,
        community.id,
        'shoutout_received',
        POINTS_CONFIG.SHOUTOUT_RECEIVED,
        'Shoutout received log',
      );
    });
  });

  describe('Complex User Journey Integration', () => {
    it('should correctly track cumulative points across multiple actions', async () => {
      const user = await createTestUser(supabase);
      await signIn(supabase, user.email, 'TestPass123!');

      const community = await createTestCommunity(supabase);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Get initial score after community creation
      let currentScore = await getCurrentTrustScore(user.id, community.id);

      // Step 1: Create resource offer
      await createTestResource(supabase, community.id, 'offer');
      await new Promise((resolve) => setTimeout(resolve, 300));
      await verifyTrustScoreIncrement(
        user.id,
        community.id,
        currentScore,
        POINTS_CONFIG.RESOURCE_OFFER,
        'First resource offer',
      );
      currentScore += POINTS_CONFIG.RESOURCE_OFFER;

      // Step 2: Create another user for shoutout
      const otherUser = await createTestUser(supabase);
      await signIn(supabase, otherUser.email, 'TestPass123!');
      await joinCommunity(supabase, community.id);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 3: Send shoutout using existing resource to avoid extra points
      const { data: existingResources } = await serviceClient
        .from('resources')
        .select('id')
        .eq('community_id', community.id)
        .limit(1);
      
      const resourceId = existingResources?.[0]?.id;
      if (!resourceId) {
        throw new Error('No existing resource found for shoutout');
      }

      await createTestShoutout(supabase, {
        senderId: user.id,
        receiverId: otherUser.id,
        communityId: community.id,
        message: 'Welcome to the community!',
        resourceId,
      });
      await new Promise((resolve) => setTimeout(resolve, 300));
      await verifyTrustScoreIncrement(
        user.id,
        community.id,
        currentScore,
        POINTS_CONFIG.SHOUTOUT_SENT,
        'Shoutout sent',
      );
      currentScore += POINTS_CONFIG.SHOUTOUT_SENT;

      // Verify we have multiple log entries
      const { data: logs } = await serviceClient
        .from('trust_score_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('community_id', community.id)
        .order('created_at', { ascending: true });

      expect(logs).toBeDefined();
      expect(logs!.length).toBeGreaterThanOrEqual(3);

      const actionTypes = logs!.map((log) => log.action_type);
      expect(actionTypes).toContain('community_creation');
      expect(actionTypes).toContain('resource_offer');
      expect(actionTypes).toContain('shoutout_sent');
    });

    it('should handle edge case with no double-counting on repeated actions', async () => {
      const user = await createTestUser(supabase);
      await signIn(supabase, user.email, 'TestPass123!');

      const community = await createTestCommunity(supabase);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Get score after community creation
      let currentScore = await getCurrentTrustScore(user.id, community.id);

      // Create first resource offer
      await createTestResource(supabase, community.id, 'offer');
      await new Promise((resolve) => setTimeout(resolve, 300));
      await verifyTrustScoreIncrement(
        user.id,
        community.id,
        currentScore,
        POINTS_CONFIG.RESOURCE_OFFER,
        'First resource offer',
      );
      currentScore += POINTS_CONFIG.RESOURCE_OFFER;

      // Create second resource offer
      await createTestResource(supabase, community.id, 'offer');
      await new Promise((resolve) => setTimeout(resolve, 300));
      await verifyTrustScoreIncrement(
        user.id,
        community.id,
        currentScore,
        POINTS_CONFIG.RESOURCE_OFFER,
        'Second resource offer',
      );

      // Verify we have the correct number of resource offer log entries
      const { data: logs } = await serviceClient
        .from('trust_score_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('community_id', community.id)
        .eq('action_type', 'resource_offer');

      expect(logs).toBeDefined();
      expect(logs!.length).toBe(2);
    });
  });
});

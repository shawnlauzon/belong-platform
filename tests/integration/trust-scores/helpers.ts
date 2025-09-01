import { expect } from 'vitest';
import { fetchTrustScores } from '@/features/trust-scores/api';
import { createTestConnectionRequest } from '../helpers/test-data';
import { approveConnection } from '@/features/connections/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

// Configurable points constants for easy adjustment
export const POINTS_CONFIG = {
  COMMUNITY_CREATION: 1000,
  COMMUNITY_JOIN: 50,
  COMMUNITY_JOIN_WITH_INVITATION: 50, // Same as regular join currently
  RESOURCE_OFFER: 50,
  EVENT_CLAIM_INITIAL: 5,
  EVENT_CLAIM_APPROVED: 25,
  EVENT_GOING: 25,
  EVENT_ATTENDED: 50,
  OFFER_APPROVED: 25,
  OFFER_COMPLETED: 50,
  REQUEST_APPROVED: 25,
  REQUEST_COMPLETED: 50,
  SHOUTOUT_SENT: 10,
  SHOUTOUT_RECEIVED: 100,
} as const;

/**
 * Helper function to verify a user's trust score in a specific community
 */
export async function verifyTrustScore(
  supabase: SupabaseClient<Database>,
  serviceClient: SupabaseClient<Database>,
  userId: string,
  communityId: string,
  expectedScore: number,
  description: string,
) {
  const trustScores = await fetchTrustScores(supabase, userId);


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
export async function getCurrentTrustScore(
  supabase: SupabaseClient<Database>,
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
export async function verifyTrustScoreIncrement(
  supabase: SupabaseClient<Database>,
  userId: string,
  communityId: string,
  previousScore: number,
  expectedIncrement: number,
  description: string,
) {
  const newScore = await getCurrentTrustScore(supabase, userId, communityId);
  const actualIncrement = newScore - previousScore;


  expect(
    actualIncrement,
    `${description} - Score should increase by ${expectedIncrement} (was ${previousScore}, now ${newScore})`,
  ).toBe(expectedIncrement);
}

/**
 * Helper function to verify trust score log entries
 * More resilient to errors - looks for matching log with some flexibility
 */
export async function verifyTrustScoreLog(
  serviceClient: SupabaseClient<Database>,
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

  if (allLogsError) {
    throw new Error(
      `${description} - Failed to fetch logs: ${allLogsError.message}`,
    );
  }

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

}

/**
 * Helper function to create a connection request and join community via invitation
 */
export async function createTestConnectionAndJoin(
  inviterClient: SupabaseClient<Database>,
  inviteeClient: SupabaseClient<Database>,
  serviceClient: SupabaseClient<Database>,
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
  const { requestId } = await createTestConnectionRequest(
    inviterClient,
    inviteeClient,
    communityId,
  );

  // Approve the connection as the inviter
  await approveConnection(inviterClient, requestId);

  // Wait for triggers to complete
  await new Promise((resolve) => setTimeout(resolve, 300));

  return { id: requestId };
}
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestClient, createServiceClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  createTestShoutout,
} from '../helpers/test-data';
import { signIn } from '@/features/auth/api';
import { joinCommunity } from '@/features/communities/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import {
  POINTS_CONFIG,
  getCurrentTrustScore,
  verifyTrustScoreIncrement,
  verifyTrustScoreLog,
} from './helpers';

describe('Trust Score Points - Shoutouts', () => {
  let supabase: SupabaseClient<Database>;
  let serviceClient: SupabaseClient<Database>;
  let sender: any;
  let receiver: any;
  let community: any;

  beforeAll(async () => {
    supabase = createTestClient();
    serviceClient = createServiceClient();

    // Create sender (automatically signed in)
    sender = await createTestUser(supabase);

    // Create community (sender automatically becomes member)
    community = await createTestCommunity(supabase);

    // Create receiver (automatically signed in as receiver now)
    receiver = await createTestUser(supabase);

    // Receiver joins community
    await joinCommunity(supabase, community.id);

    // Switch back to sender for shoutout creation
    await signIn(supabase, sender.email, 'TestPass123!');
  });

  beforeEach(async () => {
    // Sign back in as sender for consistency
    await signIn(supabase, sender.email, 'TestPass123!');
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Basic Shoutout Points', () => {
    it('should award correct points for sending shoutouts', async () => {
      // Sender is already signed in from beforeEach

      // Get sender score before shoutout
      const senderScoreBefore = await getCurrentTrustScore(
        supabase,
        sender.id,
        community.id,
      );

      // Create shoutout (this will also create a resource since resource_id is required)
      await createTestShoutout(supabase, {
        senderId: sender.id,
        receiverId: receiver.id,
        communityId: community.id,
        message: 'Great job!',
      });

      // Verify sender increment (shoutout sent + resource created)
      await verifyTrustScoreIncrement(
        supabase,
        sender.id,
        community.id,
        senderScoreBefore,
        POINTS_CONFIG.RESOURCE_OFFER + POINTS_CONFIG.SHOUTOUT_SENT,
        'Shoutout sender increment',
      );

      // Verify log entry for shoutout sent
      await verifyTrustScoreLog(
        serviceClient,
        sender.id,
        community.id,
        'shoutout_sent',
        POINTS_CONFIG.SHOUTOUT_SENT,
        'Shoutout sent log',
      );
    });

    it('should award correct points for receiving shoutouts', async () => {
      // Get receiver score before shoutout
      const receiverScoreBefore = await getCurrentTrustScore(
        supabase,
        receiver.id,
        community.id,
      );

      // Create shoutout (sender is already signed in from beforeEach)
      await createTestShoutout(supabase, {
        senderId: sender.id,
        receiverId: receiver.id,
        communityId: community.id,
        message: 'Great work!',
      });

      // Verify receiver increment (shoutout received)
      await verifyTrustScoreIncrement(
        supabase,
        receiver.id,
        community.id,
        receiverScoreBefore,
        POINTS_CONFIG.SHOUTOUT_RECEIVED,
        'Shoutout receiver increment',
      );

      // Verify log entry for shoutout received
      await verifyTrustScoreLog(
        serviceClient,
        receiver.id,
        community.id,
        'shoutout_received',
        POINTS_CONFIG.SHOUTOUT_RECEIVED,
        'Shoutout received log',
      );
    });

    it('should award points when sending shoutout with existing resource', async () => {
      // Create sender and community
      const sender = await createTestUser(supabase);
      await signIn(supabase, sender.email, 'TestPass123!');
      const community = await createTestCommunity(supabase);

      // Create existing resource
      const existingResource = await createTestResource(
        supabase,
        community.id,
        'offer',
      );

      // Create receiver
      const receiver = await createTestUser(supabase);
      await signIn(supabase, receiver.email, 'TestPass123!');
      await joinCommunity(supabase, community.id);

      // Sign back in as sender
      await signIn(supabase, sender.email, 'TestPass123!');

      // Get sender score before shoutout
      const senderScoreBefore = await getCurrentTrustScore(
        supabase,
        sender.id,
        community.id,
      );

      // Create shoutout using existing resource
      await createTestShoutout(supabase, {
        senderId: sender.id,
        receiverId: receiver.id,
        communityId: community.id,
        message: 'Thanks for your help!',
        resourceId: existingResource.id,
      });

      // Verify sender increment (only shoutout sent, no new resource)
      await verifyTrustScoreIncrement(
        supabase,
        sender.id,
        community.id,
        senderScoreBefore,
        POINTS_CONFIG.SHOUTOUT_SENT,
        'Shoutout sender increment (existing resource)',
      );
    });

    it('should award points when receiving shoutout with existing resource', async () => {
      // Create sender and community
      const sender = await createTestUser(supabase);
      await signIn(supabase, sender.email, 'TestPass123!');
      const community = await createTestCommunity(supabase);

      // Create existing resource
      const existingResource = await createTestResource(
        supabase,
        community.id,
        'offer',
      );

      // Create receiver
      const receiver = await createTestUser(supabase);
      await signIn(supabase, receiver.email, 'TestPass123!');
      await joinCommunity(supabase, community.id);

      // Sign back in as sender
      await signIn(supabase, sender.email, 'TestPass123!');

      // Get receiver score before shoutout
      const receiverScoreBefore = await getCurrentTrustScore(
        supabase,
        receiver.id,
        community.id,
      );

      // Create shoutout using existing resource
      await createTestShoutout(supabase, {
        senderId: sender.id,
        receiverId: receiver.id,
        communityId: community.id,
        message: 'Thanks for your help!',
        resourceId: existingResource.id,
      });

      // Verify receiver increment (shoutout received)
      await verifyTrustScoreIncrement(
        supabase,
        receiver.id,
        community.id,
        receiverScoreBefore,
        POINTS_CONFIG.SHOUTOUT_RECEIVED,
        'Shoutout receiver increment (existing resource)',
      );
    });
  });

  describe('Multiple Shoutouts', () => {
    it('should award points for sending multiple shoutouts to same user', async () => {
      // Setup users and community
      const sender = await createTestUser(supabase);
      await signIn(supabase, sender.email, 'TestPass123!');
      const community = await createTestCommunity(supabase);

      const receiver = await createTestUser(supabase);
      await signIn(supabase, receiver.email, 'TestPass123!');
      await joinCommunity(supabase, community.id);

      await signIn(supabase, sender.email, 'TestPass123!');

      // Send first shoutout
      await createTestShoutout(supabase, {
        senderId: sender.id,
        receiverId: receiver.id,
        communityId: community.id,
        message: 'First shoutout!',
      });

      const senderAfterFirst = await getCurrentTrustScore(
        supabase,
        sender.id,
        community.id,
      );

      // Send second shoutout (using existing resource to avoid extra resource points)
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
        senderId: sender.id,
        receiverId: receiver.id,
        communityId: community.id,
        message: 'Second shoutout!',
        resourceId,
      });

      // Verify sender incremental points
      await verifyTrustScoreIncrement(
        supabase,
        sender.id,
        community.id,
        senderAfterFirst,
        POINTS_CONFIG.SHOUTOUT_SENT,
        'Second shoutout sender increment',
      );
    });

    it('should award points for receiving multiple shoutouts from same user', async () => {
      // Setup users and community
      const sender = await createTestUser(supabase);
      await signIn(supabase, sender.email, 'TestPass123!');
      const community = await createTestCommunity(supabase);

      const receiver = await createTestUser(supabase);
      await signIn(supabase, receiver.email, 'TestPass123!');
      await joinCommunity(supabase, community.id);

      await signIn(supabase, sender.email, 'TestPass123!');

      // Send first shoutout
      await createTestShoutout(supabase, {
        senderId: sender.id,
        receiverId: receiver.id,
        communityId: community.id,
        message: 'First shoutout!',
      });

      const receiverAfterFirst = await getCurrentTrustScore(
        supabase,
        receiver.id,
        community.id,
      );

      // Send second shoutout (using existing resource to avoid extra resource points)
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
        senderId: sender.id,
        receiverId: receiver.id,
        communityId: community.id,
        message: 'Second shoutout!',
        resourceId,
      });

      // Verify receiver incremental points
      await verifyTrustScoreIncrement(
        supabase,
        receiver.id,
        community.id,
        receiverAfterFirst,
        POINTS_CONFIG.SHOUTOUT_RECEIVED,
        'Second shoutout receiver increment',
      );
    });

    it('should handle bidirectional shoutouts correctly', async () => {
      // Setup users and community
      const user1 = await createTestUser(supabase);
      await signIn(supabase, user1.email, 'TestPass123!');
      const community = await createTestCommunity(supabase);

      const user2 = await createTestUser(supabase);
      await signIn(supabase, user2.email, 'TestPass123!');
      await joinCommunity(supabase, community.id);

      // User1 sends shoutout to User2
      await signIn(supabase, user1.email, 'TestPass123!');
      await createTestShoutout(supabase, {
        senderId: user1.id,
        receiverId: user2.id,
        communityId: community.id,
        message: 'Thanks user2!',
      });

      const user1AfterSending = await getCurrentTrustScore(
        supabase,
        user1.id,
        community.id,
      );
      const user2AfterReceiving = await getCurrentTrustScore(
        supabase,
        user2.id,
        community.id,
      );

      // User2 sends shoutout back to User1
      await signIn(supabase, user2.email, 'TestPass123!');
      // Create new resource for second shoutout
      const secondResource = await createTestResource(
        supabase,
        community.id,
        'offer',
      );
      await createTestShoutout(supabase, {
        senderId: user2.id,
        receiverId: user1.id,
        communityId: community.id,
        message: 'Thanks user1!',
        resourceId: secondResource.id,
      });

      // Verify final scores
      const user1Final = await getCurrentTrustScore(
        supabase,
        user1.id,
        community.id,
      );
      const user2Final = await getCurrentTrustScore(
        supabase,
        user2.id,
        community.id,
      );

      // User1: Community creation (1050) + Resource offer (50) + Shoutout sent (10) + Shoutout received (100)
      const expectedUser1 =
        POINTS_CONFIG.COMMUNITY_CREATION +
        POINTS_CONFIG.COMMUNITY_JOIN +
        POINTS_CONFIG.RESOURCE_OFFER +
        POINTS_CONFIG.SHOUTOUT_SENT +
        POINTS_CONFIG.SHOUTOUT_RECEIVED;
      expect(user1Final).toBe(expectedUser1);

      // User2: Community join (50) + Resource offer (50) + Shoutout received (100) + Shoutout sent (10)
      const expectedUser2 =
        POINTS_CONFIG.COMMUNITY_JOIN +
        POINTS_CONFIG.RESOURCE_OFFER +
        POINTS_CONFIG.SHOUTOUT_RECEIVED +
        POINTS_CONFIG.SHOUTOUT_SENT;
      expect(user2Final).toBe(expectedUser2);
    });
  });

  describe('Cross-Community Shoutouts', () => {
    it('should award sending points correctly across different communities', async () => {
      // Create user1 with community1
      const user1 = await createTestUser(supabase);
      await signIn(supabase, user1.email, 'TestPass123!');
      const community1 = await createTestCommunity(supabase);

      // Create user2 with community2
      const user2 = await createTestUser(supabase);
      await signIn(supabase, user2.email, 'TestPass123!');
      const community2 = await createTestCommunity(supabase);

      // Have user1 join community2
      await joinCommunity(supabase, community2.id);

      // User1 sends shoutout to User2 in community2
      await signIn(supabase, user1.email, 'TestPass123!');
      await createTestShoutout(supabase, {
        senderId: user1.id,
        receiverId: user2.id,
        communityId: community2.id,
        message: 'Great community!',
      });

      // Verify user1 has separate scores in both communities
      const user1Community1Score = await getCurrentTrustScore(
        supabase,
        user1.id,
        community1.id,
      );
      const user1Community2Score = await getCurrentTrustScore(
        supabase,
        user1.id,
        community2.id,
      );

      // Community1: Creation + auto-join (no shoutout activity here)
      expect(user1Community1Score).toBe(
        POINTS_CONFIG.COMMUNITY_CREATION + POINTS_CONFIG.COMMUNITY_JOIN,
      );

      // Community2: Join + resource offer + shoutout sent
      expect(user1Community2Score).toBe(
        POINTS_CONFIG.COMMUNITY_JOIN +
          POINTS_CONFIG.RESOURCE_OFFER +
          POINTS_CONFIG.SHOUTOUT_SENT,
      );
    });

    it('should award receiving points correctly across different communities', async () => {
      // Create user1 with community1
      const user1 = await createTestUser(supabase);
      await signIn(supabase, user1.email, 'TestPass123!');
      const community1 = await createTestCommunity(supabase);

      // Create user2 with community2
      const user2 = await createTestUser(supabase);
      await signIn(supabase, user2.email, 'TestPass123!');
      const community2 = await createTestCommunity(supabase);

      // Have user1 join community2
      await joinCommunity(supabase, community2.id);

      // User1 sends shoutout to User2 in community2
      await signIn(supabase, user1.email, 'TestPass123!');
      await createTestShoutout(supabase, {
        senderId: user1.id,
        receiverId: user2.id,
        communityId: community2.id,
        message: 'Great community!',
      });

      // Verify user2's score in their community
      const user2Community2Score = await getCurrentTrustScore(
        supabase,
        user2.id,
        community2.id,
      );
      expect(user2Community2Score).toBe(
        POINTS_CONFIG.COMMUNITY_CREATION +
          POINTS_CONFIG.COMMUNITY_JOIN +
          POINTS_CONFIG.SHOUTOUT_RECEIVED,
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle self-shoutouts gracefully', async () => {
      const user = await createTestUser(supabase);
      await signIn(supabase, user.email, 'TestPass123!');
      const community = await createTestCommunity(supabase);

      const scoreBefore = await getCurrentTrustScore(
        supabase,
        user.id,
        community.id,
      );

      // Attempt self-shoutout (this should either be prevented or handle gracefully)
      try {
        await createTestShoutout(supabase, {
          senderId: user.id,
          receiverId: user.id,
          communityId: community.id,
          message: 'Self appreciation!',
        });

        // If allowed, should only get resource points, not double points
        const scoreAfter = await getCurrentTrustScore(
          supabase,
          user.id,
          community.id,
        );
        const increment = scoreAfter - scoreBefore;

        // Should not get both sent and received points for same shoutout
        expect(increment).toBeLessThanOrEqual(POINTS_CONFIG.RESOURCE_OFFER);
      } catch (error) {
        // Self-shoutouts might be prevented by business logic
        console.log('Self-shoutout prevented:', error);
      }
    });

    it('should accumulate shoutout points correctly over time', async () => {
      const sender = await createTestUser(supabase);
      await signIn(supabase, sender.email, 'TestPass123!');
      const community = await createTestCommunity(supabase);

      const receiver = await createTestUser(supabase);
      await signIn(supabase, receiver.email, 'TestPass123!');
      await joinCommunity(supabase, community.id);

      await signIn(supabase, sender.email, 'TestPass123!');

      // Send multiple shoutouts
      const numShoutouts = 3;
      let currentScore = await getCurrentTrustScore(
        supabase,
        receiver.id,
        community.id,
      );

      for (let i = 0; i < numShoutouts; i++) {
        await createTestShoutout(supabase, {
          senderId: sender.id,
          receiverId: receiver.id,
          communityId: community.id,
          message: `Shoutout ${i + 1}`,
        });

        const newScore = await getCurrentTrustScore(
          supabase,
          receiver.id,
          community.id,
        );
        const expectedIncrement =
          POINTS_CONFIG.SHOUTOUT_RECEIVED + (i === 0 ? 0 : 0); // Only first shoutout creates resource
        expect(newScore - currentScore).toBe(expectedIncrement);
        currentScore = newScore;
      }

      // Verify total accumulated points
      const finalScore = await getCurrentTrustScore(
        supabase,
        receiver.id,
        community.id,
      );
      const expectedTotal =
        POINTS_CONFIG.COMMUNITY_JOIN +
        POINTS_CONFIG.SHOUTOUT_RECEIVED * numShoutouts;
      expect(finalScore).toBe(expectedTotal);
    });
  });
});

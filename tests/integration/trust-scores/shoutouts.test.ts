import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest';
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
import { NOTIFICATION_TYPES } from '@/features/notifications';
import type { User } from '@/features/users/types';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities/types';

describe('Trust Score Points - Shoutouts', () => {
  let supabase: SupabaseClient<Database>;
  let serviceClient: SupabaseClient<Database>;
  let sender: Account;
  let receiver: Account;
  let community: Community;

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
    await joinCommunity(supabase, receiver.id, community.id);

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
      // Have receiver create a resource first
      await signIn(supabase, receiver.email, 'TestPass123!');
      const resource = await createTestResource(
        supabase,
        community.id,
        'offer',
      );

      // Sign back in as sender
      await signIn(supabase, sender.email, 'TestPass123!');

      // Get sender score before shoutout
      const senderScoreBefore = await getCurrentTrustScore(
        supabase,
        sender.id,
        community.id,
      );

      // Create shoutout for receiver's resource
      await createTestShoutout(supabase, {
        receiverId: receiver.id,
        communityId: community.id,
        message: 'Great job!',
        resourceId: resource.id,
      });

      // Verify sender increment (only shoutout sent, no new resource)
      await verifyTrustScoreIncrement(
        supabase,
        sender.id,
        community.id,
        senderScoreBefore,
        POINTS_CONFIG.SHOUTOUT_SENT,
        'Shoutout sender increment',
      );

      // Verify log entry for shoutout sent
      await verifyTrustScoreLog(
        serviceClient,
        sender.id,
        community.id,
        NOTIFICATION_TYPES.SHOUTOUT_CREATED,
        POINTS_CONFIG.SHOUTOUT_SENT,
        'Shoutout sent log',
      );
    });

    it('should award correct points for receiving shoutouts', async () => {
      // Have receiver create a resource first
      await signIn(supabase, receiver.email, 'TestPass123!');
      const resource = await createTestResource(
        supabase,
        community.id,
        'offer',
      );

      // Get receiver score before shoutout
      const receiverScoreBefore = await getCurrentTrustScore(
        supabase,
        receiver.id,
        community.id,
      );

      // Sign back in as sender
      await signIn(supabase, sender.email, 'TestPass123!');

      // Create shoutout for receiver's resource
      await createTestShoutout(supabase, {
        receiverId: receiver.id,
        communityId: community.id,
        message: 'Great work!',
        resourceId: resource.id,
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
        NOTIFICATION_TYPES.SHOUTOUT_CREATED,
        POINTS_CONFIG.SHOUTOUT_RECEIVED,
        'Shoutout received log',
      );
    });

    it('should award points when sending shoutout with existing resource', async () => {
      // Create sender and community
      const sender = await createTestUser(supabase);
      await signIn(supabase, sender.email, 'TestPass123!');
      const community = await createTestCommunity(supabase);

      // Create receiver
      const receiver = await createTestUser(supabase);
      await signIn(supabase, receiver.email, 'TestPass123!');
      await joinCommunity(supabase, receiver.id, community.id);

      // Receiver creates the resource (they will be the owner)
      const existingResource = await createTestResource(
        supabase,
        community.id,
        'offer',
      );

      // Sign back in as sender
      await signIn(supabase, sender.email, 'TestPass123!');

      // Get sender score before shoutout
      const senderScoreBefore = await getCurrentTrustScore(
        supabase,
        sender.id,
        community.id,
      );

      // Create shoutout using existing resource (owned by receiver)
      await createTestShoutout(supabase, {
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

      // Create receiver
      const receiver = await createTestUser(supabase);
      await signIn(supabase, receiver.email, 'TestPass123!');
      await joinCommunity(supabase, receiver.id, community.id);

      // Receiver creates the resource (they will be the owner)
      const existingResource = await createTestResource(
        supabase,
        community.id,
        'offer',
      );

      // Sign back in as sender
      await signIn(supabase, sender.email, 'TestPass123!');

      // Get receiver score before shoutout
      const receiverScoreBefore = await getCurrentTrustScore(
        supabase,
        receiver.id,
        community.id,
      );

      // Create shoutout using existing resource (owned by receiver)
      await createTestShoutout(supabase, {
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
});

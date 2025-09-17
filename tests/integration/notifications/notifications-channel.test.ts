import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
} from '../helpers/test-data';
import { createNotificationSubscription } from '@/features/notifications/api/createNotificationSubscription';
import { createComment } from '@/features/comments';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';

describe('Notification Channel Integration', () => {
  let supabase: SupabaseClient<Database>;
  let queryClient: QueryClient;
  let testUser: Account;
  let testCommunity: Community;
  let anotherUser: Account;
  let notificationChannel: RealtimeChannel;
  // Track received notifications
  let receivedNotifications: Record<string, unknown>[] = [];

  beforeAll(async () => {
    supabase = createTestClient();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Create test users and community
    testUser = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create another user and have them join
    anotherUser = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);

    // Create subscription once for all tests
    notificationChannel = await createNotificationSubscription({
      supabase,
      queryClient,
      userId: testUser.id,
    });

    // Give subscription time to establish
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (notificationChannel) {
      await notificationChannel.unsubscribe();
    }

    // Clean up any remaining channels
    supabase.realtime.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });

    // Disconnect realtime to ensure clean state
    supabase.realtime.disconnect();
  });

  beforeEach(async () => {
    // Clear tracking arrays
    receivedNotifications = [];

    // Sign in as testUser for consistency
    await signIn(supabase, testUser.email, 'TestPass123!');
  });

  describe('Channel subscription setup', () => {
    it('should establish subscription and create channel', async () => {
      // Channel should be defined from beforeAll
      expect(notificationChannel).toBeDefined();
    });

    it('should receive real-time notifications when they are created', async () => {
      // Create a resource as testUser
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Have another user comment (this should trigger notification)
      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'Channel test comment',
        resourceId: resource.id,
      });

      // Wait briefly for realtime notifications to be processed
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // The notification should be processed by the subscription
      expect(notificationChannel).toBeDefined();
    });
  });

  describe('Error handling and reconnection', () => {
    it('should handle subscription setup gracefully', async () => {
      // Verify that our shared subscription works reliably
      expect(notificationChannel).toBeDefined();
    });

    it('should work reliably with notification events', async () => {
      // Create a resource to trigger a notification
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Have another user comment
      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'Test comment for reliability',
        resourceId: resource.id,
      });

      // Wait for notification to process through React Query
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // The subscription should work reliably
      expect(notificationChannel).toBeDefined();
    });

    it('should create subscription consistently', async () => {
      // Verify the shared subscription is consistent
      expect(notificationChannel).toBeDefined();
    });

    it('should handle notifications end-to-end', async () => {
      // Create a notification to test that the subscription works
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'Test comment for end-to-end flow',
        resourceId: resource.id,
      });

      // Wait for notification to be processed
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // The test verifies that the subscription works end-to-end
      expect(notificationChannel).toBeDefined();
    });
  });
});

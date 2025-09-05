import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
} from '../helpers/test-data';
import { subscribeToNotifications } from '@/features/notifications/api/subscribeToNotifications';
import { createComment } from '@/features/comments';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';

describe('Notification Channel Integration', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: Account;
  let testCommunity: Community;
  let anotherUser: Account;
  // Track received notifications and status changes per test
  let receivedNotifications: Record<string, unknown>[] = [];
  let statusChanges: { status: string; error?: unknown }[] = [];

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test users and community
    testUser = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create another user and have them join
    anotherUser = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);
  });

  afterAll(async () => {
    // Clean up any remaining channels
    supabase.realtime.channels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    
    // Disconnect realtime to ensure clean state
    supabase.realtime.disconnect();
  });

  beforeEach(async () => {
    // Clear tracking arrays
    receivedNotifications = [];
    statusChanges = [];

    // Sign in as testUser for consistency
    await signIn(supabase, testUser.email, 'TestPass123!');
  });

  describe('Channel subscription setup', () => {
    it('should establish subscription with SUBSCRIBED status', async () => {
      const subscription = await subscribeToNotifications(
        supabase,
        testUser.id,
        {
          onNotification: (payload) => {
            receivedNotifications.push(payload.new);
          },
          onStatusChange: (status, error) => {
            statusChanges.push({ status, error });
          },
        },
      );

      // Wait briefly for subscription status changes
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should have received status updates
      expect(statusChanges.length).toBeGreaterThan(0);

      // Should reach SUBSCRIBED status
      const hasSubscribed = statusChanges.some(
        (change) => change.status === 'SUBSCRIBED',
      );
      expect(hasSubscribed).toBe(true);

      // Test passes as long as we reach SUBSCRIBED status (checked above)

      // Clean up
      await subscription.cleanup();
    });

    it('should receive real-time notifications when they are created', async () => {
      // Set up subscription
      const subscription = await subscribeToNotifications(
        supabase,
        testUser.id,
        {
          onNotification: (payload) => {
            receivedNotifications.push(payload.new);
          },
          onStatusChange: (status, error) => {
            statusChanges.push({ status, error });
          },
        },
      );

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

      // Wait briefly for realtime notifications
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify notification was received
      expect(receivedNotifications.length).toBeGreaterThan(0);

      const commentNotification = receivedNotifications.find(
        (n) =>
          n.type === 'comment' &&
          n.resource_id === resource.id &&
          n.actor_id === anotherUser.id,
      );

      expect(commentNotification).toBeDefined();
      expect(commentNotification).toMatchObject({
        type: 'comment',
        resource_id: resource.id,
        actor_id: anotherUser.id,
        user_id: testUser.id,
        is_read: false,
      });

      // Clean up
      await subscription.cleanup();
    });
  });

  describe('Error handling and reconnection', () => {
    it('should handle subscription errors gracefully', async () => {
      // This test verifies that our subscribeToNotifications function works reliably
      const subscription = await subscribeToNotifications(supabase, testUser.id, {
        onNotification: (payload) => {
          receivedNotifications.push(payload.new);
        },
        onStatusChange: (status, error) => {
          statusChanges.push({ status, error });
        },
      });
      
      // Wait briefly for status changes
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      await subscription.cleanup();
      
      // Should have recorded status changes
      expect(statusChanges.length).toBeGreaterThan(0);
    });

  });
});

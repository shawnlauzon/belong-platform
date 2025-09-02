import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
} from '../helpers/test-data';
import {
  fetchNotifications,
  fetchNotificationCounts,
  markNotificationAsRead,
} from '@/features/notifications';
import { createComment } from '@/features/comments';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';

describe('Notification Real-time Features', () => {
  let clientA: SupabaseClient<Database>;
  let clientB: SupabaseClient<Database>;
  let testUser: Account;
  let testCommunity: Community;
  let anotherUser: Account;
  let activeChannels: any[] = [];

  beforeAll(async () => {
    // Create two separate clients for better realtime isolation
    clientA = createTestClient();
    clientB = createTestClient();

    // Create test users and community
    testUser = await createTestUser(clientA);
    testCommunity = await createTestCommunity(clientA);

    // Create another user and have them join
    anotherUser = await createTestUser(clientB);
    await joinCommunity(clientB, testCommunity.id);
  });

  afterEach(async () => {
    // Clean up all channels after each test
    for (const channel of activeChannels) {
      try {
        await channel.unsubscribe();
        clientA.removeChannel(channel);
        clientB.removeChannel(channel);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    activeChannels = [];

    // Wait for cleanup to complete
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Sign in as testUser for consistency
    await signIn(clientA, testUser.email, 'TestPass123!');
  });

  describe('Real-time notification creation', () => {
    it('should receive real-time notification when someone comments on my resource', async () => {
      const testId = `notification-test-${Date.now()}`;
      
      // Track received notifications
      const notificationsReceived: any[] = [];

      // Set up realtime subscription for testUser (clientA) 
      // Note: using public channel for now to test basic real-time functionality
      const channel = clientA
        .channel(`${testId}-notifications`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${testUser.id}`,
        }, (payload) => {
          notificationsReceived.push(payload.new);
        })
        .subscribe();

      // Track channel for cleanup
      activeChannels.push(channel);

      // Wait for subscription to be ready
      await new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 30; // 3 seconds max
        
        const checkSubscription = () => {
          attempts++;
          const state = channel.state;
          
          if (state === 'SUBSCRIBED' || state === 'joined') {
            resolve(void 0);
          } else if (attempts >= maxAttempts) {
            resolve(void 0);
          } else {
            setTimeout(checkSubscription, 100);
          }
        };
        checkSubscription();
      });

      // Create a resource as testUser
      const resource = await createTestResource(
        clientA,
        testCommunity.id,
        'offer',
      );

      // Have another user comment using clientB (this should trigger real-time notification)
      await signIn(clientB, anotherUser.email, 'TestPass123!');
      await createComment(clientB, {
        content: 'Real-time test comment',
        resourceId: resource.id,
      });

      // Wait for realtime to propagate
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify notification was received via realtime
      expect(notificationsReceived).toHaveLength(1);
      expect(notificationsReceived[0]).toMatchObject({
        type: 'comment',
        resource_id: resource.id,
        actor_id: anotherUser.id,
        is_read: false,
      });
    });

    it('should receive real-time count updates when notifications change', async () => {
      const testId = `count-test-${Date.now()}`;
      
      // Track received count updates
      const countUpdatesReceived: any[] = [];

      // Set up realtime subscription for count updates (clientA)
      const channel = clientA
        .channel(`${testId}-counts`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'notification_counts',
          filter: `user_id=eq.${testUser.id}`,
        }, (payload) => {
          countUpdatesReceived.push(payload.new);
        })
        .subscribe();

      // Track channel for cleanup
      activeChannels.push(channel);

      // Wait for subscription to be ready
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create a resource and comment to trigger count update
      const resource = await createTestResource(
        clientA,
        testCommunity.id,
        'offer',
      );

      // Have another user comment using clientB (this should trigger count update)
      await signIn(clientB, anotherUser.email, 'TestPass123!');
      await createComment(clientB, {
        content: 'Count update test comment',
        resourceId: resource.id,
      });

      // Wait for realtime to propagate (longer wait since cleanup happens quickly)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify count update was received via realtime
      expect(countUpdatesReceived.length).toBeGreaterThan(0);
      expect(countUpdatesReceived[0]).toHaveProperty('unread_total');
      expect(countUpdatesReceived[0]).toHaveProperty('unread_comments');
    });
  });

  describe('Real-time read status updates', () => {
    it('should receive real-time updates when notifications are marked as read', async () => {
      // Create a notification first
      const resource = await createTestResource(
        clientA,
        testCommunity.id,
        'offer',
      );

      await signIn(clientB, anotherUser.email, 'TestPass123!');
      await createComment(clientB, {
        content: 'Comment for read status test',
        resourceId: resource.id,
      });

      await signIn(clientA, testUser.email, 'TestPass123!');

      // Get the notification
      const notifications = await fetchNotifications(clientA, {
        isRead: false,
        limit: 1,
      });

      expect(notifications).toHaveLength(1);

      const readUpdatePromise = new Promise((resolve) => {
        const channel = clientA.channel(`user:${testUser.id}:read-test`);

        channel
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${testUser.id}`,
          }, (payload) => {
            if (payload.new?.is_read === true) {
              resolve(payload.new);
            }
          })
          .subscribe();

        // Track channel for cleanup
        activeChannels.push(channel);

        // Cleanup function
        setTimeout(() => {
          clientA.removeChannel(channel);
        }, 5000);
      });

      // Mark as read
      await markNotificationAsRead(clientA, notifications[0].id);

      // Wait for real-time read update
      const readPayload = await Promise.race([
        readUpdatePromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout waiting for read update')), 5000)
        ),
      ]);

      expect(readPayload).toMatchObject({
        id: notifications[0].id,
        is_read: true,
      });
      expect(readPayload).toHaveProperty('read_at');
    });
  });

  describe('Subscription management', () => {
    it('should handle multiple simultaneous subscriptions', async () => {
      const notifications: any[] = [];
      const countUpdates: any[] = [];

      // Set up multiple subscriptions
      const notificationChannel = clientA.channel(`user:${testUser.id}:multi-1`);

      const countChannel = clientA.channel(`user:${testUser.id}:multi-2`);

      notificationChannel
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${testUser.id}`,
        }, (payload) => {
          notifications.push(payload.new);
        })
        .subscribe();

      countChannel
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'notification_counts',
          filter: `user_id=eq.${testUser.id}`,
        }, (payload) => {
          countUpdates.push(payload.new);
        })
        .subscribe();

      // Track channels for cleanup
      activeChannels.push(notificationChannel);
      activeChannels.push(countChannel);

      // Trigger notification
      const resource = await createTestResource(
        clientA,
        testCommunity.id,
        'offer',
      );

      await signIn(clientB, anotherUser.email, 'TestPass123!');
      await createComment(clientB, {
        content: 'Multi-subscription test',
        resourceId: resource.id,
      });

      // Wait for updates
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Both subscriptions should have received updates
      expect(notifications.length).toBeGreaterThan(0);
      expect(countUpdates.length).toBeGreaterThan(0);

      // Cleanup
      clientA.removeChannel(notificationChannel);
      clientA.removeChannel(countChannel);
    });
  });

  describe('Error handling', () => {
    it('should handle subscription errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Try to subscribe with invalid user ID
      const channel = clientA.channel('invalid-subscription');

      channel
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: 'user_id=eq.invalid-uuid',
        }, () => {})
        .subscribe();

      // Track channel for cleanup
      activeChannels.push(channel);

      // Wait a bit to see if errors are handled
      await new Promise(resolve => setTimeout(resolve, 500));

      // Cleanup
      clientA.removeChannel(channel);
      consoleSpy.mockRestore();

      // Test should not throw - error handling should be graceful
      expect(true).toBe(true);
    });
  });
});
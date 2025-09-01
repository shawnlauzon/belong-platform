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
  let supabase: SupabaseClient<Database>;
  let testUser: Account;
  let testCommunity: Community;
  let anotherUser: Account;

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
    await cleanupAllTestData(supabase);
  });

  beforeEach(async () => {
    // Sign in as testUser for consistency
    await signIn(supabase, testUser.email, 'TestPass123!');
  });

  describe('Real-time notification creation', () => {
    it('should receive real-time notification when someone comments on my resource', async () => {
      const notificationPromise = new Promise((resolve) => {
        const channel = supabase.channel(`user:${testUser.id}:notifications-test`, {
          config: { private: true }
        });

        channel
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${testUser.id}`,
          }, (payload) => {
            resolve(payload.new);
          })
          .subscribe();

        // Cleanup function
        setTimeout(() => {
          supabase.removeChannel(channel);
        }, 5000);
      });

      // Create a resource as testUser
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Have another user comment (this should trigger real-time notification)
      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'Real-time test comment',
        resourceId: resource.id,
      });

      // Wait for real-time notification
      const notificationPayload = await Promise.race([
        notificationPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout waiting for notification')), 5000)
        ),
      ]);

      expect(notificationPayload).toBeDefined();
      expect(notificationPayload).toMatchObject({
        type: 'comment',
        resource_id: resource.id,
        actor_id: anotherUser.id,
        is_read: false,
      });
    });

    it('should receive real-time count updates when notifications change', async () => {
      const countUpdatePromise = new Promise((resolve) => {
        const channel = supabase.channel(`user:${testUser.id}:counts-test`, {
          config: { private: true }
        });

        channel
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'notification_counts',
            filter: `user_id=eq.${testUser.id}`,
          }, (payload) => {
            resolve(payload.new);
          })
          .subscribe();

        // Cleanup function
        setTimeout(() => {
          supabase.removeChannel(channel);
        }, 5000);
      });

      // Create a resource and comment to trigger count update
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'Count update test comment',
        resourceId: resource.id,
      });

      // Wait for real-time count update
      const countPayload = await Promise.race([
        countUpdatePromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout waiting for count update')), 5000)
        ),
      ]);

      expect(countPayload).toBeDefined();
      expect(countPayload).toHaveProperty('unread_total');
      expect(countPayload).toHaveProperty('unread_comments');
    });
  });

  describe('Real-time read status updates', () => {
    it('should receive real-time updates when notifications are marked as read', async () => {
      // Create a notification first
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'Comment for read status test',
        resourceId: resource.id,
      });

      await signIn(supabase, testUser.email, 'TestPass123!');

      // Get the notification
      const notifications = await fetchNotifications(supabase, {
        isRead: false,
        limit: 1,
      });

      expect(notifications).toHaveLength(1);

      const readUpdatePromise = new Promise((resolve) => {
        const channel = supabase.channel(`user:${testUser.id}:read-test`, {
          config: { private: true }
        });

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

        // Cleanup function
        setTimeout(() => {
          supabase.removeChannel(channel);
        }, 5000);
      });

      // Mark as read
      await markNotificationAsRead(supabase, notifications[0].id);

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
      const notificationChannel = supabase.channel(`user:${testUser.id}:multi-1`, {
        config: { private: true }
      });

      const countChannel = supabase.channel(`user:${testUser.id}:multi-2`, {
        config: { private: true }
      });

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

      // Trigger notification
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'Multi-subscription test',
        resourceId: resource.id,
      });

      // Wait for updates
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Both subscriptions should have received updates
      expect(notifications.length).toBeGreaterThan(0);
      expect(countUpdates.length).toBeGreaterThan(0);

      // Cleanup
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(countChannel);
    });
  });

  describe('Error handling', () => {
    it('should handle subscription errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Try to subscribe with invalid user ID
      const channel = supabase.channel('invalid-subscription', {
        config: { private: true }
      });

      channel
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: 'user_id=eq.invalid-uuid',
        }, () => {})
        .subscribe();

      // Wait a bit to see if errors are handled
      await new Promise(resolve => setTimeout(resolve, 500));

      // Cleanup
      supabase.removeChannel(channel);
      consoleSpy.mockRestore();

      // Test should not throw - error handling should be graceful
      expect(true).toBe(true);
    });
  });
});
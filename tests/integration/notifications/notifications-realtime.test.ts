import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
} from '../helpers/test-data';
import {
  fetchNotifications,
  markNotificationAsRead,
} from '@/features/notifications';
import { createComment } from '@/features/comments';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';
import type { Notification } from '@/features/notifications';

describe('Notification Real-time Features', () => {
  let clientA: SupabaseClient<Database>;
  let clientB: SupabaseClient<Database>;
  let testUser: Account;
  let testCommunity: Community;
  let anotherUser: Account;

  // Single persistent channel for INSERT events
  let notificationChannel: RealtimeChannel;
  let notificationsReceived: Notification[] = [];

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

    // Set up single persistent channel for INSERT events
    notificationChannel = clientA
      .channel(`user:${testUser.id}:notifications`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          notificationsReceived.push(payload.new as Notification);
        },
      )
      .subscribe();

    // Wait for channel to be established
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (notificationChannel) {
      await notificationChannel.unsubscribe();
      clientA.removeChannel(notificationChannel);
    }
    // await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Clear notifications array before each test
    notificationsReceived = [];
    // Sign in as testUser for consistency
    await signIn(clientA, testUser.email, 'TestPass123!');
  });

  describe('Real-time notification creation', () => {
    it('should receive real-time notification when someone comments on my resource', async () => {
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

      // Verify notification was received via persistent channel
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
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notification_counts',
            filter: `user_id=eq.${testUser.id}`,
          },
          (payload) => {
            countUpdatesReceived.push(payload.new);
          },
        )
        .subscribe();

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

      // Wait for realtime to propagate
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify count update was received via realtime
      expect(countUpdatesReceived.length).toBeGreaterThan(0);
      expect(countUpdatesReceived[0]).toHaveProperty('unread_total');
      expect(countUpdatesReceived[0]).toHaveProperty('unread_comments');

      // Cleanup
      await channel.unsubscribe();
      clientA.removeChannel(channel);
    });
  });

  describe('Mark as read functionality', () => {
    it('should successfully mark notifications as read', async () => {
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
      });

      const commentNotification = notifications.find(
        (n) => n.type === 'comment',
      );
      expect(commentNotification).toBeDefined();

      // Mark comment as read
      await markNotificationAsRead(clientA, commentNotification!.id);

      // Verify it's marked as read via direct fetch
      const updatedNotifications = await fetchNotifications(clientA, {
        isRead: true,
      });

      const updatedCommentNotification = updatedNotifications.find(
        (n) => n.type === 'comment',
      );

      expect(updatedCommentNotification).toMatchObject({
        id: commentNotification!.id,
        isRead: true,
      });
    });
  });
});

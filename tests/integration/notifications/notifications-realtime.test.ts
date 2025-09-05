import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
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

describe('Notification Real-time Features', () => {
  let clientA: SupabaseClient<Database>;
  let clientB: SupabaseClient<Database>;
  let testUser: Account;
  let testCommunity: Community;
  let anotherUser: Account;

  // Single persistent channel for INSERT events
  let notificationChannel: RealtimeChannel;
  let notificationsReceived: Record<string, unknown>[] = [];

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
          notificationsReceived.push(payload.new);
        },
      )
      .subscribe();


    // Wait for channels to be established
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (notificationChannel) {
      await notificationChannel.unsubscribe();
      clientA.removeChannel(notificationChannel);
    }
  });

  beforeEach(async () => {
    // Clear notifications arrays before each test
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
      expect(notificationsReceived.length).toBeGreaterThan(0);
      
      const specificNotification = notificationsReceived.find(n => 
        n.type === 'comment' && 
        n.resource_id === resource.id && 
        n.actor_id === anotherUser.id
      );
      expect(specificNotification).toBeDefined();
      expect(specificNotification).toMatchObject({
        type: 'comment',
        resource_id: resource.id,
        actor_id: anotherUser.id,
        is_read: false,
      });
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
      const result = await fetchNotifications(clientA, {
        isRead: false,
      });

      const commentNotification = result.notifications.find(
        (n) => n.type === 'comment',
      );
      expect(commentNotification).toBeDefined();

      // Mark comment as read
      await markNotificationAsRead(clientA, commentNotification!.id);

      // Verify it's marked as read via direct fetch
      const updatedResult = await fetchNotifications(clientA, {
        isRead: true,
      });

      const updatedCommentNotification = updatedResult.notifications.find(
        (n) => n.type === 'comment',
      );

      expect(updatedCommentNotification).toMatchObject({
        id: commentNotification!.id,
        isRead: true,
      });
    });
  });

});

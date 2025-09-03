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
  fetchNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/features/notifications';
import { createComment } from '@/features/comments';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';

describe('Notifications CRUD', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: Account;
  let testCommunity: Community;
  let anotherUser: Account;

  beforeAll(async () => {
    supabase = createTestClient();
    await cleanupAllTestData();

    // Create test users and community
    testUser = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create another user and have them join the community
    anotherUser = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Sign back in as testUser for consistency
    await signIn(supabase, testUser.email, 'TestPass123!');
  });

  describe('Notification creation via triggers', () => {
    it('should create notification when someone comments on my resource', async () => {
      // Create a resource as testUser
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Sign in as anotherUser to comment
      await signIn(supabase, anotherUser.email, 'TestPass123!');

      // Create a comment on the resource
      await createComment(supabase, {
        content: 'This is a test comment on your resource',
        resourceId: resource.id,
      });

      // Switch back to testUser to check notifications
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Fetch notifications for testUser
      const notifications = await fetchNotifications(supabase, {
        type: 'comment',
        limit: 10,
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'comment',
        resourceId: resource.id,
        actorId: anotherUser.id,
        isRead: false,
      });
    });

    it('should update notification counts when notifications are created', async () => {
      // Get initial counts
      const initialCounts = await fetchNotificationCount(supabase);

      // Create a resource as testUser
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Sign in as anotherUser to comment
      await signIn(supabase, anotherUser.email, 'TestPass123!');

      // Create a comment
      await createComment(supabase, {
        content: 'Another test comment',
        resourceId: resource.id,
      });

      // Switch back to testUser to check counts
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Get updated counts
      const updatedCounts = await fetchNotificationCount(supabase);

      expect(updatedCounts).toBeGreaterThan(initialCounts);
    });
  });

  describe('Mark as read functionality', () => {
    it('should mark single notification as read', async () => {
      // Create a resource and comment to generate notification
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'Comment for read test',
        resourceId: resource.id,
      });

      await signIn(supabase, testUser.email, 'TestPass123!');

      // Get the notification
      const notifications = await fetchNotifications(supabase, {
        isRead: false,
        limit: 1,
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0].isRead).toBe(false);

      // Mark as read
      await markNotificationAsRead(supabase, notifications[0].id);

      // Verify it's marked as read
      const updatedNotifications = await fetchNotifications(supabase, {
        limit: 10,
      });

      const readNotification = updatedNotifications.find(
        (n) => n.id === notifications[0].id,
      );
      expect(readNotification?.isRead).toBe(true);
      expect(readNotification?.readAt).toBeInstanceOf(Date);
    });

    it('should mark all notifications as read', async () => {
      // Create multiple notifications by creating comments
      const resource1 = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );
      const resource2 = await createTestResource(
        supabase,
        testCommunity.id,
        'request',
      );

      await signIn(supabase, anotherUser.email, 'TestPass123!');

      await createComment(supabase, {
        content: 'Comment 1',
        resourceId: resource1.id,
      });

      await createComment(supabase, {
        content: 'Comment 2',
        resourceId: resource2.id,
      });

      await signIn(supabase, testUser.email, 'TestPass123!');

      // Verify we have unread notifications
      const unreadNotifications = await fetchNotifications(supabase, {
        isRead: false,
      });

      expect(unreadNotifications.length).toBeGreaterThan(0);

      // Mark all as read
      await markAllNotificationsAsRead(supabase);

      // Verify all are now read
      const stillUnreadNotifications = await fetchNotifications(supabase, {
        isRead: false,
      });

      expect(stillUnreadNotifications).toHaveLength(0);
    });
  });

  describe('Notification counts accuracy', () => {
    it('should return accurate notification counts', async () => {
      // Start fresh
      await markAllNotificationsAsRead(supabase);

      const initialCounts = await fetchNotificationCount(supabase);

      // Create some notifications
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'Count test comment',
        resourceId: resource.id,
      });

      await signIn(supabase, testUser.email, 'TestPass123!');

      const countsAfterComment = await fetchNotificationCount(supabase);

      expect(countsAfterComment).toBe((initialCounts || 0) + 1);

      // Mark as read and verify counts update
      await markAllNotificationsAsRead(supabase);

      const countsAfterRead = await fetchNotificationCount(supabase);

      expect(countsAfterRead).toBe(0);
    });
  });
});

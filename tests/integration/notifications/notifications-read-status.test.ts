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
  fetchNotificationUnreadCount,
  markNotificationAsRead,
} from '@/features/notifications/api';
import { createComment } from '@/features/comments';
import { createShoutout } from '@/features/shoutouts';
import { NOTIFICATION_TYPES } from '@/features/notifications/constants';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';

describe('Notification Read Status', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: Account;
  let anotherUser: Account;
  let testCommunity: Community;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test users and community
    testUser = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create another user and join community
    anotherUser = await createTestUser(supabase);
    await joinCommunity(supabase, anotherUser.id, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Sign back in as testUser for consistency
    await signIn(supabase, testUser.email, 'TestPass123!');
  });

  describe('Default notification state', () => {
    it('should create notifications with isRead: false by default', async () => {
      // Create a resource as testUser
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Switch to anotherUser and create comment
      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'This should create an unread notification',
        resourceId: resource.id,
      });

      // Switch back to testUser to check notifications
      await signIn(supabase, testUser.email, 'TestPass123!');

      const notifications = await fetchNotifications(supabase, {
        isRead: false,
      });

      const commentNotification = notifications.find(
        (n) =>
          n.type === NOTIFICATION_TYPES.COMMENT_CREATED &&
          n.resourceId === resource.id &&
          n.actorId === anotherUser.id,
      );

      expect(commentNotification).toBeDefined();
      expect(commentNotification!.readAt).toBeNull();
    });

    it('should count unread notifications correctly', async () => {
      const initialCount = await fetchNotificationUnreadCount(supabase, testUser.id);

      // Create a resource as testUser
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'request',
      );

      // Switch to anotherUser and create comment
      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'New comment for count test',
        resourceId: resource.id,
      });

      // Switch back to testUser to check count
      await signIn(supabase, testUser.email, 'TestPass123!');

      const updatedCount = await fetchNotificationUnreadCount(supabase, testUser.id);
      expect(updatedCount).toBeGreaterThan(initialCount);
    });
  });

  describe('Mark individual notifications as read', () => {
    it('should mark notification as read and set readAt timestamp', async () => {
      // Create a resource and comment to generate notification
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'Comment for individual read test',
        resourceId: resource.id,
      });

      await signIn(supabase, testUser.email, 'TestPass123!');

      // Get unread notification
      const unreadNotifications = await fetchNotifications(supabase, {
        isRead: false,
      });

      expect(unreadNotifications.length).toBeGreaterThan(0);

      const notification = unreadNotifications[0];
      expect(notification.readAt).toBeNull();

      const beforeReadTime = new Date();

      // Mark as read
      await markNotificationAsRead(supabase, notification.id);

      // Verify it's marked as read
      const allNotifications = await fetchNotifications(supabase);

      const readNotification = allNotifications.find(
        (n) => n.id === notification.id,
      );

      expect(readNotification).toBeDefined();
      expect(readNotification!.readAt).toBeInstanceOf(Date);
      expect(readNotification!.readAt!.getTime()).toBeGreaterThanOrEqual(
        beforeReadTime.getTime(),
      );
    });

    it('should not affect other notifications when marking one as read', async () => {
      // Create multiple resources and comments to generate multiple notifications
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
        content: 'First comment',
        resourceId: resource1.id,
      });
      await createComment(supabase, {
        content: 'Second comment',
        resourceId: resource2.id,
      });

      await signIn(supabase, testUser.email, 'TestPass123!');

      // Get unread notifications
      const unreadNotifications = await fetchNotifications(supabase, {
        isRead: false,
      });

      expect(unreadNotifications.length).toBeGreaterThanOrEqual(2);

      // Mark only the first one as read
      await markNotificationAsRead(supabase, unreadNotifications[0].id);

      // Check that only one is marked as read
      const afterReadNotifications = await fetchNotifications(supabase);

      const markedAsRead = afterReadNotifications.filter((n) => n.readAt);
      const stillUnread = afterReadNotifications.filter((n) => !n.readAt);

      expect(markedAsRead.length).toBeGreaterThanOrEqual(1);
      expect(stillUnread.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Mark all notifications as read', () => {
    it('should mark all unread notifications as read', async () => {
      // Create multiple resources and generate notifications
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
        content: 'Comment for mark all test 1',
        resourceId: resource1.id,
      });
      await createComment(supabase, {
        content: 'Comment for mark all test 2',
        resourceId: resource2.id,
      });

      await signIn(supabase, testUser.email, 'TestPass123!');

      // Verify we have unread notifications
      const unreadNotifications = await fetchNotifications(supabase, {
        isRead: false,
      });

      expect(unreadNotifications.length).toBeGreaterThanOrEqual(2);

      // Mark all as read
      await markNotificationAsRead(supabase, 'all');

      // Verify all are marked as read
      const afterMarkAllNotifications = await fetchNotifications(supabase);

      afterMarkAllNotifications.forEach((notification) => {
        expect(notification.readAt).toBeInstanceOf(Date);
      });

      // Verify no unread notifications remain
      const unreadAfterMarkAll = await fetchNotifications(supabase, {
        isRead: false,
      });

      expect(unreadAfterMarkAll.length).toBe(0);
    });

    it('should update notification count to zero after marking all as read', async () => {
      // Create notification
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'Comment for count test',
        resourceId: resource.id,
      });

      await signIn(supabase, testUser.email, 'TestPass123!');

      // Verify count is greater than 0
      const beforeCount = await fetchNotificationUnreadCount(supabase, testUser.id);
      expect(beforeCount).toBeGreaterThan(0);

      // Mark all as read
      await markNotificationAsRead(supabase, 'all');

      // Verify count is 0
      const afterCount = await fetchNotificationUnreadCount(supabase, testUser.id);
      expect(afterCount).toBe(0);
    });
  });

  describe('Filtering by read status', () => {
    it('should filter notifications by isRead: false', async () => {
      // Create notifications and mark some as read
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
        content: 'Comment 1 for filter test',
        resourceId: resource1.id,
      });
      await createComment(supabase, {
        content: 'Comment 2 for filter test',
        resourceId: resource2.id,
      });

      await signIn(supabase, testUser.email, 'TestPass123!');

      // Get all notifications
      const allNotifications = await fetchNotifications(supabase);

      // Mark first one as read
      await markNotificationAsRead(supabase, allNotifications[0].id);

      // Filter for unread only
      const unreadNotifications = await fetchNotifications(supabase, {
        isRead: false,
      });

      // All returned notifications should be unread
      unreadNotifications.forEach((notification) => {
        expect(notification.readAt).toBeNull();
      });

      expect(unreadNotifications.length).toBeLessThan(allNotifications.length);
    });

    it('should filter notifications by isRead: true', async () => {
      // Create notification and mark as read
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'Comment for read filter test',
        resourceId: resource.id,
      });

      await signIn(supabase, testUser.email, 'TestPass123!');

      const allNotifications = await fetchNotifications(supabase);

      // Mark at least one as read
      await markNotificationAsRead(supabase, allNotifications[0].id);

      // Filter for read only
      const readNotifications = await fetchNotifications(supabase, {
        isRead: true,
      });

      // All returned notifications should be read
      readNotifications.forEach((notification) => {
        expect(notification.readAt).toBeInstanceOf(Date);
      });

      expect(readNotifications.length).toBeGreaterThan(0);
    });
  });

  describe('Mixed notification types read status', () => {
    it('should handle read status correctly across different notification types', async () => {
      // Create resource for comments and shoutouts
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      await signIn(supabase, anotherUser.email, 'TestPass123!');

      // Create different types of notifications
      await createComment(supabase, {
        content: 'Mixed types test comment',
        resourceId: resource.id,
      });

      await createShoutout(supabase, {
        receiverId: testUser.id,
        message: 'Mixed types test shoutout',
        resourceId: resource.id,
        communityId: testCommunity.id,
      });

      await signIn(supabase, testUser.email, 'TestPass123!');

      // Get all unread notifications
      const unreadNotifications = await fetchNotifications(supabase, {
        isRead: false,
      });

      const commentNotification = unreadNotifications.find(
        (n) => n.type === NOTIFICATION_TYPES.COMMENT_CREATED,
      );
      const shoutoutNotification = unreadNotifications.find(
        (n) => n.type === NOTIFICATION_TYPES.SHOUTOUT_CREATED,
      );

      expect(commentNotification).toBeDefined();
      expect(shoutoutNotification).toBeDefined();

      // Both should be unread initially
      expect(commentNotification!.readAt).toBeNull();
      expect(shoutoutNotification!.readAt).toBeNull();

      // Mark only comment notification as read
      await markNotificationAsRead(supabase, commentNotification!.id);

      // Verify mixed read statuses
      const mixedNotifications = await fetchNotifications(supabase);

      const updatedCommentNotification = mixedNotifications.find(
        (n) => n.id === commentNotification!.id,
      );
      const updatedShoutoutNotification = mixedNotifications.find(
        (n) => n.id === shoutoutNotification!.id,
      );

      expect(updatedCommentNotification!.readAt).toBeInstanceOf(Date);
      expect(updatedShoutoutNotification!.readAt).toBeNull();
    });
  });
});

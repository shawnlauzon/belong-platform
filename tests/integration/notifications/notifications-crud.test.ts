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
      });

      expect(notifications.length).toBeGreaterThan(0);

      const specificNotification = notifications.find(
        (n) => n.isRead === false,
      );
      expect(specificNotification).toBeDefined();
      expect(specificNotification!.isRead).toBe(false);

      // Mark as read
      await markNotificationAsRead(supabase, specificNotification!.id);

      // Verify it's marked as read
      const updatedResult = await fetchNotifications(supabase);

      const readNotification = updatedResult.find(
        (n) => n.id === specificNotification!.id,
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

      expect(stillUnreadNotifications.length).toBe(0);
    });
  });
});

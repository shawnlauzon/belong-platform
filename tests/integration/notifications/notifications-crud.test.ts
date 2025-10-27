import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  signInAsUser,
} from '../helpers/test-data';
import { fetchNotifications } from '@/features/notifications/api';
import { createComment } from '@/features/comments';
import { joinCommunity } from '@/features/communities/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';
import { markAsRead } from '@/features/notifications/api/markAsRead';

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
    await joinCommunity(supabase, anotherUser.id, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Sign back in as testUser for consistency
    await signInAsUser(supabase, testUser);
  });

  describe('Mark as read functionality', () => {
    it('should mark single notification as read', async () => {
      // Create a resource and comment to generate notification
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      await signInAsUser(supabase, anotherUser);
      await createComment(supabase, anotherUser.id, {
        content: 'Comment for read test',
        resourceId: resource.id,
      });

      await signInAsUser(supabase, testUser);

      // Get the notification
      const notifications = await fetchNotifications(supabase, testUser.id, {
        isRead: false,
      });

      expect(notifications.length).toBeGreaterThan(0);

      const specificNotification = notifications.find((n) => n.readAt === null);
      expect(specificNotification).toBeDefined();
      expect(specificNotification!.readAt).toBe(null);

      // Mark as read
      await markAsRead(supabase, specificNotification!.id);

      // Verify it's marked as read
      const updatedResult = await fetchNotifications(supabase, testUser.id);

      const readNotification = updatedResult.find(
        (n) => n.id === specificNotification!.id,
      );
      expect(readNotification?.readAt).toBeDefined();
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

      await signInAsUser(supabase, anotherUser);

      await createComment(supabase, anotherUser.id, {
        content: 'Comment 1',
        resourceId: resource1.id,
      });

      await createComment(supabase, anotherUser.id, {
        content: 'Comment 2',
        resourceId: resource2.id,
      });

      await signInAsUser(supabase, testUser);

      // Verify we have unread notifications
      const unreadNotifications = await fetchNotifications(supabase, testUser.id, {
        isRead: false,
      });

      expect(unreadNotifications.length).toBeGreaterThan(0);

      // Mark all as read
      await markAsRead(supabase, 'all');

      // Verify all are now read
      const stillUnreadNotifications = await fetchNotifications(supabase, testUser.id, {
        isRead: false,
      });

      expect(stillUnreadNotifications.length).toBe(0);
    });
  });
});

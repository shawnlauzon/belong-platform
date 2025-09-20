import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  signInAsUser,
} from '../helpers/test-data';
import {
  fetchNotificationUnreadCount,
  markNotificationAsRead,
} from '@/features/notifications/api';

import { createComment } from '@/features/comments';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth';
import { Community } from '@/features';
import {
  fetchMessageUnreadCount,
  fetchTotalMessageUnreadCount,
  sendMessage,
  startConversation,
  markMessageAsRead as markConversationAsRead,
} from '@/features/messages/api';

describe('Unread Counts Integration Tests', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: Account;
  let otherUser: Account;
  let testCommunity: Community;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test users
    testUser = await createTestUser(supabase);

    // Create test community
    testCommunity = await createTestCommunity(supabase);

    // Join the community as otherUser (if not already joined)
    otherUser = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);
  });

  afterAll(async () => {
    // await cleanupAllTestData();
  });

  beforeEach(async () => {
    await signInAsUser(supabase, testUser);
  });

  describe('Notification Unread Counts', () => {
    it('should increment unread count when notification is created', async () => {
      const initialCount = await fetchNotificationUnreadCount(supabase);

      // Create a resource and have otherUser comment on it
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      await signIn(supabase, otherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'Test comment to generate notification',
        resourceId: resource.id,
      });

      // Switch back to testUser and check count
      await signIn(supabase, testUser.email, 'TestPass123!');
      const updatedCount = await fetchNotificationUnreadCount(supabase);
      expect(updatedCount).toBeGreaterThan(initialCount);
    });

    it('should decrement unread count when notification is marked as read', async () => {
      // Create a notification
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      await signIn(supabase, otherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'Test comment',
        resourceId: resource.id,
      });

      // Check initial count
      await signIn(supabase, testUser.email, 'TestPass123!');
      const beforeCount = await fetchNotificationUnreadCount(supabase);
      expect(beforeCount).toBeGreaterThan(0);

      // Get the notification to mark it as read
      const { data: notifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', testUser.id)
        .limit(1);

      expect(notifications).toHaveLength(1);

      // Mark as read
      await markNotificationAsRead(supabase, notifications![0].id);

      // Check count decreased
      const afterCount = await fetchNotificationUnreadCount(supabase);
      expect(afterCount).toBe(beforeCount - 1);
    });

    it('should mark all notifications as read', async () => {
      // Create multiple notifications
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

      await signIn(supabase, otherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'Comment 1',
        resourceId: resource1.id,
      });
      await createComment(supabase, {
        content: 'Comment 2',
        resourceId: resource2.id,
      });

      // Check initial count
      await signIn(supabase, testUser.email, 'TestPass123!');
      const beforeCount = await fetchNotificationUnreadCount(supabase);
      expect(beforeCount).toBeGreaterThan(1);

      // Mark all as read
      await markNotificationAsRead(supabase, 'all');

      // Check count is now zero
      const afterCount = await fetchNotificationUnreadCount(supabase);
      expect(afterCount).toBe(0);
    });
  });

  describe('Message Unread Counts', () => {
    it('should start with zero unread messages', async () => {
      const totalCount = await fetchTotalMessageUnreadCount(supabase);
      expect(totalCount).toBe(0);
    });

    it('should count unread messages in a conversation', async () => {
      // Start conversation as testUser
      const conversation = await startConversation(supabase, {
        otherUserId: otherUser.id,
      });

      // Send message as otherUser
      await signIn(supabase, otherUser.email, 'TestPass123!');
      await sendMessage(supabase, {
        conversationId: conversation.id,
        content: 'Hello from other user',
      });

      // Check unread count for testUser
      await signIn(supabase, testUser.email, 'TestPass123!');
      const conversationUnreadCount = await fetchMessageUnreadCount(
        supabase,
        conversation.id,
      );
      expect(conversationUnreadCount).toBe(1);

      const totalUnreadCount = await fetchTotalMessageUnreadCount(supabase);
      expect(totalUnreadCount).toBe(1);
    });

    it('should reset unread count when conversation is marked as read', async () => {
      const yetAnotherUser = await createTestUser(supabase);
      await joinCommunity(supabase, testCommunity.id);

      // Start conversation with testUser
      const conversation = await startConversation(supabase, {
        otherUserId: testUser.id,
      });

      // Send multiple messages as otherUser
      await signInAsUser(supabase, yetAnotherUser);
      await sendMessage(supabase, {
        conversationId: conversation.id,
        content: 'Message 1',
      });
      await sendMessage(supabase, {
        conversationId: conversation.id,
        content: 'Message 2',
      });

      // Check initial unread count
      await signInAsUser(supabase, testUser);
      const beforeCount = await fetchMessageUnreadCount(
        supabase,
        conversation.id,
      );
      expect(beforeCount).toBe(2);

      // Mark conversation as read
      await markConversationAsRead(supabase, conversation.id);

      // Check count is now zero
      const afterCount = await fetchMessageUnreadCount(
        supabase,
        conversation.id,
      );
      expect(afterCount).toBe(0);
    });

    it('should handle multiple conversations correctly', async () => {
      // Create another user for a second conversation
      const thirdUser = await createTestUser(supabase);
      await joinCommunity(supabase, testCommunity.id);
      const fourthUser = await createTestUser(supabase);
      await joinCommunity(supabase, testCommunity.id);

      // Start conversations with testUser
      await signInAsUser(supabase, testUser);
      const conversation1 = await startConversation(supabase, {
        otherUserId: thirdUser.id,
      });
      const conversation2 = await startConversation(supabase, {
        otherUserId: fourthUser.id,
      });

      // Send messages to testUser from both users
      await signInAsUser(supabase, thirdUser);
      await sendMessage(supabase, {
        conversationId: conversation1.id,
        content: 'From third user',
      });

      await signInAsUser(supabase, fourthUser);
      await sendMessage(supabase, {
        conversationId: conversation2.id,
        content: 'From fourth user',
      });

      // Check counts for testUser
      await signInAsUser(supabase, testUser);
      const conversation1Count = await fetchMessageUnreadCount(
        supabase,
        conversation1.id,
      );
      const conversation2Count = await fetchMessageUnreadCount(
        supabase,
        conversation2.id,
      );

      expect(conversation1Count).toBe(1);
      expect(conversation2Count).toBe(1);

      // Mark one conversation as read
      await markConversationAsRead(supabase, conversation1.id);

      expect(await fetchMessageUnreadCount(supabase, conversation1.id)).toBe(0);
      expect(await fetchMessageUnreadCount(supabase, conversation2.id)).toBe(1);
    });
  });
});

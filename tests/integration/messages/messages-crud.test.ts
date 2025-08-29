import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createTestUser, TEST_PREFIX } from '../helpers/test-data';
import { 
  setupMessagingUsers, 
  createTestConversation, 
  sendTestMessage, 
  assertMessageExists,
  assertUnreadCount,
  signInAsUser 
} from './messaging-helpers';
import * as api from '@/features/messages/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users';
import type { Community } from '@/features/communities';
import type { Conversation } from '@/features/messages/types';

describe('Messages CRUD Operations', () => {
  let supabase: SupabaseClient<Database>;
  let userA: User;
  let userB: User;
  let community: Community;
  let conversation: Conversation;

  beforeAll(async () => {
    supabase = createTestClient();
    const setup = await setupMessagingUsers(supabase);
    userA = setup.userA;
    userB = setup.userB;
    community = setup.community;

    // Create a conversation for message tests
    await signInAsUser(supabase, userA);
    conversation = await createTestConversation(supabase, userB.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('sendMessage', () => {
    it('sends text message in conversation', async () => {
      await signInAsUser(supabase, userA);
      const content = `${TEST_PREFIX} Hello from user A`;

      const message = await api.sendMessage(supabase, {
        conversationId: conversation.id,
        content,
        messageType: 'text'
      });

      // Verify message object
      expect(message).toBeTruthy();
      expect(message.id).toBeTruthy();
      expect(message.content).toBe(content);
      expect(message.senderId).toBe(userA.id);
      expect(message.conversationId).toBe(conversation.id);
      expect(message.messageType).toBe('text');
      expect(message.isEdited).toBe(false);
      expect(message.isDeleted).toBe(false);
      expect(message.isMine).toBe(true);

      // Verify database record
      const dbMessage = await assertMessageExists(supabase, message.id);
      expect(dbMessage.content).toBe(content);
      expect(dbMessage.sender_id).toBe(userA.id);
    });

    it('sends multiple messages in sequence', async () => {
      await signInAsUser(supabase, userA);

      const message1 = await api.sendMessage(supabase, {
        conversationId: conversation.id,
        content: `${TEST_PREFIX} First message`,
        messageType: 'text'
      });

      const message2 = await api.sendMessage(supabase, {
        conversationId: conversation.id,
        content: `${TEST_PREFIX} Second message`,
        messageType: 'text'
      });

      // Verify order (newer messages have later created_at)
      expect(message2.createdAt.getTime()).toBeGreaterThanOrEqual(message1.createdAt.getTime());

      // Fetch messages to verify order
      const result = await api.fetchMessages(supabase, conversation.id, {
        limit: 10
      });

      expect(result.messages.length).toBeGreaterThanOrEqual(2);
      
      // Messages should be ordered by created_at ASC (oldest first)
      const msg1Index = result.messages.findIndex(m => m.id === message1.id);
      const msg2Index = result.messages.findIndex(m => m.id === message2.id);
      expect(msg2Index).toBeGreaterThan(msg1Index);
    });

    it('handles unicode and emoji in message content', async () => {
      await signInAsUser(supabase, userA);
      const content = `${TEST_PREFIX} Hello! 👋 Unicode: café, naïve, résumé 🌟`;

      const message = await api.sendMessage(supabase, {
        conversationId: conversation.id,
        content,
        messageType: 'text'
      });

      expect(message.content).toBe(content);

      // Verify it's stored correctly in database
      const dbMessage = await assertMessageExists(supabase, message.id);
      expect(dbMessage.content).toBe(content);
    });

    it('handles long messages (>1000 characters)', async () => {
      await signInAsUser(supabase, userA);
      const longContent = `${TEST_PREFIX} ${'A'.repeat(1500)} This is a very long message content to test the system's ability to handle large text payloads.`;

      const message = await api.sendMessage(supabase, {
        conversationId: conversation.id,
        content: longContent,
        messageType: 'text'
      });

      expect(message.content).toBe(longContent);
      expect(message.content.length).toBeGreaterThan(1000);
    });

    it('updates conversation metadata on new message', async () => {
      await signInAsUser(supabase, userA);
      const content = `${TEST_PREFIX} Metadata update test`;

      await api.sendMessage(supabase, {
        conversationId: conversation.id,
        content,
        messageType: 'text'
      });

      // Check conversation was updated
      const { data: dbConversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversation.id)
        .single();

      expect(dbConversation).toBeTruthy();
      expect(dbConversation!.last_message_preview).toContain(content.substring(0, 50));
      expect(dbConversation!.last_message_sender_id).toBe(userA.id);
      expect(dbConversation!.last_message_at).toBeTruthy();
    });

    it('increments unread count for recipient', async () => {
      // Sign in as userA and send message
      await signInAsUser(supabase, userA);
      
      // Get initial unread count for userB
      const initialCount = await api.fetchConversation(supabase, conversation.id);
      
      // Switch to userB to see their unread count
      await signInAsUser(supabase, userB);
      const userBConversation = await api.fetchConversation(supabase, conversation.id);
      const initialUnreadB = userBConversation.unreadCount;
      
      // Switch back to userA and send message
      await signInAsUser(supabase, userA);
      await api.sendMessage(supabase, {
        conversationId: conversation.id,
        content: `${TEST_PREFIX} Unread count test`,
        messageType: 'text'
      });

      // Check userB's unread count increased
      await assertUnreadCount(supabase, conversation.id, userB.id, initialUnreadB + 1);
    });
  });

  describe('fetchMessages', () => {
    it('fetches message history for conversation', async () => {
      await signInAsUser(supabase, userA);
      
      // Send a test message
      const sentMessage = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} History test`);

      const result = await api.fetchMessages(supabase, conversation.id, {
        limit: 50
      });

      expect(result).toBeTruthy();
      expect(result.messages).toBeInstanceOf(Array);
      expect(result.messages.length).toBeGreaterThan(0);

      // Find our test message
      const testMessage = result.messages.find(m => m.id === sentMessage.id);
      expect(testMessage).toBeTruthy();
      expect(testMessage!.content).toBe(sentMessage.content);
      expect(testMessage!.sender_id).toBe(userA.id);
    });

    it('paginates messages correctly', async () => {
      await signInAsUser(supabase, userA);

      // Send multiple messages for pagination test
      const messages: string[] = [];
      for (let i = 0; i < 5; i++) {
        const message = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Pagination message ${i}`);
        messages.push(message.id);
      }

      // Fetch with limit of 3
      const result = await api.fetchMessages(supabase, conversation.id, {
        limit: 3
      });

      expect(result.messages.length).toBeLessThanOrEqual(3);
      if (result.hasMore) {
        expect(result.cursor).toBeTruthy();
      }
    });

    it('returns empty array for conversation with no messages', async () => {
      // Create fresh users to ensure we get a truly empty conversation
      const { userA: freshUserA, userB: freshUserB } = await setupMessagingUsers(supabase);
      
      await signInAsUser(supabase, freshUserA);
      
      // Create a new conversation without messages using fresh users
      const emptyConversation = await createTestConversation(supabase, freshUserB.id);

      const result = await api.fetchMessages(supabase, emptyConversation.id, {
        limit: 50
      });

      expect(result.messages).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });

    it('includes sender profile information', async () => {
      await signInAsUser(supabase, userA);
      
      const sentMessage = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Profile test`);

      const result = await api.fetchMessages(supabase, conversation.id, {
        limit: 50
      });

      const testMessage = result.messages.find(m => m.id === sentMessage.id);
      expect(testMessage).toBeTruthy();
      expect(testMessage!.sender_id).toBe(userA.id);
    });
  });

  describe('deleteMessage', () => {
    it('soft deletes own message', async () => {
      await signInAsUser(supabase, userA);
      
      const message = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Delete test`);

      await api.deleteMessage(supabase, {
        messageId: message.id
      });

      // Verify message is marked as deleted
      const dbMessage = await assertMessageExists(supabase, message.id);
      expect(dbMessage.is_deleted).toBe(true);
      expect(dbMessage.content).toContain('deleted');
    });

    it('cannot delete other user\'s message', async () => {
      // Send message as userA
      await signInAsUser(supabase, userA);
      const message = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Cannot delete`);

      // Try to delete as userB
      await signInAsUser(supabase, userB);
      
      await expect(
        api.deleteMessage(supabase, {
          messageId: message.id
        })
      ).rejects.toThrow();

      // Verify message is not deleted
      const dbMessage = await assertMessageExists(supabase, message.id);
      expect(dbMessage.is_deleted).toBe(false);
    });

    it('updates conversation preview when last message is deleted', async () => {
      await signInAsUser(supabase, userA);
      
      // Create new conversation for this test
      const testConversation = await createTestConversation(supabase, userB.id);
      
      const message = await sendTestMessage(supabase, testConversation.id, `${TEST_PREFIX} Last message`);

      await api.deleteMessage(supabase, {
        messageId: message.id
      });

      // Check conversation preview updated
      const { data: dbConversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', testConversation.id)
        .single();

      expect(dbConversation!.last_message_preview).toBe('[Message deleted]');
    });
  });

  describe('Message validation', () => {
    it('requires non-empty content', async () => {
      await signInAsUser(supabase, userA);

      await expect(
        api.sendMessage(supabase, {
          conversationId: conversation.id,
          content: '',
          messageType: 'text'
        })
      ).rejects.toThrow();
    });

    it('requires valid conversation ID', async () => {
      await signInAsUser(supabase, userA);
      const fakeConversationId = '00000000-0000-0000-0000-000000000000';

      await expect(
        api.sendMessage(supabase, {
          conversationId: fakeConversationId,
          content: 'Test message',
          messageType: 'text'
        })
      ).rejects.toThrow();
    });
  });
});
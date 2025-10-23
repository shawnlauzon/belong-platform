import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createTestUser, TEST_PREFIX } from '../helpers/test-data';
import {
  setupMessagingUsers,
  createTestConversation,
  sendTestMessage,
  assertMessageExists,
  signInAsUser,
} from './messaging-helpers';
import * as api from '@/features/messaging/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Conversation } from '@/features/messaging/types';
import { joinCommunity } from '@/features/communities/api';
import { Community } from '@/features';
import { faker } from '@faker-js/faker';

describe('Messages CRUD Operations', () => {
  let supabase: SupabaseClient<Database>;
  let userA: Account;
  let userB: Account;
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

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const message = await api.sendMessage(supabase, currentUser!.id, {
        conversationId: conversation.id,
        content,
      });

      // Verify message object
      expect(message).toBeTruthy();
      expect(message.id).toBeTruthy();
      expect(message.content).toBe(content);
      expect(message.senderId).toBe(userA.id);
      expect(message.conversationId).toBe(conversation.id);
      expect(message.isEdited).toBe(false);
      expect(message.isDeleted).toBe(false);

      // Verify database record
      const dbMessage = await assertMessageExists(supabase, message.id);
      expect(dbMessage.content).toBe(content);
      expect(dbMessage.sender_id).toBe(userA.id);
    });

    it('sends multiple messages in sequence', async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const message1 = await api.sendMessage(supabase, currentUser!.id, {
        conversationId: conversation.id,
        content: `${TEST_PREFIX} First message`,
      });

      const message2 = await api.sendMessage(supabase, currentUser!.id, {
        conversationId: conversation.id,
        content: `${TEST_PREFIX} Second message`,
      });

      // Verify order (newer messages have later created_at)
      expect(message2.createdAt.getTime()).toBeGreaterThanOrEqual(
        message1.createdAt.getTime(),
      );

      // Fetch messages to verify order
      const messages = await api.fetchMessages(supabase, {
        conversationId: conversation.id,
      });

      expect(messages.length).toBeGreaterThanOrEqual(2);

      // Messages should be ordered by creation date with the newest last
      const msg1Index = messages.findIndex((m) => m.id === message1.id);
      const msg2Index = messages.findIndex((m) => m.id === message2.id);
      expect(msg2Index).toBeGreaterThan(msg1Index);
    });

    it('handles unicode and emoji in message content', async () => {
      await signInAsUser(supabase, userA);
      const content = `${TEST_PREFIX} Hello! 👋 Unicode: café, naïve, résumé 🌟`;

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const message = await api.sendMessage(supabase, currentUser!.id, {
        conversationId: conversation.id,
        content,
      });

      expect(message.content).toBe(content);

      // Verify it's stored correctly in database
      const dbMessage = await assertMessageExists(supabase, message.id);
      expect(dbMessage.content).toBe(content);
    });

    it('handles long messages (>1000 characters)', async () => {
      const longContent = `${TEST_PREFIX} ${'A'.repeat(1500)} This is a very long message content to test the system's ability to handle large text payloads.`;

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const message = await api.sendMessage(supabase, currentUser!.id, {
        conversationId: conversation.id,
        content: longContent,
      });

      expect(message.content).toBe(longContent);
      expect(message.content.length).toBeGreaterThan(1000);
    });

    it('updates conversation metadata on new message', async () => {
      await signInAsUser(supabase, userA);
      const content = `${TEST_PREFIX} Metadata update test`;

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      await api.sendMessage(supabase, currentUser!.id, {
        conversationId: conversation.id,
        content,
      });

      const updatedConversation = await api.fetchConversation(
        supabase,
        conversation.id,
      );

      expect(updatedConversation).toBeDefined();
      expect(updatedConversation!.lastMessage).toBeDefined();
      expect(updatedConversation!.lastMessage!.content).toBe(content);
      expect(updatedConversation!.lastMessage!.senderId).toBe(userA.id);
    });
  });

  describe('fetchMessages', () => {
    it('fetches message history for conversation', async () => {
      // Send a test message
      const sentMessage = await sendTestMessage(supabase, {
        conversationId: conversation.id,
        content: `${TEST_PREFIX} History test`,
      });

      const messages = await api.fetchMessages(supabase, {
        conversationId: conversation.id,
      });

      expect(messages).toBeTruthy();
      expect(messages.length).toBeGreaterThan(0);

      // Find our test message
      expect(messages).toContainEqual(sentMessage);
    });

    it('returns empty array for conversation with no messages', async () => {
      const userC = await createTestUser(supabase);
      const { data: { user: currentUser2 } } = await supabase.auth.getUser();
      await joinCommunity(supabase, currentUser2!.id, community.id);

      await signInAsUser(supabase, userA);

      // Create a new conversation without messages using fresh users
      const emptyConversation = await createTestConversation(
        supabase,
        userC.id,
      );

      const messages = await api.fetchMessages(supabase, {
        conversationId: emptyConversation.id,
      });

      expect(messages).toHaveLength(0);
    });
  });

  describe('deleteMessage', () => {
    it('soft deletes own message', async () => {
      const message = await sendTestMessage(supabase, {
        conversationId: conversation.id,
        content: `${TEST_PREFIX} Delete test`,
      });

      await api.deleteMessage(supabase, message.id);

      // Verify message is marked as deleted
      const dbMessage = await assertMessageExists(supabase, message.id);
      expect(dbMessage.is_deleted).toBe(true);
    });

    it("cannot delete other user's message", async () => {
      const message = await sendTestMessage(supabase, {
        conversationId: conversation.id,
        content: `${TEST_PREFIX} Cannot delete`,
      });

      // Try to delete as userB
      await signInAsUser(supabase, userB);

      try {
        await expect(api.deleteMessage(supabase, message.id)).rejects.toThrow();

        // Verify message is not deleted
        const dbMessage = await assertMessageExists(supabase, message.id);
        expect(dbMessage.is_deleted).toBe(false);
      } finally {
        await signInAsUser(supabase, userA);
      }
    });

    it('updates conversation preview when last message is deleted', async () => {
      // Create new conversation for this test
      const testConversation = await createTestConversation(supabase, userB.id);

      const content = faker.lorem.sentence();
      const message = await sendTestMessage(supabase, {
        conversationId: testConversation.id,
        content,
      });
      expect(message.content).toBe(content);

      await api.deleteMessage(supabase, message.id);

      // Check conversation preview updated
      const updatedConversation = await api.fetchConversation(
        supabase,
        testConversation.id,
      );

      expect(updatedConversation).toBeDefined();
      expect(updatedConversation!.lastMessage).toBeDefined();
      expect(updatedConversation!.lastMessage!.content).not.toBe(content);
    });
  });

  describe('Message validation', () => {
    it('requires non-empty content', async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      await expect(
        api.sendMessage(supabase, currentUser!.id, {
          conversationId: conversation.id,
          content: '',
        }),
      ).rejects.toThrow();
    });

    it('requires valid conversation ID', async () => {
      const fakeConversationId = '00000000-0000-0000-0000-000000000000';
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      await expect(
        api.sendMessage(supabase, currentUser!.id, {
          conversationId: fakeConversationId,
          content: 'Test message',
        }),
      ).rejects.toThrow();
    });
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createTestUser, TEST_PREFIX } from '../helpers/test-data';
import {
  setupMessagingUsers,
  createTestConversation,
  sendTestMessage,
  assertMessageDelivered,
  signInAsUser,
} from './messaging-helpers';
import * as api from '@/features/messages/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';
import type { Conversation, Message } from '@/features/messages/types';
import { joinCommunity } from '@/features/communities/api';

describe.skip('Messages Read Status & Receipts', () => {
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

    conversation = await createTestConversation(supabase, userB.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    await signInAsUser(supabase, userA);
  });

  describe('Mark as Read', () => {
    let testMessage: Message;

    beforeEach(async () => {
      await signInAsUser(supabase, userB);
      testMessage = await sendTestMessage(
        supabase,
        conversation.id,
        `${TEST_PREFIX} Read status test`,
      );
      await signInAsUser(supabase, userA);
    });

    it('marks all messages in conversation as read', async () => {
      await api.markAsRead(supabase, conversation.id);

      // Verify message_status was updated for the test message
      const { data: messageStatus } = await supabase
        .from('message_status')
        .select('*')
        .eq('message_id', testMessage.id)
        .eq('user_id', userB.id)
        .single();

      expect(messageStatus).toMatchObject({
        read_at: expect.any(String),
      });
    });

    it('updates last_read_at in conversation_participants', async () => {
      await signInAsUser(supabase, userA);
      const message = await sendTestMessage(
        supabase,
        conversation.id,
        `${TEST_PREFIX} Last read test`,
      );

      // Mark as read by userB
      await signInAsUser(supabase, userB);
      await api.markAsRead(supabase, conversation.id);

      // Check conversation_participants was updated
      const { data: participant } = await supabase
        .from('conversation_participants')
        .select('*')
        .eq('conversation_id', conversation.id)
        .eq('user_id', userB.id)
        .single();

      expect(participant).toBeTruthy();
      expect(participant!.last_read_at).toBeTruthy();

      // last_read_at should be recent
      const lastReadAt = new Date(participant!.last_read_at!);
      const now = new Date();
      expect(now.getTime() - lastReadAt.getTime()).toBeLessThan(5000); // Within 5 seconds
    });
  });

  describe('Batch Mark as Read', () => {
    it('marks multiple messages as read using mark_messages_as_read RPC', async () => {
      // Send multiple messages as userA
      await signInAsUser(supabase, userA);
      const message1 = await sendTestMessage(
        supabase,
        conversation.id,
        `${TEST_PREFIX} Batch 1`,
      );
      const message2 = await sendTestMessage(
        supabase,
        conversation.id,
        `${TEST_PREFIX} Batch 2`,
      );
      const message3 = await sendTestMessage(
        supabase,
        conversation.id,
        `${TEST_PREFIX} Batch 3`,
      );

      // Mark all as read using RPC as userB
      await signInAsUser(supabase, userB);
      const { error } = await supabase.rpc('mark_messages_as_read', {
        p_conversation_id: conversation.id,
      });

      expect(error).toBeFalsy();

      // Verify all messages are marked as read
      const { data: messageStatuses } = await supabase
        .from('message_status')
        .select('*')
        .in('message_id', [message1.id, message2.id, message3.id])
        .eq('user_id', userB.id);

      expect(messageStatuses).toHaveLength(3);
      messageStatuses!.forEach((status) => {
        expect(status.read_at).toBeTruthy();
      });
    });
  });

  describe('Delivery Status', () => {
    it('populates delivered_at on message creation', async () => {
      await signInAsUser(supabase, userA);
      const message = await sendTestMessage(
        supabase,
        conversation.id,
        `${TEST_PREFIX} Delivery test`,
      );

      // Verify message_status was created for recipient
      await signInAsUser(supabase, userB);
      await assertMessageDelivered(supabase, message.id, userB.id);
    });

    it('creates message status record for recipient only', async () => {
      await signInAsUser(supabase, userA);
      const message = await sendTestMessage(
        supabase,
        conversation.id,
        `${TEST_PREFIX} Status recipient test`,
      );

      // Should have status for recipient (userB)
      await signInAsUser(supabase, userB);
      const { data: recipientStatus } = await supabase
        .from('message_status')
        .select('*')
        .eq('message_id', message.id)
        .eq('user_id', userB.id);

      expect(recipientStatus).toHaveLength(1);
      expect(recipientStatus![0].delivered_at).toBeTruthy();

      // Should NOT have status for sender (userA)
      await signInAsUser(supabase, userA);
      const { data: senderStatus } = await supabase
        .from('message_status')
        .select('*')
        .eq('message_id', message.id)
        .eq('user_id', userA.id);

      expect(senderStatus).toHaveLength(0);
    });
  });

  describe('Cross-User Read Status', () => {
    it('tracks per-user read status independently', async () => {
      // Create conversation where both users send messages
      await signInAsUser(supabase, userA);
      const freshConversation = await createTestConversation(
        supabase,
        userB.id,
      );

      const messageFromA = await sendTestMessage(
        supabase,
        freshConversation.id,
        `${TEST_PREFIX} From A`,
      );

      await signInAsUser(supabase, userB);
      const messageFromB = await sendTestMessage(
        supabase,
        freshConversation.id,
        `${TEST_PREFIX} From B`,
      );

      // UserA reads userB's message
      await signInAsUser(supabase, userA);
      await api.markAsRead(supabase, freshConversation.id);

      // UserB has not read userA's message yet
      await signInAsUser(supabase, userB);
      const userBConversation = await api.fetchConversation(
        supabase,
        freshConversation.id,
      );
      expect(userBConversation.unreadCount).toBeGreaterThan(0);

      // UserA should have no unread messages
      await signInAsUser(supabase, userA);
      const userAConversation = await api.fetchConversation(
        supabase,
        freshConversation.id,
      );
      expect(userAConversation.unreadCount).toBe(0);
    });

    it('persists read status across sessions', async () => {
      await signInAsUser(supabase, userA);
      const message = await sendTestMessage(
        supabase,
        conversation.id,
        `${TEST_PREFIX} Persist test`,
      );

      // Mark as read
      await signInAsUser(supabase, userB);
      await api.markAsRead(supabase, conversation.id);

      // Simulate new session by fetching fresh data
      const conversationAfter = await api.fetchConversation(
        supabase,
        conversation.id,
      );
      expect(conversationAfter.lastReadAt).toBeTruthy();

      // Check that the read status persisted in database
      const { data: participant } = await supabase
        .from('conversation_participants')
        .select('last_read_at')
        .eq('conversation_id', conversation.id)
        .eq('user_id', userB.id)
        .single();

      expect(participant!.last_read_at).toBeTruthy();
    });
  });

  describe('Read Status Edge Cases', () => {
    it('handles marking already read message as read', async () => {
      await signInAsUser(supabase, userA);
      const message = await sendTestMessage(
        supabase,
        conversation.id,
        `${TEST_PREFIX} Already read`,
      );

      await signInAsUser(supabase, userB);

      // Mark as read first time
      await api.markAsRead(supabase, conversation.id);

      // Mark as read again - should not error
      await api.markAsRead(supabase, conversation.id);

      // Should still be marked as read
      const { data: status } = await supabase
        .from('message_status')
        .select('*')
        .eq('message_id', message.id)
        .eq('user_id', userB.id)
        .single();

      expect(status!.read_at).toBeTruthy();
    });

    it('handles deleted messages in read status', async () => {
      await signInAsUser(supabase, userA);
      const message = await sendTestMessage(
        supabase,
        conversation.id,
        `${TEST_PREFIX} Will be deleted`,
      );

      // Delete the message (userA should be able to delete their own message)
      try {
        await api.deleteMessage(supabase, {
          messageId: message.id,
        });
      } catch (error) {
        // TODO: IMPLEMENTATION ISSUE - RLS policy preventing message deletion
        // User should be able to delete their own messages
        throw new Error(`Failed to delete own message: ${error}`);
      }

      // UserB should still be able to mark as read (message still exists, just flagged)
      await signInAsUser(supabase, userB);
      await api.markAsRead(supabase, conversation.id);

      // Verify it was marked as read
      const { data: status } = await supabase
        .from('message_status')
        .select('*')
        .eq('message_id', message.id)
        .eq('user_id', userB.id)
        .single();

      expect(status!.read_at).toBeTruthy();
    });
  });
});

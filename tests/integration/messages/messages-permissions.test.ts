import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createTestUser, createTestCommunity, TEST_PREFIX } from '../helpers/test-data';
import { 
  setupMessagingUsers, 
  createTestConversation, 
  sendTestMessage, 
  signInAsUser 
} from './messaging-helpers';
import { joinCommunity, leaveCommunity } from '@/features/communities/api';
import * as api from '@/features/messages/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users';
import type { Community } from '@/features/communities';
import type { Conversation } from '@/features/messages/types';

describe('Messages Permissions & Authorization', () => {
  let supabase: SupabaseClient<Database>;
  let userA: User;
  let userB: User;
  let userC: User; // User not in any shared community
  let community: Community;

  beforeAll(async () => {
    supabase = createTestClient();
    
    // Set up two users who share a community
    const setup = await setupMessagingUsers(supabase);
    userA = setup.userA;
    userB = setup.userB;
    community = setup.community;
    
    // Create third user not in any shared community
    userC = await createTestUser(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('RLS Policies - Conversations', () => {
    it('users can only view their own conversations', async () => {
      // Create conversation between userA and userB
      await signInAsUser(supabase, userA);
      const conversation = await createTestConversation(supabase, userB.id);

      // UserA should see the conversation
      const userAConversations = await api.fetchConversations(supabase);
      const userAConversation = userAConversations.conversations.find(c => c.id === conversation.id);
      expect(userAConversation).toBeTruthy();

      // UserB should see the conversation
      await signInAsUser(supabase, userB);
      const userBConversations = await api.fetchConversations(supabase);
      const userBConversation = userBConversations.conversations.find(c => c.id === conversation.id);
      expect(userBConversation).toBeTruthy();

      // UserC should NOT see the conversation
      await signInAsUser(supabase, userC);
      const userCConversations = await api.fetchConversations(supabase);
      const userCConversation = userCConversations.conversations.find(c => c.id === conversation.id);
      expect(userCConversation).toBeFalsy();
    });

    it('non-participants cannot access conversation details', async () => {
      await signInAsUser(supabase, userA);
      const conversation = await createTestConversation(supabase, userB.id);

      // UserC should not be able to fetch this conversation
      await signInAsUser(supabase, userC);
      await expect(
        api.fetchConversation(supabase, conversation.id)
      ).rejects.toThrow();
    });

    it('non-participants cannot fetch messages for conversation', async () => {
      await signInAsUser(supabase, userA);
      const conversation = await createTestConversation(supabase, userB.id);
      await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Secret message`);

      // UserC should not be able to fetch messages
      await signInAsUser(supabase, userC);
      await expect(
        api.fetchMessages(supabase, {
          conversationId: conversation.id,
          limit: 50
        })
      ).rejects.toThrow();
    });
  });

  describe('RLS Policies - Messages', () => {
    let conversation: Conversation;

    beforeAll(async () => {
      await signInAsUser(supabase, userA);
      conversation = await createTestConversation(supabase, userB.id);
    });

    it('only participants can send messages', async () => {
      // UserA can send message (participant)
      await signInAsUser(supabase, userA);
      const message = await api.sendMessage(supabase, {
        conversationId: conversation.id,
        content: `${TEST_PREFIX} Participant message`,
        messageType: 'text'
      });
      expect(message).toBeTruthy();

      // UserC cannot send message (non-participant)
      await signInAsUser(supabase, userC);
      await expect(
        api.sendMessage(supabase, {
          conversationId: conversation.id,
          content: `${TEST_PREFIX} Unauthorized message`,
          messageType: 'text'
        })
      ).rejects.toThrow();
    });

    it('only participants can view messages', async () => {
      // Send message as userA
      await signInAsUser(supabase, userA);
      const message = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Private message`);

      // UserB can view messages (participant)
      await signInAsUser(supabase, userB);
      const messages = await api.fetchMessages(supabase, {
        conversationId: conversation.id,
        limit: 50
      });
      
      const foundMessage = messages.messages.find(m => m.id === message.id);
      expect(foundMessage).toBeTruthy();

      // UserC cannot view messages (non-participant)
      await signInAsUser(supabase, userC);
      await expect(
        api.fetchMessages(supabase, {
          conversationId: conversation.id,
          limit: 50
        })
      ).rejects.toThrow();
    });

    it('sender_id must match authenticated user', async () => {
      await signInAsUser(supabase, userA);

      // Try to send message with different sender_id (this should be prevented by RLS)
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: userB.id, // Wrong sender_id
          content: `${TEST_PREFIX} Spoofed message`,
          message_type: 'text'
        });

      expect(error).toBeTruthy();
    });

    it('cannot send message to non-existent conversation', async () => {
      await signInAsUser(supabase, userA);
      const fakeConversationId = '00000000-0000-0000-0000-000000000000';

      await expect(
        api.sendMessage(supabase, {
          conversationId: fakeConversationId,
          content: `${TEST_PREFIX} Message to nowhere`,
          messageType: 'text'
        })
      ).rejects.toThrow();
    });
  });

  describe('Community Requirements', () => {
    it('users must share community to start conversation', async () => {
      await signInAsUser(supabase, userA);

      // UserA and userC don't share a community
      await expect(
        api.startConversation(supabase, {
          otherUserId: userC.id
        })
      ).rejects.toThrow();
    });

    it('allows conversation when users share multiple communities', async () => {
      // Create second community
      await signInAsUser(supabase, userA);
      const community2 = await createTestCommunity(supabase);

      // Add userB to second community too
      await signInAsUser(supabase, userB);
      await joinCommunity(supabase, community2.id);

      // Now userA and userB share two communities - conversation should work
      await signInAsUser(supabase, userA);
      const conversation = await api.startConversation(supabase, {
        otherUserId: userB.id
      });

      expect(conversation).toBeTruthy();
    });

    it('handles user leaving shared community', async () => {
      // First, ensure userA and userB share a community and can message
      await signInAsUser(supabase, userA);
      const conversation = await createTestConversation(supabase, userB.id);
      
      // Send a message to confirm it works
      const message = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Before leaving`);
      expect(message).toBeTruthy();

      // UserB leaves the community
      await signInAsUser(supabase, userB);
      await leaveCommunity(supabase, community.id);

      // Now userA should not be able to start NEW conversations with userB
      await signInAsUser(supabase, userA);
      await expect(
        api.startConversation(supabase, {
          otherUserId: userB.id
        })
      ).rejects.toThrow();

      // But existing conversation should still be accessible
      const existingConversation = await api.fetchConversation(supabase, conversation.id);
      expect(existingConversation).toBeTruthy();

      // However, new messages should fail due to community requirement
      await expect(
        api.sendMessage(supabase, {
          conversationId: conversation.id,
          content: `${TEST_PREFIX} After leaving community`,
          messageType: 'text'
        })
      ).rejects.toThrow();
    });
  });

  describe('Self-messaging prevention', () => {
    it('cannot create conversation with self', async () => {
      await signInAsUser(supabase, userA);

      await expect(
        api.startConversation(supabase, {
          otherUserId: userA.id
        })
      ).rejects.toThrow();
    });

    it('get_or_create_conversation RPC fails for same user', async () => {
      await signInAsUser(supabase, userA);

      const { error } = await supabase.rpc('get_or_create_conversation', {
        other_user_id: userA.id
      });

      expect(error).toBeTruthy();
      expect(error!.message).toContain('yourself');
    });
  });

  describe('Database-level security', () => {
    it('direct database access respects RLS policies', async () => {
      // Create conversation between userA and userB
      await signInAsUser(supabase, userA);
      const conversation = await createTestConversation(supabase, userB.id);

      // UserC tries to directly query conversations table
      await signInAsUser(supabase, userC);
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversation.id);

      // Should return empty due to RLS policy
      expect(conversations).toHaveLength(0);
    });

    it('direct message insertion respects RLS policies', async () => {
      await signInAsUser(supabase, userA);
      const conversation = await createTestConversation(supabase, userB.id);

      // UserC tries to directly insert message
      await signInAsUser(supabase, userC);
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: userC.id,
          content: `${TEST_PREFIX} Unauthorized direct insert`,
          message_type: 'text'
        });

      expect(error).toBeTruthy();
    });
  });
});
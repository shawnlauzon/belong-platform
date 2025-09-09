import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createTestUser, TEST_PREFIX } from '../helpers/test-data';
import {
  setupMessagingUsers,
  createTestConversation,
  sendTestMessage,
  signInAsUser,
} from './messaging-helpers';
import { leaveCommunity } from '@/features/communities/api';
import * as api from '@/features/messages/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';
import type { Conversation } from '@/features/messages/types';

describe('Messages Permissions & Authorization', () => {
  let supabase: SupabaseClient<Database>;
  let userA: Account;
  let userB: Account;
  let userC: Account; // User not in any shared community
  let community: Community;
  let conversation: Conversation;

  beforeAll(async () => {
    supabase = createTestClient();

    // Set up two users who share a community
    const setup = await setupMessagingUsers(supabase);
    userA = setup.userA;
    userB = setup.userB;
    community = setup.community;

    conversation = await createTestConversation(supabase, userB.id);

    // Create third user not in any shared community
    userC = await createTestUser(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    await signInAsUser(supabase, userA);
  });

  describe('RLS Policies - Conversations', () => {
    it('users can view a conversation that another created with them', async () => {
      // UserB should see the conversation
      await signInAsUser(supabase, userB);
      const userBConversations = await api.fetchConversations(supabase);
      const userBConversation = userBConversations.find(
        (c) => c.id === conversation.id,
      );
      expect(userBConversation).toBeTruthy();
    });

    it('non-participants cannot fetch messages for conversation', async () => {
      await sendTestMessage(
        supabase,
        conversation.id,
        `${TEST_PREFIX} Secret message`,
      );

      // UserC should not be able to fetch messages (returns empty instead of error)
      await signInAsUser(supabase, userC);
      const messages = await api.fetchMessages(supabase, conversation.id);

      // Should return empty results due to RLS policies
      expect(messages).toHaveLength(0);
    });

    it('only participants can send messages', async () => {
      // UserC cannot send message (non-participant)
      await signInAsUser(supabase, userC);
      await expect(
        api.sendMessage(supabase, {
          conversationId: conversation.id,
          content: `${TEST_PREFIX} Unauthorized message`,
        }),
      ).rejects.toThrow();
    });

    it('cannot send message to non-existent conversation', async () => {
      const fakeConversationId = '00000000-0000-0000-0000-000000000000';

      await expect(
        api.sendMessage(supabase, {
          conversationId: fakeConversationId,
          content: `${TEST_PREFIX} Message to nowhere`,
        }),
      ).rejects.toThrow();
    });
  });

  describe('Community Requirements', () => {
    it('users must share community to start conversation', async () => {
      // UserA and userC don't share a community
      await expect(
        api.startConversation(supabase, {
          otherUserId: userC.id,
        }),
      ).rejects.toThrow();
    });

    it.skip('handles user leaving shared community', async () => {
      // First, ensure userA and userB share a community and can message
      await signInAsUser(supabase, userA);
      const conversation = await createTestConversation(supabase, userB.id);

      // Send a message to confirm it works
      const message = await sendTestMessage(
        supabase,
        conversation.id,
        `${TEST_PREFIX} Before leaving`,
      );
      expect(message).toBeTruthy();

      // UserB leaves the community
      await signInAsUser(supabase, userB);
      await leaveCommunity(supabase, community.id);

      // NOTE: Conversations can be continued even if someone leaves the community.
      // This is by design - existing conversations remain accessible via startConversation
      // regardless of current community membership. Only new conversations require
      // shared community membership.
      await signInAsUser(supabase, userA);
      await expect(
        api.startConversation(supabase, {
          otherUserId: userB.id,
        }),
      ).rejects.toThrow();

      // But existing conversation should still be accessible
      const existingConversation = await api.fetchDirectConversation(
        supabase,
        conversation.id,
      );
      expect(existingConversation).toBeTruthy();
    });
  });

  describe('Database-level security', () => {
    it('direct database access respects RLS policies', async () => {
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
      // UserC tries to directly insert message
      await signInAsUser(supabase, userC);
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversation.id,
        sender_id: userC.id,
        content: `${TEST_PREFIX} Unauthorized direct insert`,
      });

      expect(error).toBeTruthy();
    });
  });
});

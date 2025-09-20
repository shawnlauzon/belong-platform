import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  setupMessagingUsers,
  signInAsUser,
  sendTestMessage,
  assertMessageExists,
} from './messaging-helpers';
import { createTestUser } from '../helpers/test-data';
import * as api from '@/features/messages/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';
import { CommunityChat } from '@/features';
import { cleanupAllTestData } from '../helpers/cleanup';

describe('Community Conversations Integration', () => {
  let supabase: SupabaseClient<Database>;
  let userA: Account;
  let userB: Account;
  let community: Community;

  beforeAll(async () => {
    supabase = createTestClient();
    const setup = await setupMessagingUsers(supabase);
    userA = setup.userA;
    userB = setup.userB;
    community = setup.community;
  });

  beforeEach(async () => {
    await signInAsUser(supabase, userA);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Fetch community conversations', () => {
    it('is automatically created', async () => {
      const conversation = await api.fetchCommunityChat(supabase, community.id);

      expect(conversation).toMatchObject({
        id: expect.any(String),
        communityId: community.id,
        conversationType: 'community',
      });
    });

    it('is idempotent - returns existing conversation if it exists', async () => {
      const conversation1 = await api.fetchCommunityChat(
        supabase,
        community.id,
      );
      const conversation2 = await api.fetchCommunityChat(
        supabase,
        community.id,
      );

      expect(conversation1.id).toBe(conversation2.id);
    });

    it('fails when user is not a community member', async () => {
      // Create a user not in the community
      await createTestUser(supabase);

      await expect(
        api.fetchCommunityChat(supabase, community.id),
      ).rejects.toThrow();
    });
  });

  describe('Sending messages', () => {
    let communityConversation: CommunityChat;

    beforeAll(async () => {
      await signInAsUser(supabase, userA);
      communityConversation = await api.fetchCommunityChat(
        supabase,
        community.id,
      );
    });

    it('allows community members to send messages', async () => {
      const message = await sendTestMessage(
        supabase,
        communityConversation.id,
        'Hello community!',
      );

      expect(message).toBeTruthy();
      expect(message.conversationId).toBe(communityConversation.id);
      expect(message.content).toBe('Hello community!');
      expect(message.senderId).toBe(userA.id);

      await assertMessageExists(supabase, message.id);
    });

    it('allows multiple users to send messages in community chat', async () => {
      const messageA = await sendTestMessage(
        supabase,
        communityConversation.id,
        'Message from A',
      );

      // UserB sends a message
      await signInAsUser(supabase, userB);
      const messageB = await sendTestMessage(
        supabase,
        communityConversation.id,
        'Message from B',
      );

      expect(messageA.senderId).toBe(userA.id);
      expect(messageB.senderId).toBe(userB.id);

      await assertMessageExists(supabase, messageA.id);
      await assertMessageExists(supabase, messageB.id);

      // Verify both messages exist in the conversation
      await signInAsUser(supabase, userA);
      const messages = await api.fetchMessages(
        supabase,
        communityConversation.id,
      );

      expect(messages.length).toBeGreaterThanOrEqual(2);
      const messageIds = messages.map((m) => m.id);
      expect(messageIds).toContain(messageA.id);
      expect(messageIds).toContain(messageB.id);
    });

    it('prevents non-members from sending messages', async () => {
      const outsiderUser = await createTestUser(supabase);

      // Sign in as the outsider user to test unauthorized access
      await signInAsUser(supabase, outsiderUser);

      await expect(
        sendTestMessage(
          supabase,
          communityConversation.id,
          'Unauthorized message',
        ),
      ).rejects.toThrow();
    });
  });
});

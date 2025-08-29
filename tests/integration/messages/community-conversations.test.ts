import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  setupMessagingUsers,
  signInAsUser,
  sendTestMessage,
} from './messaging-helpers';
import { createTestUser } from '../helpers/test-data';
import * as api from '@/features/messages/api';
import { joinCommunity } from '@/features/communities/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users';
import type { Community } from '@/features/communities';
import type { CommunityConversation } from '@/features/messages/types';

describe('Community Conversations Integration', () => {
  let supabase: SupabaseClient<Database>;
  let userA: User;
  let userB: User;
  let community: Community;

  beforeAll(async () => {
    supabase = createTestClient();
    const setup = await setupMessagingUsers(supabase);
    userA = setup.userA;
    userB = setup.userB;
    community = setup.community;
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('createCommunityConversation', () => {
    it('creates community conversation successfully', async () => {
      await signInAsUser(supabase, userA);

      const conversationId = await api.createCommunityConversation(
        supabase,
        community.id,
      );

      expect(conversationId).toBeTruthy();
      expect(typeof conversationId).toBe('string');

      // Verify conversation exists in database with correct type
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      expect(error).toBeFalsy();
      expect(conversation).toBeTruthy();
      expect(conversation!.community_id).toBe(community.id);
      expect(conversation!.conversation_type).toBe('community');
    });

    it('automatically adds all community members as participants', async () => {
      await signInAsUser(supabase, userA);

      const conversationId = await api.createCommunityConversation(
        supabase,
        community.id,
      );

      // Check that both community members were added as participants
      const { data: participants, error } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId);

      expect(error).toBeFalsy();
      expect(participants).toBeTruthy();
      expect(participants!.length).toBeGreaterThanOrEqual(2);

      const participantIds = participants!.map((p) => p.user_id);
      expect(participantIds).toContain(userA.id);
      expect(participantIds).toContain(userB.id);
    });

    it('is idempotent - returns existing conversation if it exists', async () => {
      await signInAsUser(supabase, userA);

      const conversationId1 = await api.createCommunityConversation(
        supabase,
        community.id,
      );
      const conversationId2 = await api.createCommunityConversation(
        supabase,
        community.id,
      );

      expect(conversationId1).toBe(conversationId2);
    });

    it('fails when user is not a community member', async () => {
      // Create a user not in the community
      const outsiderUser = await createTestUser(supabase);

      // Sign in as the outsider user to test unauthorized access
      await signInAsUser(supabase, outsiderUser);

      await expect(
        api.createCommunityConversation(supabase, community.id),
      ).rejects.toThrow();
    });
  });

  describe('fetchCommunityConversation', () => {
    let communityConversationId: string;

    beforeAll(async () => {
      await signInAsUser(supabase, userA);
      communityConversationId = await api.createCommunityConversation(
        supabase,
        community.id,
      );
    });

    it('fetches community conversation successfully', async () => {
      await signInAsUser(supabase, userA);

      const conversation = await api.fetchCommunityConversation(
        supabase,
        community.id,
      );

      expect(conversation).toBeTruthy();
      expect(conversation!.id).toBe(communityConversationId);
      expect(conversation!.communityId).toBe(community.id);
      expect(conversation!.conversationType).toBe('community');
      expect(conversation!.participantCount).toBeGreaterThanOrEqual(2);
      expect(conversation!.unreadCount).toBe(0); // No messages yet
      expect(conversation!.lastReadAt).toBeFalsy();
    });

    it('returns null when no community conversation exists', async () => {
      const isolatedUser = await createTestUser(supabase);

      // Sign in as the isolated user before creating their community
      await signInAsUser(supabase, isolatedUser);

      const isolatedCommunity = await (async () => {
        const { createTestCommunity } = await import('../helpers/test-data');
        return createTestCommunity(supabase);
      })();

      const conversation = await api.fetchCommunityConversation(
        supabase,
        isolatedCommunity.id,
      );
      expect(conversation).toBeNull();
    });

    it('fails when user is not a community member', async () => {
      const outsiderUser = await createTestUser(supabase);

      // Sign in as the outsider user to test unauthorized access
      await signInAsUser(supabase, outsiderUser);

      await expect(
        api.fetchCommunityConversation(supabase, community.id),
      ).rejects.toThrow();
    });
  });

  describe('Community messaging', () => {
    let communityConversation: CommunityConversation;

    beforeAll(async () => {
      await signInAsUser(supabase, userA);
      const conversationId = await api.createCommunityConversation(
        supabase,
        community.id,
      );
      const fetchedConversation = await api.fetchCommunityConversation(
        supabase,
        community.id,
      );
      if (!fetchedConversation) {
        throw new Error(
          'Failed to fetch community conversation in test setup - userA cannot access conversation',
        );
      }
      communityConversation = fetchedConversation;
    });

    it('allows community members to send messages', async () => {
      await signInAsUser(supabase, userA);

      const message = await sendTestMessage(
        supabase,
        communityConversation.id,
        'Hello community!',
      );

      expect(message).toBeTruthy();
      expect(message.conversationId).toBe(communityConversation.id);
      expect(message.content).toBe('Hello community!');
      expect(message.senderId).toBe(userA.id);
    });

    it('allows multiple users to send messages in community chat', async () => {
      // UserA sends a message
      await signInAsUser(supabase, userA);
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

    it('updates conversation metadata on new message', async () => {
      await signInAsUser(supabase, userA);
      const testContent = 'Test message for metadata update';

      const message = await sendTestMessage(
        supabase,
        communityConversation.id,
        testContent,
      );

      // Refetch the conversation to check updated metadata
      const updatedConversation = await api.fetchCommunityConversation(
        supabase,
        community.id,
      );

      expect(updatedConversation).toBeTruthy();
      expect(updatedConversation!.lastMessagePreview).toBe(testContent);
      expect(updatedConversation!.lastMessageSenderId).toBe(userA.id);
      expect(updatedConversation!.lastMessageAt).toBeTruthy();
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

  describe('Participant management', () => {
    let communityConversation: CommunityConversation;

    beforeAll(async () => {
      await signInAsUser(supabase, userA);
      const conversationId = await api.createCommunityConversation(
        supabase,
        community.id,
      );
      const fetchedConversation = await api.fetchCommunityConversation(
        supabase,
        community.id,
      );
      if (!fetchedConversation) {
        throw new Error(
          'Failed to fetch community conversation in test setup - userA cannot access conversation',
        );
      }
      communityConversation = fetchedConversation;
    });

    it('automatically adds new community members to conversation', async () => {
      // Create a new user and join them to the community
      const newUser = await createTestUser(supabase);

      // Sign in as the new user before joining the community
      await signInAsUser(supabase, newUser);
      await joinCommunity(supabase, community.id);

      // Check if they were added to the community conversation
      const { data: participants, error } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', communityConversation.id);

      expect(error).toBeFalsy();
      const participantIds = participants!.map((p) => p.user_id);
      expect(participantIds).toContain(newUser.id);
    });

    it('updates participant count correctly', async () => {
      await signInAsUser(supabase, userA);

      const updatedConversation = await api.fetchCommunityConversation(
        supabase,
        community.id,
      );

      expect(updatedConversation).toBeTruthy();
      expect(updatedConversation!.participantCount).toBeGreaterThanOrEqual(3); // At least userA, userB, and the new user
    });
  });

  describe('Read status and unread counts', () => {
    let communityConversation: CommunityConversation;

    beforeAll(async () => {
      await signInAsUser(supabase, userA);
      const conversationId = await api.createCommunityConversation(
        supabase,
        community.id,
      );
      const fetchedConversation = await api.fetchCommunityConversation(
        supabase,
        community.id,
      );
      if (!fetchedConversation) {
        throw new Error(
          'Failed to fetch community conversation in test setup - userA cannot access conversation',
        );
      }
      communityConversation = fetchedConversation;
    });

    it('increments unread count for recipients when message is sent', async () => {
      // UserA sends a message
      await signInAsUser(supabase, userA);
      await sendTestMessage(
        supabase,
        communityConversation.id,
        'Test unread message',
      );

      // UserB should have unread count incremented
      await signInAsUser(supabase, userB);
      const conversationForB = await api.fetchCommunityConversation(
        supabase,
        community.id,
      );

      expect(conversationForB).toBeTruthy();
      expect(conversationForB!.unreadCount).toBeGreaterThan(0);
    });

    it('allows marking community messages as read', async () => {
      await signInAsUser(supabase, userB);

      // Mark messages as read
      await api.markAsRead(supabase, communityConversation.id);

      // Check that unread count is reset
      const updatedConversation = await api.fetchCommunityConversation(
        supabase,
        community.id,
      );
      expect(updatedConversation).toBeTruthy();
      expect(updatedConversation!.unreadCount).toBe(0);
      expect(updatedConversation!.lastReadAt).toBeTruthy();
    });
  });

  describe('Edge cases and error conditions', () => {
    it('handles non-existent community gracefully', async () => {
      await signInAsUser(supabase, userA);
      const fakeCommunityId = '00000000-0000-0000-0000-000000000000';

      await expect(
        api.createCommunityConversation(supabase, fakeCommunityId),
      ).rejects.toThrow();
    });

    it('handles unauthenticated user gracefully', async () => {
      await supabase.auth.signOut();

      await expect(
        api.fetchCommunityConversation(supabase, community.id),
      ).rejects.toThrow();

      // Sign back in for cleanup
      await signInAsUser(supabase, userA);
    });
  });
});

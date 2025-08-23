import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { setupMessagingUsers, createTestConversation, assertConversationExists, signInAsUser } from './messaging-helpers';
import { createTestUser } from '../helpers/test-data';
import * as api from '@/features/messages/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users';
import type { Community } from '@/features/communities';
import { joinCommunity } from '@/features/communities/api';

describe('Conversations CRUD Operations', () => {
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

  describe('startConversation', () => {
    it('creates conversation between two users in same community', async () => {
      // Create fresh users to ensure we're testing a truly new conversation
      const freshUserA = await createTestUser(supabase);
      await joinCommunity(supabase, community.id);
      const freshUserB = await createTestUser(supabase);
      await joinCommunity(supabase, community.id);
            
      // Sign in as fresh userA to start conversation with fresh userB
      await signInAsUser(supabase, freshUserA);
      
      const conversation = await api.startConversation(supabase, {
        otherUserId: freshUserB.id
      });

      // Verify conversation object for a truly new conversation
      expect(conversation).toBeTruthy();
      expect(conversation.id).toBeTruthy();
      expect(conversation.otherParticipant).toBeTruthy();
      expect(conversation.otherParticipant.id).toBe(freshUserB.id);
      expect(conversation.unreadCount).toBe(0);
      expect(conversation.lastMessageAt).toBe(null);

      // Verify database record and participants
      await assertConversationExists(supabase, conversation.id, [freshUserA.id, freshUserB.id]);
    });

    it('returns existing conversation (idempotent operation)', async () => {
      // Sign in as userA
      await signInAsUser(supabase, userA);
      
      // Create first conversation
      const conversation1 = await api.startConversation(supabase, {
        otherUserId: userB.id
      });

      // Create second conversation with same user
      const conversation2 = await api.startConversation(supabase, {
        otherUserId: userB.id
      });

      // Should return the same conversation
      expect(conversation1.id).toBe(conversation2.id);
    });

    it('cannot create conversation with yourself', async () => {
      await signInAsUser(supabase, userA);
      
      await expect(
        api.startConversation(supabase, {
          otherUserId: userA.id
        })
      ).rejects.toThrow();
    });

    it('cannot create conversation without shared community', async () => {
      // Create a user not in any shared community
      const isolatedUser = await createTestUser(supabase);
      
      // Try to start conversation with isolated user
      await signInAsUser(supabase, userA);
      
      await expect(
        api.startConversation(supabase, {
          otherUserId: isolatedUser.id
        })
      ).rejects.toThrow();
    });
  });

  describe('fetchConversations', () => {
    it('fetches user\'s conversation list', async () => {
      // Set up conversation for testing
      await signInAsUser(supabase, userA);
      const conversation = await createTestConversation(supabase, userB.id);

      // Fetch conversations
      const result = await api.fetchConversations(supabase);

      expect(result).toBeTruthy();
      expect(result.conversations).toBeInstanceOf(Array);
      expect(result.conversations.length).toBeGreaterThan(0);
      
      // Find our test conversation
      const testConversation = result.conversations.find(c => c.id === conversation.id);
      expect(testConversation).toBeTruthy();
      expect(testConversation!.otherParticipant.id).toBe(userB.id);
    });

    it('returns empty list for user with no conversations', async () => {
      // Create a new isolated user
      const newUser = await createTestUser(supabase);
      
      const result = await api.fetchConversations(supabase);
      
      expect(result).toBeTruthy();
      expect(result.conversations).toBeInstanceOf(Array);
      expect(result.conversations.length).toBe(0);
    });
  });

  describe('fetchConversation', () => {
    it('fetches single conversation details', async () => {
      await signInAsUser(supabase, userA);
      const conversation = await createTestConversation(supabase, userB.id);

      const fetchedConversation = await api.fetchConversation(supabase, conversation.id);

      expect(fetchedConversation).toBeTruthy();
      expect(fetchedConversation.id).toBe(conversation.id);
      expect(fetchedConversation.otherParticipant.id).toBe(userB.id);
      expect(fetchedConversation.unreadCount).toBe(0);
    });

    it('fails to fetch conversation user is not participant of', async () => {
      // Create conversation between userA and userB
      await signInAsUser(supabase, userA);
      const conversation = await createTestConversation(supabase, userB.id);

      // Create third user and try to fetch conversation they're not part of
      const userC = await createTestUser(supabase);
      
      await expect(
        api.fetchConversation(supabase, conversation.id)
      ).rejects.toThrow();
    });
  });

  describe('Database constraints', () => {
    it('conversation has exactly 2 participants', async () => {
      await signInAsUser(supabase, userA);
      const conversation = await createTestConversation(supabase, userB.id);

      // Verify exactly 2 participants
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversation.id);

      expect(participants).toHaveLength(2);
      expect(participants!.map(p => p.user_id).sort()).toEqual([userA.id, userB.id].sort());
    });

    it.only('prevents a third user from joining', async () => {
      await signInAsUser(supabase, userA);
      const conversation = await createTestConversation(supabase, userB.id);

      // UserC tries to directly join conversation
      const userC = await createTestUser(supabase);
      await joinCommunity(supabase, community.id);
      const { error } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: userC.id
        });

      expect(error).toBeTruthy();
    });

  });
});
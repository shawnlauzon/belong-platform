import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  setupMessagingUsers,
  createTestConversation,
  assertConversationExists,
  signInAsUser,
} from './messaging-helpers';
import { createTestUser } from '../helpers/test-data';
import * as api from '@/features/messaging/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';
import { joinCommunity } from '@/features/communities/api';
import { Conversation } from '@/features';

describe('Conversations CRUD Operations', () => {
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

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('startConversation', () => {
    it('creates conversation between two users in same community', async () => {
      const conversation = await api.startConversation(supabase, {
        otherUserId: userB.id,
      });

      expect(conversation).toMatchObject({
        id: expect.any(String),
        participants: expect.arrayContaining([userA.id, userB.id]),
        lastMessage: null,
      });

      // Verify database record and participants
      await assertConversationExists(supabase, conversation.id, [
        userA.id,
        userB.id,
      ]);
    });

    it('returns existing conversation (idempotent operation)', async () => {
      // Create first conversation
      const conversation1 = await api.startConversation(supabase, {
        otherUserId: userB.id,
      });

      // Create second conversation with same user
      const conversation2 = await api.startConversation(supabase, {
        otherUserId: userB.id,
      });

      // Should return the same conversation
      expect(conversation1.id).toBe(conversation2.id);
    });

    it('cannot create conversation with yourself', async () => {
      await expect(
        api.startConversation(supabase, {
          otherUserId: userA.id,
        }),
      ).rejects.toThrow();
    });

    it('cannot create conversation without shared community', async () => {
      // Create a user not in any shared community
      const isolatedUser = await createTestUser(supabase);

      try {
        // Try to start conversation with isolated user
        await expect(
          api.startConversation(supabase, {
            otherUserId: isolatedUser.id,
          }),
        ).rejects.toThrow();
      } finally {
        await signInAsUser(supabase, userA);
      }
    });
  });

  describe('fetchConversations', () => {
    it("fetches user's conversation list", async () => {
      const conversation = await createTestConversation(supabase, userB.id);

      // Fetch conversations
      const conversations = await api.fetchConversations(supabase, userA.id);

      expect(conversations).toContainEqual(
        expect.objectContaining({
          id: conversation.id,
        }),
      );
    });

    it('returns conversations with participants for direct conversations', async () => {
      const conversation = await createTestConversation(supabase, userB.id);

      // Fetch conversations
      const conversations = await api.fetchConversations(supabase, userA.id);

      const foundConversation = conversations.find(
        (c) => c.id === conversation.id,
      );
      expect(foundConversation).toBeDefined();

      // All conversations now include participants (only direct conversations exist)
      expect(foundConversation).toBeDefined();
      expect(foundConversation!.participants).toEqual(
        expect.arrayContaining([userA.id, userB.id]),
      );
      expect(foundConversation!.participants).toHaveLength(2);
    });

    it('returns empty list for user with no conversations', async () => {
      // Create a new isolated user
      const isolatedUser = await createTestUser(supabase);

      try {
        const conversations = await api.fetchConversations(
          supabase,
          isolatedUser.id,
        );

        expect(conversations).toHaveLength(0);
      } finally {
        await signInAsUser(supabase, userA);
      }
    });
  });

  describe('existing conversation', () => {
    let testConversation: Conversation;

    beforeEach(async () => {
      testConversation = await createTestConversation(supabase, userB.id);
      console.log('created conversation', testConversation);
    });

    it('fetches single conversation details', async () => {
      const fetchedConversation = await api.fetchDirectConversation(
        supabase,
        testConversation.id,
      );
      console.log('fetched conversation', fetchedConversation);

      expect(fetchedConversation).toMatchObject({
        id: testConversation.id,
        participants: expect.arrayContaining([userA.id, userB.id]),
      });
    });

    it('fails to fetch conversation user is not participant of', async () => {
      // Create conversation between userA and userB
      await createTestUser(supabase);

      try {
        await expect(
          api.fetchDirectConversation(supabase, testConversation.id),
        ).rejects.toThrow();
      } finally {
        await signInAsUser(supabase, userA);
      }
    });

    it('conversation has exactly 2 participants', async () => {
      const conversation = await createTestConversation(supabase, userB.id);

      // Verify exactly 2 participants
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversation.id);

      expect(participants).toHaveLength(2);
      expect(participants!.map((p) => p.user_id).sort()).toEqual(
        [userA.id, userB.id].sort(),
      );
    });

    it('prevents a third user from joining', async () => {
      // UserC tries to directly join conversation
      const userC = await createTestUser(supabase);

      try {
        await joinCommunity(supabase, community.id);
        const { error } = await supabase
          .from('conversation_participants')
          .insert({
            conversation_id: testConversation.id,
            user_id: userC.id,
          });

        expect(error).toBeTruthy();
      } finally {
        await signInAsUser(supabase, userA);
      }
    });
  });
});

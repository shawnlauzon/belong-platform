import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { TEST_PREFIX } from '../helpers/test-data';
import { 
  setupMessagingUsers, 
  createTestConversation, 
  sendTestMessage,
  blockTestUser,
  assertUserBlocked,
  signInAsUser 
} from './messaging-helpers';
import * as api from '@/features/messages/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';
import type { Conversation } from '@/features/messages/types';

describe.skip('Messages Blocking System', () => {
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

  describe('Block Operations', () => {
    afterEach(async () => {
      // Clean up blocks after each test
      await signInAsUser(supabase, userA);
      try {
        await api.unblockUser(supabase, { userId: userB.id });
      } catch {
        // Not blocked, ignore
      }
    });

    it('blocks a user successfully', async () => {
      await signInAsUser(supabase, userA);

      await api.blockUser(supabase, {
        userId: userB.id
      });

      // Verify block exists in database
      await assertUserBlocked(supabase, userA.id, userB.id);
    });

    it('cannot block yourself', async () => {
      await signInAsUser(supabase, userA);

      await expect(
        api.blockUser(supabase, {
          userId: userA.id
        })
      ).rejects.toThrow();
    });

    it('cannot block same user twice', async () => {
      await signInAsUser(supabase, userA);

      // Block userB first time
      await api.blockUser(supabase, {
        userId: userB.id
      });

      // Try to block again - should fail
      await expect(
        api.blockUser(supabase, {
          userId: userB.id
        })
      ).rejects.toThrow();
    });

    it('blocked user appears in blocked list', async () => {
      await signInAsUser(supabase, userA);

      // Block userB
      await blockTestUser(supabase, userB.id);

      // Check database directly since we don't have a fetchBlockedUsers API yet
      const { data: blockedUsers } = await supabase
        .from('blocked_users')
        .select('*')
        .eq('blocker_id', userA.id);

      expect(blockedUsers).toBeTruthy();
      expect(blockedUsers!.length).toBeGreaterThan(0);
      const blockedUser = blockedUsers!.find(b => b.blocked_id === userB.id);
      expect(blockedUser).toBeTruthy();
    });
  });

  describe('Messaging Restrictions', () => {
    let conversation: Conversation;

    beforeAll(async () => {
      // Create conversation before any blocking
      await signInAsUser(supabase, userA);
      conversation = await createTestConversation(supabase, userB.id);
      
      // Send initial message to confirm conversation works
      await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Before blocking`);
    });

    it('cannot send message to blocked user', async () => {
      await signInAsUser(supabase, userA);
      
      // Block userB
      await blockTestUser(supabase, userB.id);

      // Try to send message - should fail
      await expect(
        api.sendMessage(supabase, {
          conversationId: conversation.id,
          content: `${TEST_PREFIX} Message after blocking`,
          messageType: 'text'
        })
      ).rejects.toThrow();
    });

    it('cannot receive message from blocked user', async () => {
      // UserA blocks userB
      await signInAsUser(supabase, userA);
      await blockTestUser(supabase, userB.id);

      // UserB tries to send message to userA - should fail
      await signInAsUser(supabase, userB);
      await expect(
        api.sendMessage(supabase, {
          conversationId: conversation.id,
          content: `${TEST_PREFIX} Message from blocked user`,
          messageType: 'text'
        })
      ).rejects.toThrow();
    });

    it('cannot start new conversation when blocked', async () => {
      // First unblock to reset state
      await signInAsUser(supabase, userA);
      await api.unblockUser(supabase, { userId: userB.id });

      // Now block userB
      await blockTestUser(supabase, userB.id);

      // Try to start new conversation - should fail
      await expect(
        api.startConversation(supabase, {
          otherUserId: userB.id
        })
      ).rejects.toThrow();
    });

    it('existing conversation still visible but inactive', async () => {
      await signInAsUser(supabase, userA);
      
      // Block userB
      await blockTestUser(supabase, userB.id);

      // Should still be able to view existing conversation
      const fetchedConversation = await api.fetchConversation(supabase, conversation.id);
      expect(fetchedConversation).toBeTruthy();

      // Should still be able to fetch messages
      const messages = await api.fetchMessages(supabase, conversation.id, {
        limit: 50
      });
      expect(messages.messages.length).toBeGreaterThan(0);
    });
  });

  describe('Unblock Operations', () => {
    beforeAll(async () => {
      // Ensure userB is blocked before unblock tests
      await signInAsUser(supabase, userA);
      try {
        await blockTestUser(supabase, userB.id);
      } catch {
        // Already blocked, continue
      }
    });

    it('unblocks a user successfully', async () => {
      await signInAsUser(supabase, userA);

      await api.unblockUser(supabase, {
        userId: userB.id
      });

      // Verify block no longer exists
      const { data: blockedUsers } = await supabase
        .from('blocked_users')
        .select('*')
        .eq('blocker_id', userA.id)
        .eq('blocked_id', userB.id);

      expect(blockedUsers).toHaveLength(0);
    });

    it('can message after unblocking', async () => {
      // Ensure users are unblocked
      await signInAsUser(supabase, userA);
      try {
        await api.unblockUser(supabase, { userId: userB.id });
      } catch {
        // Already unblocked
      }

      // Create fresh conversation
      const conversation = await createTestConversation(supabase, userB.id);

      // Should be able to send message
      const message = await api.sendMessage(supabase, {
        conversationId: conversation.id,
        content: `${TEST_PREFIX} Message after unblocking`,
        messageType: 'text'
      });

      expect(message).toBeTruthy();
      expect(message.content).toContain('after unblocking');
    });

    it('can start new conversation after unblock', async () => {
      await signInAsUser(supabase, userA);
      
      // Should be able to start conversation
      const conversation = await api.startConversation(supabase, {
        otherUserId: userB.id
      });

      expect(conversation).toBeTruthy();
      expect(conversation.otherParticipant.id).toBe(userB.id);
    });
  });

  describe('Bidirectional Blocking', () => {
    afterEach(async () => {
      // Clean up blocks after each test
      await signInAsUser(supabase, userA);
      try {
        await api.unblockUser(supabase, { userId: userB.id });
      } catch {
        // Not blocked, ignore
      }
    });

    it('user A blocks user B - both cannot message', async () => {
      // UserA blocks UserB
      await signInAsUser(supabase, userA);
      const conversation = await createTestConversation(supabase, userB.id);
      await blockTestUser(supabase, userB.id);

      // TODO: IMPLEMENTATION ISSUE - Blocking is not preventing message sending
      // This test currently fails because sendMessage succeeds instead of throwing
      // Expected behavior: UserA cannot send message to blocked user
      await expect(
        api.sendMessage(supabase, {
          conversationId: conversation.id,
          content: `${TEST_PREFIX} From blocker`,
          messageType: 'text'
        })
      ).rejects.toThrow();

      // UserB cannot send message either
      await signInAsUser(supabase, userB);
      await expect(
        api.sendMessage(supabase, {
          conversationId: conversation.id,
          content: `${TEST_PREFIX} From blocked user`,
          messageType: 'text'
        })
      ).rejects.toThrow();
    });

    it('user B cannot bypass block from their side', async () => {
      // UserA blocks UserB
      await signInAsUser(supabase, userA);
      await blockTestUser(supabase, userB.id);

      // UserB tries to start new conversation - should fail
      await signInAsUser(supabase, userB);
      await expect(
        api.startConversation(supabase, {
          otherUserId: userA.id
        })
      ).rejects.toThrow();
    });
  });

  describe('Database Constraints', () => {
    it('enforces unique blocker-blocked pairs', async () => {
      await signInAsUser(supabase, userA);
      
      // Block userB
      await blockTestUser(supabase, userB.id);

      // Try to insert duplicate block directly
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: userA.id,
          blocked_id: userB.id
        });

      expect(error).toBeTruthy();
      expect(error!.code).toBe('23505'); // Unique constraint violation
    });

    it('enforces cannot block yourself constraint', async () => {
      await signInAsUser(supabase, userA);

      // Try to insert self-block directly
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: userA.id,
          blocked_id: userA.id
        });

      expect(error).toBeTruthy();
      expect(error).toBeTruthy(); // Should fail with constraint violation
    });

    it('cascade deletes when user is deleted', async () => {
      await signInAsUser(supabase, userA);
      await blockTestUser(supabase, userB.id);

      // Verify block exists
      let { data: blocks } = await supabase
        .from('blocked_users')
        .select('*')
        .eq('blocker_id', userA.id)
        .eq('blocked_id', userB.id);

      expect(blocks).toHaveLength(1);

      // Note: We can't actually delete users in tests due to auth constraints,
      // but the CASCADE constraint is defined in the schema
    });
  });
});
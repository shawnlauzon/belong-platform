import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
} from '../helpers/test-data';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import { createTestConversation } from './messaging-helpers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';

describe('User Is Conversation Participant Function', () => {
  let supabase: SupabaseClient<Database>;
  let userA: Account;
  let userB: Account;
  let userC: Account; // Non-participant user
  let testCommunity: Community;
  let conversationId: string;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create first user (will be auto-signed in)
    userA = await createTestUser(supabase);

    // Create community as userA
    testCommunity = await createTestCommunity(supabase);

    // Create second user (will be auto-signed in as userB)
    userB = await createTestUser(supabase);

    // Join userB to the same community
    await joinCommunity(supabase, userB.id, testCommunity.id);

    // Create third user that won't be in the conversation
    userC = await createTestUser(supabase);
    await joinCommunity(supabase, userC.id, testCommunity.id);

    // Sign back in as userA to create conversation
    await signIn(supabase, userA.email, 'TestPass123!');

    // Create a conversation between userA and userB
    const conversation = await createTestConversation(supabase, userB.id);
    conversationId = conversation.id;
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Sign in as userA for consistency
    await signIn(supabase, userA.email, 'TestPass123!');
  });

  it('should return true when user is a participant in the conversation', async () => {
    // Test that userA (participant) is correctly identified
    const { data: resultUserA } = await supabase.rpc('user_is_conversation_participant', {
      conv_id: conversationId,
      check_user_id: userA.id,
    });

    expect(resultUserA).toBe(true);

    // Test that userB (participant) is correctly identified
    const { data: resultUserB } = await supabase.rpc('user_is_conversation_participant', {
      conv_id: conversationId,
      check_user_id: userB.id,
    });

    expect(resultUserB).toBe(true);
  });

  it('should return false when user is not a participant in the conversation', async () => {
    // Test that userC (non-participant) is correctly identified as not a participant
    const { data: result } = await supabase.rpc('user_is_conversation_participant', {
      conv_id: conversationId,
      check_user_id: userC.id,
    });

    expect(result).toBe(false);
  });
});
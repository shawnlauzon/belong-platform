import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';
import type {
  Conversation,
  Message,
  SendMessageInput,
} from '@/features/messages/types';
import {
  createTestUser,
  createTestCommunity,
  TEST_PREFIX,
} from '../helpers/test-data';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import * as messagesApi from '@/features/messages/api';
import { faker } from '@faker-js/faker';

/**
 * Creates two test users that share a community for messaging tests.
 * Both users will be in the same community and signed in as the second user.
 */
export async function setupMessagingUsers(
  supabase: SupabaseClient<Database>,
): Promise<{
  userA: Account;
  userB: Account;
  community: Community;
}> {
  // Create first user (will be auto-signed in)
  const userA = await createTestUser(supabase);

  // Create community as userA
  const community = await createTestCommunity(supabase);

  // Create second user (will be auto-signed in as userB)
  const userB = await createTestUser(supabase);

  // Join userB to the same community
  await joinCommunity(supabase, community.id);

  await signInAsUser(supabase, userA);

  return { userA, userB, community };
}

/**
 * Creates a test conversation between two users using the get_or_create_conversation RPC
 */
export async function createTestConversation(
  supabase: SupabaseClient<Database>,
  otherUserId: string,
): Promise<Conversation> {
  const conversation = await messagesApi.startConversation(supabase, {
    otherUserId,
  });

  if (!conversation) {
    throw new Error('Failed to create test conversation');
  }

  return conversation;
}

/**
 * Sends a test message to a conversation
 */
export async function sendTestMessage(
  supabase: SupabaseClient<Database>,
  conversationId: string,
  content?: string,
): Promise<Message> {
  const messageInput: SendMessageInput = {
    conversationId,
    content:
      content || `${TEST_PREFIX} Test message: ${faker.lorem.sentence()}`,
  };

  const message = await messagesApi.sendMessage(supabase, messageInput);

  if (!message) {
    throw new Error('Failed to send test message');
  }

  return message;
}

/**
 * Signs in as a specific user for testing different perspectives
 */
export async function signInAsUser(
  supabase: SupabaseClient<Database>,
  user: Account,
): Promise<void> {
  await signIn(supabase, user.email, 'TestPass123!');
}

// Validation Helpers

/**
 * Asserts that a conversation exists in the database with correct participants
 */
export async function assertConversationExists(
  supabase: SupabaseClient<Database>,
  conversationId: string,
  expectedParticipants?: string[],
): Promise<void> {
  // Check conversation exists
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    throw new Error(
      `Conversation ${conversationId} does not exist: ${convError?.message}`,
    );
  }

  // Check participants if provided
  if (expectedParticipants) {
    const { data: participants, error: partError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId);

    if (partError || !participants) {
      throw new Error(
        `Failed to fetch conversation participants: ${partError?.message}`,
      );
    }

    const participantIds = participants.map((p) => p.user_id).sort();
    const expectedIds = expectedParticipants.sort();

    if (JSON.stringify(participantIds) !== JSON.stringify(expectedIds)) {
      throw new Error(
        `Conversation participants mismatch. Expected: ${expectedIds.join(', ')}, Got: ${participantIds.join(', ')}`,
      );
    }
  }
}

/**
 * Asserts that a message was delivered by checking message_status table
 */
export async function assertMessageDelivered(
  supabase: SupabaseClient<Database>,
  messageId: string,
  recipientUserId: string,
): Promise<void> {
  const { data: messageStatus, error } = await supabase
    .from('conversation_status')
    .select('*')
    .eq('message_id', messageId)
    .eq('user_id', recipientUserId)
    .maybeSingle();

  if (error || !messageStatus) {
    throw new Error(
      `Message status not found for message ${messageId} and user ${recipientUserId}: ${error?.message}`,
    );
  }

  if (!messageStatus.last_received_at) {
    throw new Error(`Message ${messageId} was not marked as delivered`);
  }
}

/**
 * Asserts that a message exists in the database
 */
export async function assertMessageExists(
  supabase: SupabaseClient<Database>,
  messageId: string,
): Promise<Database['public']['Tables']['messages']['Row']> {
  const { data: message, error } = await supabase
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .single();

  if (error || !message) {
    throw new Error(`Message ${messageId} does not exist: ${error?.message}`);
  }

  return message;
}

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';
import type {
  Conversation,
  Message,
  SendMessageInput,
} from '@/features/messaging/types';
import {
  createTestUser,
  createTestCommunity,
  TEST_PREFIX,
} from '../helpers/test-data';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import * as messagesApi from '@/features/messaging/api';
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
  await joinCommunity(supabase, userB.id, community.id);

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

interface SendTestMessageOptions {
  conversationId?: string;
  communityId?: string;
  content?: string;
}

/**
 * Sends a test message to a conversation or community
 */
export async function sendTestMessage(
  supabase: SupabaseClient<Database>,
  options: SendTestMessageOptions,
): Promise<Message> {
  const { conversationId, communityId, content } = options;

  if (!conversationId && !communityId) {
    throw new Error('Either conversationId or communityId must be provided');
  }

  if (conversationId && communityId) {
    throw new Error('Cannot provide both conversationId and communityId');
  }

  // Get the current authenticated user ID
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('User must be authenticated to send message');
  }

  const messageInput: SendMessageInput = {
    conversationId,
    communityId,
    content:
      content || `${TEST_PREFIX} Test message: ${faker.lorem.sentence()}`,
  };

  const message = await messagesApi.sendMessage(supabase, user.id, messageInput);

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
 * Asserts that a message was delivered by checking if the recipient is a participant in the conversation
 */
export async function assertMessageDelivered(
  supabase: SupabaseClient<Database>,
  messageId: string,
  recipientUserId: string,
): Promise<void> {
  // First get the conversation_id and community_id from the message
  const { data: message, error: messageError } = await supabase
    .from('messages')
    .select('conversation_id, community_id')
    .eq('id', messageId)
    .single();

  if (messageError || !message) {
    throw new Error(
      `Message not found: ${messageId}: ${messageError?.message}`,
    );
  }

  if (message.conversation_id) {
    // Check if the recipient is a participant in the conversation
    const { data: participant, error } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', message.conversation_id)
      .eq('user_id', recipientUserId)
      .maybeSingle();

    if (error || !participant) {
      throw new Error(
        `User ${recipientUserId} is not a participant in conversation for message ${messageId}: ${error?.message}`,
      );
    }
  } else if (message.community_id) {
    // Check if the recipient is a member of the community
    const { data: membership, error } = await supabase
      .from('community_memberships')
      .select('*')
      .eq('community_id', message.community_id)
      .eq('user_id', recipientUserId)
      .maybeSingle();

    if (error || !membership) {
      throw new Error(
        `User ${recipientUserId} is not a member of community for message ${messageId}: ${error?.message}`,
      );
    }
  } else {
    throw new Error(
      `Message ${messageId} has neither conversation_id nor community_id`,
    );
  }

  // For now, we just verify that the participant/member exists
  // The old logic was checking for last_received_at which doesn't exist anymore
  // Message delivery is now implicit - if user is a participant/member, they can receive messages
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

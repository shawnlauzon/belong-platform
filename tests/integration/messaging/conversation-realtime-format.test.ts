import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestCommunity,
  createTestUser,
  TEST_PREFIX,
} from '../helpers/test-data';
import { sendMessage } from '@/features/messaging/api';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities/types';
import { joinCommunity } from '@/features/communities/api';
import { createTestConversation, signInAsUser } from './messaging-helpers';
import type {
  RealtimeBroadcastMessage,
  MessagePayload,
  Conversation,
} from '@/features/messaging/types';
import { messagesChannelForConversation } from '@/features/messaging/utils';

describe('Community Message Realtime Format Validation', () => {
  let supabase: SupabaseClient<Database>;
  let otherUserClient: SupabaseClient<Database>;
  let testUser: Account;
  let testCommunity: Community;
  let otherUser: Account;
  let conversation: Conversation;
  let channelForTestUser: RealtimeChannel | null = null;
  let channelForOtherUser: RealtimeChannel | null = null;
  let receivedMessagesForTestUser: RealtimeBroadcastMessage[] = [];
  let receivedMessagesForOtherUser: RealtimeBroadcastMessage[] = [];

  beforeAll(async () => {
    supabase = createTestClient();
    otherUserClient = createTestClient();

    // Create test users and community
    testUser = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create another user and have them join the community
    otherUser = await createTestUser(otherUserClient);
    await joinCommunity(otherUserClient, testCommunity.id);

    await signInAsUser(supabase, testUser);

    conversation = await createTestConversation(supabase, otherUser.id);

    // Set up community message subscription
    const conversationTopic = messagesChannelForConversation(conversation.id);
    channelForTestUser = supabase
      .channel(conversationTopic, {
        config: { private: true },
      })
      .on('broadcast', { event: '*' }, (message: RealtimeBroadcastMessage) => {
        receivedMessagesForTestUser.push(message);
      })
      .subscribe();

    await signInAsUser(otherUserClient, otherUser);
    channelForOtherUser = otherUserClient
      .channel(conversationTopic, {
        config: { private: true },
      })
      .on('broadcast', { event: '*' }, (message: RealtimeBroadcastMessage) => {
        receivedMessagesForOtherUser.push(message);
      })
      .subscribe();

    // Give subscription time to establish
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await channelForTestUser?.unsubscribe();
    await channelForOtherUser?.unsubscribe();
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    receivedMessagesForTestUser = [];
    receivedMessagesForOtherUser = [];
    await signInAsUser(otherUserClient, otherUser);
  });

  it('validates conversation message realtime format', async () => {
    receivedMessagesForTestUser.length = 0;
    receivedMessagesForOtherUser.length = 0;
    // Send a message in the community
    const sentMessage = await sendMessage(otherUserClient, {
      conversationId: conversation.id,
      content: `${TEST_PREFIX} conversation realtime format test`,
    });

    // Wait for real-time update to process
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify we received a message
    expect(receivedMessagesForTestUser).toHaveLength(1);

    const message = receivedMessagesForTestUser[0];

    // Validate complete RealtimeBroadcastMessage structure
    expect(message).toMatchObject({
      type: 'broadcast',
      event: 'message.created',
      payload: {
        sender_id: otherUser.id,
        message_id: sentMessage.id,
        content: `${TEST_PREFIX} conversation realtime format test`,
      },
    });

    // Validate timestamp is recent
    const payload = message.payload as MessagePayload;
    expect(new Date(payload.sent_at).getTime()).toBeLessThanOrEqual(Date.now());
    expect(new Date(payload.sent_at).getTime()).toBeGreaterThan(
      Date.now() - 10000,
    ); // Within last 10 seconds

    expect(receivedMessagesForOtherUser).toHaveLength(0);
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  setupMessagingUsers,
  createTestConversation,
  signInAsUser,
} from './messaging-helpers';
import { sendMessage } from '@/features/messages/api';
import { TEST_PREFIX } from '../helpers/test-data';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users';
import type { Conversation } from '@/features/messages/types';
import { joinCommunity } from '@/features/communities/api';

describe('Realtime Messaging', () => {
  let clientA: SupabaseClient<Database>;
  let clientB: SupabaseClient<Database>;
  let userA: User;
  let userB: User;
  let activeChannels: any[] = [];

  beforeAll(async () => {
    // Create two separate clients
    clientA = createTestClient();
    clientB = createTestClient();

    // Setup users
    const setup = await setupMessagingUsers(clientA);
    userA = setup.userA;
    userB = setup.userB;
  });

  afterEach(async () => {
    // Clean up all channels after each test
    for (const channel of activeChannels) {
      await channel.unsubscribe();
      clientA.removeChannel(channel);
      clientB.removeChannel(channel);
    }
    activeChannels = [];

    // Wait for cleanup to complete
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it('should receive messages via realtime between two clients', async () => {
    const testMessage = `${TEST_PREFIX} realtime test`;
    const testId = `test1-${Date.now()}`;

    // Create a fresh conversation for this test
    const conversation = await createTestConversation(clientA, userB.id);

    // Track received messages
    const messagesReceivedByA: any[] = [];
    const messagesReceivedByB: any[] = [];

    // Subscribe clientB to realtime (simulating second user)
    const channelB = clientB
      .channel(`${testId}-conversation-${conversation.id}-b`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          messagesReceivedByB.push(payload.new);
        },
      )
      .subscribe();

    // Subscribe clientA to realtime (simulating first user)
    const channelA = clientA
      .channel(`${testId}-conversation-${conversation.id}-a`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          messagesReceivedByA.push(payload.new);
        },
      )
      .subscribe();

    // Track channels for cleanup
    activeChannels.push(channelA, channelB);

    // Wait for subscriptions to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Send message from user A
    await sendMessage(clientA, {
      conversationId: conversation.id,
      content: testMessage,
      messageType: 'text',
    });

    // Wait for realtime to propagate
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify B received the message via realtime
    expect(messagesReceivedByB).toHaveLength(1);
    expect(messagesReceivedByB[0].content).toBe(testMessage);
    expect(messagesReceivedByB[0].sender_id).toBe(userA.id);
  });

  it('should handle bidirectional realtime messaging', async () => {
    const messageFromA = `${TEST_PREFIX} from A`;
    const messageFromB = `${TEST_PREFIX} from B`;
    const testId = `test2-${Date.now()}`;

    // Create a fresh conversation for this test
    const conversation = await createTestConversation(clientA, userB.id);

    // Track received messages
    const messagesReceivedByA: any[] = [];
    const messagesReceivedByB: any[] = [];

    // Subscribe both clients to realtime
    const channelB = clientB
      .channel(`${testId}-bidirectional-${conversation.id}-b`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          messagesReceivedByB.push(payload.new);
        },
      )
      .subscribe();

    const channelA = clientA
      .channel(`${testId}-bidirectional-${conversation.id}-a`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          messagesReceivedByA.push(payload.new);
        },
      )
      .subscribe();

    // Track channels for cleanup
    activeChannels.push(channelA, channelB);

    // Wait for subscriptions to be ready
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Send from A
    await sendMessage(clientA, {
      conversationId: conversation.id,
      content: messageFromA,
      messageType: 'text',
    });

    // Wait for realtime
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Both should see A's message
    expect(messagesReceivedByB).toHaveLength(1);
    expect(messagesReceivedByB[0].content).toBe(messageFromA);

    // Send from B
    await sendMessage(clientB, {
      conversationId: conversation.id,
      content: messageFromB,
      messageType: 'text',
    });

    // Wait for realtime
    await new Promise((resolve) => setTimeout(resolve, 500));

    // A should see both messages (their own + B's), B should see both messages
    expect(messagesReceivedByA).toHaveLength(2);
    expect(messagesReceivedByA[0].content).toBe(messageFromA); // A's own message
    expect(messagesReceivedByA[1].content).toBe(messageFromB); // B's message
    expect(messagesReceivedByB).toHaveLength(2);
    expect(messagesReceivedByB[0].content).toBe(messageFromA); // A's message
    expect(messagesReceivedByB[1].content).toBe(messageFromB); // B's own message
  });
});

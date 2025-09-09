import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createTestConversation, signInAsUser } from './messaging-helpers';
import { sendMessage } from '@/features/messages/api';
import {
  createTestCommunity,
  createTestUser,
  TEST_PREFIX,
} from '../helpers/test-data';
import {
  createMessageSubscription,
  MessageSubscriptionResult,
} from '@/features/messages/api/createMessageSubscription';
import { conversationKeys, messageKeys } from '@/features/messages/queries';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities/types';
import { joinCommunity } from '@/features/communities/api';
import { Message } from '@/features';
import { vi } from 'vitest';

describe('Message Subscription API Tests', () => {
  let supabase: SupabaseClient<Database>;
  let otherUserClient: SupabaseClient<Database>;
  let queryClient: QueryClient;
  let testUser: Account;
  let testOtherUser: Account;
  let testCommunity: Community;
  let subscriptions: MessageSubscriptionResult;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test users and community
    testUser = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // otherUserClient = createTestClient();
    // // Create another user and have them join the community
    // testOtherUser = await createTestUser(otherUserClient);
    // await joinCommunity(otherUserClient, testCommunity.id);

    // Create another user and have them join the community
    testOtherUser = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);

    await signInAsUser(supabase, testUser);

    // Create query client once
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Give subscription time to establish
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // subscriptions?.cleanup();
    // await cleanupAllTestData();
  });

  it('should be notified of new conversations', async () => {
    // Create conversation and send message from other user
    const conversation = await createTestConversation(
      supabase,
      testOtherUser.id,
    );
    // const testMessage = `${TEST_PREFIX} subscription test`;

    // const newMessage = await sendMessage(supabase, {
    //   conversationId: conversation.id,
    //   content: testMessage,
    // });
    // expect(newMessage).toMatchObject({
    //   id: expect.any(String),
    //   content: testMessage,
    //   conversationId: conversation.id,
    // });

    // Wait for real-time update to process
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check if message was added to React Query cache
    const conversations = queryClient.getQueryData(
      conversationKeys.list({ conversationType: 'direct' }),
    );

    expect(conversations).toContainEqual(
      expect.objectContaining({
        id: conversation.id,
        conversationType: 'direct',
      }),
    );
  });

  it.only('should be notified of new messages', async () => {
    // Create conversation and send message from other user
    const conversation = await createTestConversation(
      supabase,
      testOtherUser.id,
    );

    await createMessageSubscription({
      supabase,
      queryClient,
      conversationId: conversation.id,
    });

    const testMessage = `${TEST_PREFIX} subscription test`;

    const newMessage = await sendMessage(supabase, {
      conversationId: conversation.id,
      content: testMessage,
    });
    expect(newMessage).toMatchObject({
      id: expect.any(String),
      content: testMessage,
      conversationId: conversation.id,
    });

    // Wait for real-time update to process
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check if message was added to React Query cache
    const messages = queryClient.getQueryData(
      messageKeys.list(conversation.id),
    );

    expect(messages).toContainEqual(
      expect.objectContaining({
        id: conversation.id,
        conversationType: 'direct',
      }),
    );
  });

  it('should update messages cache', async () => {
    const conversation = await createTestConversation(
      supabase,
      testOtherUser.id,
    );

    const testMessage = `${TEST_PREFIX} conversation cache test`;
    const newMessage = await sendMessage(supabase, {
      conversationId: conversation.id,
      content: testMessage,
    });

    // Wait for real-time update
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check conversation cache was updated
    const messagesData = queryClient.getQueryData<Message[]>(
      messageKeys.list(conversation.id),
    );
    expect(messagesData).toHaveLength(1);
    expect(messagesData?.[0]).toMatchObject({
      id: newMessage.id,
      conversation_id: conversation.id,
      content: testMessage,
    });
  });

  it('should invalidate unread counts query when new messages arrive', async () => {
    const conversation = await createTestConversation(
      otherUserClient,
      testUser.id,
    );

    await sendMessage(otherUserClient, {
      conversationId: conversation.id,
      content: `${TEST_PREFIX} unread counts test`,
    });

    // Wait for real-time update
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check if unread counts query was invalidated
    const unreadCountsState = queryClient.getQueryState(['unreadCounts']);
    expect(unreadCountsState?.isInvalidated).toBe(true);
  });

  it('should handle multiple rapid messages without losing data', async () => {
    const conversation = await createTestConversation(
      otherUserClient,
      testUser.id,
    );

    // Send multiple messages rapidly
    await Promise.all([
      sendMessage(otherUserClient, {
        conversationId: conversation.id,
        content: `${TEST_PREFIX} rapid 1`,
      }),
      sendMessage(otherUserClient, {
        conversationId: conversation.id,
        content: `${TEST_PREFIX} rapid 2`,
      }),
      sendMessage(otherUserClient, {
        conversationId: conversation.id,
        content: `${TEST_PREFIX} rapid 3`,
      }),
    ]);

    // Wait for all updates to process
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check that cache was updated
    const messagesData = queryClient.getQueryData(
      messageKeys.list(conversation.id),
    );
    expect(messagesData).toBeDefined();
  });
});

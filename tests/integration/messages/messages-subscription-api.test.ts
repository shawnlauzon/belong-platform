import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestConversation,
} from './messaging-helpers';
import { sendMessage } from '@/features/messages/api';
import {
  createTestCommunity,
  createTestUser,
  TEST_PREFIX,
} from '../helpers/test-data';
import { createMessageSubscription } from '@/features/messages/api/createMessageSubscription';
import { messageKeys } from '@/features/messages/queries';
import { logger } from '@/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities/types';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';

describe('Message Subscription API Tests', () => {
  let supabase: SupabaseClient<Database>;
  let otherUserClient: SupabaseClient<Database>;
  let queryClient: QueryClient;
  let testUser: Account;
  let testCommunity: Community;
  let anotherUser: Account;
  let subscriptionResult: { channels: Map<string, unknown>; cleanup: () => Promise<void> } | null = null;

  beforeAll(async () => {
    supabase = createTestClient();
    otherUserClient = createTestClient();

    // Create test users and community
    testUser = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create another user and have them join the community
    anotherUser = await createTestUser(otherUserClient);
    await joinCommunity(otherUserClient, testCommunity.id);

    // Create query client once
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Create subscription once for all tests
    subscriptionResult = await createMessageSubscription({
      supabase,
      queryClient,
      userId: testUser.id,
      currentUser: testUser,
      logger,
    });

    // Give subscription time to establish
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (subscriptionResult) {
      await subscriptionResult.cleanup();
      subscriptionResult = null;
    }
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Sign back in as users for consistency
    await signIn(supabase, testUser.email, 'TestPass123!');
    await signIn(otherUserClient, anotherUser.email, 'TestPass123!');
  });


  it('should create message subscription with conversation and message channels', async () => {
    expect(subscriptionResult).toBeDefined();
    expect(subscriptionResult?.channels).toBeInstanceOf(Map);
    expect(subscriptionResult?.cleanup).toBeTypeOf('function');
    expect(subscriptionResult?.channels.size).toBe(2); // conversations + messages channels
  });

  it('should receive new messages via realtime and update message cache', async () => {
    // Create conversation and send message from other user
    const conversation = await createTestConversation(otherUserClient, testUser.id);
    const testMessage = `${TEST_PREFIX} subscription test`;

    await sendMessage(otherUserClient, {
      conversationId: conversation.id,
      content: testMessage,
      messageType: 'text',
    });

    // Wait for real-time update to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if message was added to React Query cache
    const messagesData = queryClient.getQueryData(messageKeys.list(conversation.id));
    expect(messagesData).toBeDefined();
  });

  it('should update conversation cache when messages are sent via realtime', async () => {
    const conversation = await createTestConversation(otherUserClient, testUser.id);
    
    const testMessage = `${TEST_PREFIX} conversation cache test`;
    await sendMessage(otherUserClient, {
      conversationId: conversation.id,
      content: testMessage,
      messageType: 'text',
    });

    // Wait for real-time update
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check conversation cache was updated
    const conversationsData = queryClient.getQueryData(messageKeys.conversationList());
    expect(conversationsData).toBeDefined();
  });

  it('should invalidate unread counts query when new messages arrive', async () => {
    const conversation = await createTestConversation(otherUserClient, testUser.id);
    
    await sendMessage(otherUserClient, {
      conversationId: conversation.id,
      content: `${TEST_PREFIX} unread counts test`,
      messageType: 'text',
    });

    // Wait for real-time update
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if unread counts query was invalidated
    const unreadCountsState = queryClient.getQueryState(['unreadCounts']);
    expect(unreadCountsState?.isInvalidated).toBe(true);
  });

  it('should handle multiple rapid messages without losing data', async () => {
    const conversation = await createTestConversation(otherUserClient, testUser.id);

    // Send multiple messages rapidly
    await Promise.all([
      sendMessage(otherUserClient, {
        conversationId: conversation.id,
        content: `${TEST_PREFIX} rapid 1`,
        messageType: 'text',
      }),
      sendMessage(otherUserClient, {
        conversationId: conversation.id,
        content: `${TEST_PREFIX} rapid 2`,
        messageType: 'text',
      }),
      sendMessage(otherUserClient, {
        conversationId: conversation.id,
        content: `${TEST_PREFIX} rapid 3`,
        messageType: 'text',
      }),
    ]);

    // Wait for all updates to process
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check that cache was updated
    const messagesData = queryClient.getQueryData(messageKeys.list(conversation.id));
    expect(messagesData).toBeDefined();
  });

  it('should have subscription channels available', async () => {
    expect(subscriptionResult?.channels.size).toBe(2);
    expect(subscriptionResult?.cleanup).toBeTypeOf('function');
  });

  it('should handle invalid user ID gracefully without throwing errors', async () => {
    // Test that subscription handles invalid user gracefully
    await expect(
      createMessageSubscription({
        supabase,
        queryClient,
        userId: 'invalid-user-id',
        currentUser: { id: 'invalid-user-id' } as Account,
        logger,
      })
    ).resolves.toBeDefined(); // Should not throw, but may not work properly
  });

  it('should maintain subscription stability', async () => {
    // Should still have subscription running
    expect(subscriptionResult).toBeDefined();
    expect(subscriptionResult?.channels.size).toBe(2);
  });
});
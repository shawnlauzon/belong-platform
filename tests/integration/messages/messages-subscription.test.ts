import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createTestConversation } from './messaging-helpers';
import {
  deleteMessage,
  editMessage,
  sendMessage,
} from '@/features/messages/api';
import {
  createTestCommunity,
  createTestUser,
  TEST_PREFIX,
} from '../helpers/test-data';
import { createMessageSubscription } from '@/features/messages/api/createMessageSubscription';
import { messageKeys } from '@/features/messages/queries';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities/types';
import { joinCommunity } from '@/features/communities/api';
import type { Conversation } from '@/features/messages/types';
import { vi } from 'vitest';

describe('Message Subscription Tests', () => {
  let supabase: SupabaseClient<Database>;
  let otherUserClient: SupabaseClient<Database>;
  let queryClient: QueryClient;
  let testCommunity: Community;
  let testConversation: Conversation;
  let anotherUser: Account;
  let messagesChannel: RealtimeChannel;

  beforeAll(async () => {
    supabase = createTestClient();
    otherUserClient = createTestClient();

    // Create test users and community
    await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create another user and have them join the community
    anotherUser = await createTestUser(otherUserClient);
    await joinCommunity(otherUserClient, testCommunity.id);

    testConversation = await createTestConversation(supabase, anotherUser.id);

    // Create mock QueryClient
    queryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
      setQueryData: vi.fn().mockResolvedValue(undefined),
      getQueryData: vi.fn().mockReturnValue(0),
      getQueryState: vi.fn().mockReturnValue({ isInvalidated: true }),
    } as unknown as QueryClient;

    // Create subscription once for all tests
    messagesChannel = await createMessageSubscription({
      supabase,
      queryClient,
      conversationId: testConversation.id,
    });

    // Give subscription time to establish
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await messagesChannel?.unsubscribe();
    await cleanupAllTestData();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a messages channel', async () => {
    expect(messagesChannel).toBeDefined();
  });

  it('should add the new message to the cache after receiving a message', async () => {
    const testMessage = `${TEST_PREFIX} subscription test`;

    // Other user sends a message to me
    await sendMessage(otherUserClient, {
      conversationId: testConversation.id,
      content: testMessage,
    });

    // Wait for real-time update to process
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(queryClient.setQueryData).toHaveBeenCalledTimes(2);
    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      messageKeys.list(testConversation.id),
      expect.any(Function),
    );
  });

  it('should increment the unread count when new messages arrive', async () => {
    await sendMessage(otherUserClient, {
      conversationId: testConversation.id,
      content: `${TEST_PREFIX} unread counts test`,
    });

    // Wait for real-time update
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(queryClient.setQueryData).toHaveBeenCalledTimes(2);
    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      messageKeys.unreadCount(testConversation.id),
      expect.any(Function),
    );
  });

  it('should update the messages query cache after editing a message', async () => {
    const message = await sendMessage(otherUserClient, {
      conversationId: testConversation.id,
      content: `${TEST_PREFIX} subscription test`,
    });

    await editMessage(otherUserClient, {
      messageId: message.id,
      content: `${TEST_PREFIX} edited`,
    });

    // Wait for real-time update to process
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(queryClient.setQueryData).toHaveBeenCalledTimes(3);
    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      messageKeys.list(testConversation.id),
      expect.any(Function),
    );
  });

  it('should update the messages query cache after deleting a message', async () => {
    const message = await sendMessage(otherUserClient, {
      conversationId: testConversation.id,
      content: `${TEST_PREFIX} subscription test`,
    });

    await deleteMessage(otherUserClient, message.id);

    // Wait for real-time update to process
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(queryClient.setQueryData).toHaveBeenCalledTimes(3);
    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      messageKeys.list(testConversation.id),
      expect.any(Function),
    );
  });
});

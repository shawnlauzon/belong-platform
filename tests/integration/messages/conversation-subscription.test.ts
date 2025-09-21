import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createTestConversation, signInAsUser } from './messaging-helpers';
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
import { conversationKeys } from '@/features/messages/queries';
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
  let otherQueryClient: QueryClient;
  let testCommunity: Community;
  let testConversation: Conversation;
  let testUser: Account;
  let otherUser: Account;
  let testUserChannel: RealtimeChannel;
  let otherUserChannel: RealtimeChannel;

  beforeAll(async () => {
    supabase = createTestClient();
    otherUserClient = createTestClient();

    // Create test users and community
    testUser = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create another user and have them join the community
    otherUser = await createTestUser(otherUserClient);
    await joinCommunity(otherUserClient, testCommunity.id);

    testConversation = await createTestConversation(supabase, otherUser.id);

    // Create mock QueryClient
    queryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
      setQueryData: vi.fn().mockResolvedValue(undefined),
      getQueryData: vi.fn().mockReturnValue(0),
      getQueryState: vi.fn().mockReturnValue({ isInvalidated: true }),
    } as unknown as QueryClient;

    await signInAsUser(otherUserClient, testUser);

    // Subscription for the channel user:testUser.id:messages
    testUserChannel = await createMessageSubscription({
      supabase,
      queryClient,
      conversationId: testConversation.id,
    });

    await signInAsUser(otherUserClient, otherUser);
    otherQueryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
      setQueryData: vi.fn().mockResolvedValue(undefined),
      getQueryData: vi.fn().mockReturnValue(0),
      getQueryState: vi.fn().mockReturnValue({ isInvalidated: true }),
    } as unknown as QueryClient;
    otherUserChannel = await createMessageSubscription({
      supabase: otherUserClient,
      queryClient: otherQueryClient,
      conversationId: testConversation.id,
    });

    // Give subscription time to establish
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await testUserChannel?.unsubscribe();
    await otherUserChannel?.unsubscribe();
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await signInAsUser(otherUserClient, testUser);
  });

  it('should create a messages channel', async () => {
    expect(testUserChannel).toBeDefined();
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

    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      conversationKeys.messages(testConversation.id),
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

    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      conversationKeys.unreadCount(testConversation.id),
      expect.any(Function),
    );

    expect(otherQueryClient.setQueryData).not.toHaveBeenCalled();
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

    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      conversationKeys.messages(testConversation.id),
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

    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      conversationKeys.messages(testConversation.id),
      expect.any(Function),
    );
  });
});

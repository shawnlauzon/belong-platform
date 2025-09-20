import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createTestConversation } from './messaging-helpers';
import { createTestCommunity, createTestUser } from '../helpers/test-data';
import { conversationKeys } from '@/features/messages/queries';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities/types';
import { joinCommunity } from '@/features/communities/api';
import { vi } from 'vitest';
import { createNotificationSubscription } from '@/features/notifications/api';

describe('Conversation Subscription Tests', () => {
  let supabase: SupabaseClient<Database>;
  let otherUserClient: SupabaseClient<Database>;
  let queryClient: QueryClient;
  let testUser: Account;
  let testCommunity: Community;
  let anotherUser: Account;
  let notificationChannel: RealtimeChannel;

  beforeAll(async () => {
    supabase = createTestClient();
    otherUserClient = createTestClient();

    // Create test users and community
    testUser = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create another user and have them join the community
    anotherUser = await createTestUser(otherUserClient);
    await joinCommunity(otherUserClient, testCommunity.id);

    // Create mock QueryClient
    queryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
      setQueryData: vi.fn().mockResolvedValue(undefined),
      getQueryData: vi.fn().mockReturnValue(0),
      getQueryState: vi.fn().mockReturnValue({ isInvalidated: true }),
    } as unknown as QueryClient;

    // Create subscription once for all tests
    notificationChannel = await createNotificationSubscription({
      supabase,
      queryClient,
      userId: testUser.id,
    });

    // Give subscription time to establish
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await notificationChannel?.unsubscribe();
    await cleanupAllTestData();
  });

  it('should be notified of new conversations', async () => {
    // Another user creates a conversation with me
    await createTestConversation(otherUserClient, testUser.id);

    // Wait for real-time update to process
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      conversationKeys.directConversations(),
      expect.any(Function),
    );
  });
});

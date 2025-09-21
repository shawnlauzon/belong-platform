import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestCommunity,
  createTestUser,
  createTestResource,
  TEST_PREFIX,
} from '../helpers/test-data';
import { createNotificationSubscription } from '@/features/notifications/api/createNotificationSubscription';
import { notificationKeys } from '@/features/notifications/queries';
import { NOTIFICATION_TYPES } from '@/features/notifications/constants';
import { createShoutout } from '@/features/shoutouts/api';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities/types';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import { signInAsUser } from '../messages/messaging-helpers';
import { vi } from 'vitest';
import { shoutoutKeys } from '@/features/shoutouts/queries';

describe('Notification Subscription API Tests', () => {
  let supabase: SupabaseClient<Database>;
  let otherUserClient: SupabaseClient<Database>;
  let queryClient: QueryClient;
  let testUser: Account;
  let testCommunity: Community;
  let anotherUser: Account;
  let notificationChannel: RealtimeChannel | null = null;

  beforeAll(async () => {
    supabase = createTestClient();
    otherUserClient = createTestClient();

    // Create test users and community
    testUser = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create another user and have them join the community
    anotherUser = await createTestUser(otherUserClient);
    await joinCommunity(otherUserClient, testCommunity.id);

    await signInAsUser(supabase, testUser);

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

  beforeEach(async () => {
    vi.clearAllMocks();
    await signIn(supabase, testUser.email, 'TestPass123!');
  });

  it('should create a notification subscription', async () => {
    expect(notificationChannel).toBeDefined();
  });

  it('should invalidate cache entries', async () => {
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    // Switch to anotherUser and create a shoutout (triggers notification)
    await signIn(otherUserClient, anotherUser.email, 'TestPass123!');
    await createShoutout(otherUserClient, {
      receiverId: testUser.id,
      message: `${TEST_PREFIX} subscription notification test`,
      resourceId: resource.id,
      communityId: testCommunity.id,
    });

    await signIn(supabase, testUser.email, 'TestPass123!');

    // Wait for real-time update to process
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check if notification was added to React Query cache and notification was added to cache
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: shoutoutKeys.all,
    });
  });

  it('should update notification list when new notifications arrive', async () => {
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    await signIn(otherUserClient, anotherUser.email, 'TestPass123!');
    await createShoutout(otherUserClient, {
      receiverId: testUser.id,
      message: `${TEST_PREFIX} count invalidation test`,
      resourceId: resource.id,
      communityId: testCommunity.id,
    });

    await signIn(supabase, testUser.email, 'TestPass123!');

    // Wait for real-time update
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      notificationKeys.list(),
      expect.any(Function),
    );
  });

  it('should update unread counts query when new notifications arrive', async () => {
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    await signIn(otherUserClient, anotherUser.email, 'TestPass123!');
    await createShoutout(otherUserClient, {
      receiverId: testUser.id,
      message: `${TEST_PREFIX} count invalidation test`,
      resourceId: resource.id,
      communityId: testCommunity.id,
    });

    await signIn(supabase, testUser.email, 'TestPass123!');

    // Wait for real-time update
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      notificationKeys.unreadCount(),
      expect.any(Function),
    );
  });
});

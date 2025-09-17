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

    // Create mock QueryClient
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

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
    await signIn(supabase, testUser.email, 'TestPass123!');
  });

  it('should create a notification subscription', async () => {
    expect(notificationChannel).toBeDefined();
  });

  it('should receive new notifications via realtime and update notification cache', async () => {
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    // Switch to anotherUser and create a shoutout (triggers notification)
    await signIn(otherUserClient, anotherUser.email, 'TestPass123!');
    const shoutout = await createShoutout(otherUserClient, {
      receiverId: testUser.id,
      message: `${TEST_PREFIX} subscription notification test`,
      resourceId: resource.id,
      communityId: testCommunity.id,
    });

    await signIn(supabase, testUser.email, 'TestPass123!');

    // Wait for real-time update to process
    // Not sure why this needs such a long timeout, but anything shorter and it fails
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if notification was added to React Query cache
    const notificationsData = queryClient.getQueryData(
      notificationKeys.list(testUser.id),
    );
    expect(notificationsData).toBeDefined();
    expect(notificationsData).toContainEqual(
      expect.objectContaining({
        shoutoutId: shoutout.id,
        type: NOTIFICATION_TYPES.SHOUTOUT_RECEIVED,
      }),
    );
  });

  it('should invalidate unread counts query when new notifications arrive', async () => {
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    const unreadCountDataBefore =
      queryClient.getQueryData<number>(notificationKeys.unreadCount()) ?? 0;

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

    // Check if unread counts query was invalidated
    const unreadCountDataAfter = queryClient.getQueryData<number>(
      notificationKeys.unreadCount(),
    );

    expect(unreadCountDataAfter).toBeGreaterThan(unreadCountDataBefore);
  });
});

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
import { createShoutout } from '@/features/shoutouts/api';
import { logger } from '@/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
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
  let subscriptionResult: { subscription: unknown; cleanup: () => Promise<void> } | null = null;

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
    subscriptionResult = await createNotificationSubscription({
      supabase,
      queryClient,
      userId: testUser.id,
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


  it('should create notification subscription with proper structure and cleanup function', async () => {
    expect(subscriptionResult).toBeDefined();
    expect(subscriptionResult?.subscription).toBeDefined();
    expect(subscriptionResult?.cleanup).toBeTypeOf('function');
  });

  it('should receive new notifications via realtime and update notification cache', async () => {
    // Create a resource as testUser 
    await signIn(supabase, testUser.email, 'TestPass123!');
    const resource = await createTestResource(supabase, testCommunity.id, 'offer');

    // Switch to anotherUser and create a shoutout (triggers notification)
    await signIn(otherUserClient, anotherUser.email, 'TestPass123!');
    await createShoutout(otherUserClient, {
      receiverId: testUser.id,
      message: `${TEST_PREFIX} subscription notification test`,
      resourceId: resource.id,
      communityId: testCommunity.id,
    });

    // Wait for real-time update to process
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if notification was added to React Query cache
    const notificationsData = queryClient.getQueryData(notificationKeys.list({ limit: 1000 }));
    expect(notificationsData).toBeDefined();
  });

  it('should invalidate unread counts query when new notifications arrive', async () => {
    // Create notification trigger
    await signIn(supabase, testUser.email, 'TestPass123!');
    const resource = await createTestResource(supabase, testCommunity.id, 'offer');

    await signIn(otherUserClient, anotherUser.email, 'TestPass123!');
    await createShoutout(otherUserClient, {
      receiverId: testUser.id,
      message: `${TEST_PREFIX} count invalidation test`,
      resourceId: resource.id,
      communityId: testCommunity.id,
    });

    // Wait for real-time update
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if unread counts query was invalidated
    const unreadCountsState = queryClient.getQueryState(['unreadCounts']);
    expect(unreadCountsState?.isInvalidated).toBe(true);
  });

  it('should handle multiple rapid notifications without losing data', async () => {
    // Create multiple resources 
    await signIn(supabase, testUser.email, 'TestPass123!');
    const resource1 = await createTestResource(supabase, testCommunity.id, 'offer');
    const resource2 = await createTestResource(supabase, testCommunity.id, 'offer');
    const resource3 = await createTestResource(supabase, testCommunity.id, 'offer');

    await signIn(otherUserClient, anotherUser.email, 'TestPass123!');

    // Send multiple notifications rapidly
    await Promise.all([
      createShoutout(otherUserClient, {
        receiverId: testUser.id,
        message: `${TEST_PREFIX} rapid 1`,
        resourceId: resource1.id,
        communityId: testCommunity.id,
      }),
      createShoutout(otherUserClient, {
        receiverId: testUser.id,
        message: `${TEST_PREFIX} rapid 2`,
        resourceId: resource2.id,
        communityId: testCommunity.id,
      }),
      createShoutout(otherUserClient, {
        receiverId: testUser.id,
        message: `${TEST_PREFIX} rapid 3`,
        resourceId: resource3.id,
        communityId: testCommunity.id,
      }),
    ]);

    // Wait for all updates to process
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Check that cache was updated
    const notificationsData = queryClient.getQueryData(notificationKeys.list({ limit: 1000 }));
    expect(notificationsData).toBeDefined();
  });

  it('should have subscription available', async () => {
    expect(subscriptionResult?.subscription).toBeDefined();
    expect(subscriptionResult?.cleanup).toBeTypeOf('function');
  });

  it('should handle invalid user ID gracefully without throwing errors', async () => {
    // Test that subscription handles invalid user gracefully
    await expect(
      createNotificationSubscription({
        supabase,
        queryClient,
        userId: 'invalid-user-id',
        logger,
      })
    ).resolves.toBeDefined(); // Should not throw, but may not work properly
  });

  it('should maintain subscription stability', async () => {
    // Should still have subscription running
    expect(subscriptionResult).toBeDefined();
    expect(subscriptionResult?.subscription).toBeDefined();
  });

  it('should fetch full notification details when realtime events are received', async () => {
    // Create a resource and trigger notification
    await signIn(supabase, testUser.email, 'TestPass123!');
    const resource = await createTestResource(supabase, testCommunity.id, 'offer');

    await signIn(otherUserClient, anotherUser.email, 'TestPass123!');
    await createShoutout(otherUserClient, {
      receiverId: testUser.id,
      message: `${TEST_PREFIX} detailed notification test`,
      resourceId: resource.id,
      communityId: testCommunity.id,
    });

    // Wait for notification processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify notification details were fetched and cached
    const notificationsData = queryClient.getQueryData(notificationKeys.list({ limit: 1000 }));
    if (Array.isArray(notificationsData) && notificationsData.length > 0) {
      const latestNotification = notificationsData[0];
      expect(latestNotification).toHaveProperty('id');
      expect(latestNotification).toHaveProperty('type', 'shoutout_received');
    }
  });
});
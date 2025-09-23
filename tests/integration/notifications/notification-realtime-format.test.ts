import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestCommunity,
  createTestUser,
  createTestResource,
  TEST_PREFIX,
} from '../helpers/test-data';
import { createShoutout } from '@/features/shoutouts/api';
import type {
  SupabaseClient,
  RealtimeChannel,
  REALTIME_SUBSCRIBE_STATES,
} from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities/types';
import { joinCommunity } from '@/features/communities/api';
import { signInAsUser } from '../messages/messaging-helpers';
import { NotificationDetailsRow } from '@/features/notifications/types/notificationDetailsRow';
import { NotificationType } from '@/features';

describe('Notification Realtime Format Validation', () => {
  let supabase: SupabaseClient<Database>;
  let otherUserClient: SupabaseClient<Database>;
  let testUser: Account;
  let testCommunity: Community;
  let anotherUser: Account;
  let notificationChannel: RealtimeChannel | null = null;
  const receivedNotifications: Array<{
    event: NotificationType;
    payload: NotificationDetailsRow;
  }> = [];

  beforeAll(async () => {
    supabase = createTestClient();
    otherUserClient = createTestClient();

    // Create test users and community
    testUser = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Set up notification subscription once
    await supabase.realtime.setAuth();
    notificationChannel = supabase
      .channel(`user:${testUser.id}:notifications`, {
        config: { private: true },
      })
      .on(
        'broadcast',
        { event: '*' },
        (message: { event: string; payload: NotificationDetailsRow }) => {
          console.log('Received notification:', message);
          receivedNotifications.push({
            event: message.event as NotificationType,
            payload: message.payload,
          });
        },
      )
      .subscribe((status: REALTIME_SUBSCRIBE_STATES, err?: Error) => {
        console.log('Notification subscription status:', status);
        if (err) {
          throw err;
        }
      });

    // Give subscription time to establish
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create another user and have them join the community
    anotherUser = await createTestUser(otherUserClient);
    await joinCommunity(otherUserClient, testCommunity.id);
  });

  afterAll(async () => {
    await notificationChannel?.unsubscribe();
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    receivedNotifications.length = 0;
    await signInAsUser(otherUserClient, anotherUser);
  });

  it('validates shoutout notification realtime format', async () => {
    await signInAsUser(supabase, testUser);
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    receivedNotifications.length = 0;

    // Switch to anotherUser and create a shoutout (triggers notification)
    await signInAsUser(otherUserClient, anotherUser);
    const shoutout = await createShoutout(otherUserClient, {
      receiverId: testUser.id,
      message: `${TEST_PREFIX} realtime format test`,
      resourceId: resource.id,
      communityId: testCommunity.id,
    });

    // Wait for real-time update to process
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify we received notifications (one for the shoutout and one for trust points)
    expect(receivedNotifications).toHaveLength(2);

    const notification = receivedNotifications.find(
      (n) => n.event === 'shoutout.created',
    );
    if (!notification) {
      throw new Error('Notification not found');
    }

    // Validate complete payload structure
    expect(notification.payload).toMatchObject({
      id: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      ),
      user_id: testUser.id,
      actor_id: anotherUser.id,
      shoutout_id: shoutout.id,
      shoutout_message: `${TEST_PREFIX} realtime format test`,
    });
  });

  it('validates trustpoints.gained notification realtime format', async () => {
    await signInAsUser(supabase, testUser);
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    receivedNotifications.length = 0;

    // Switch to anotherUser and create a shoutout (triggers notification)
    await signInAsUser(otherUserClient, anotherUser);
    const shoutout = await createShoutout(otherUserClient, {
      receiverId: testUser.id,
      message: `${TEST_PREFIX} realtime format test`,
      resourceId: resource.id,
      communityId: testCommunity.id,
    });

    // Wait for real-time update to process
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify we received notifications (one for the shoutout and one for trust points)
    expect(receivedNotifications).toHaveLength(2);

    const notification = receivedNotifications.find(
      (n) => n.event === 'trustpoints.gained',
    );
    if (!notification) {
      throw new Error('Notification not found');
    }

    // Validate complete payload structure
    expect(notification.payload).toMatchObject({
      metadata: {
        amount: 100,
      },
    });
  });
});

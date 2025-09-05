import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
} from '../helpers/test-data';
import {
  fetchNotifications,
} from '@/features/notifications';
import {
  joinCommunity,
} from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';
import type { Notification } from '@/features/notifications';

describe('Community Activity Notifications', () => {
  let clientA: SupabaseClient<Database>;
  let clientB: SupabaseClient<Database>;
  let communityMember: Account;
  let testCommunity: Community;
  let resourceCreator: Account;
  
  // Real-time testing
  let notificationChannel: RealtimeChannel;
  let notificationsReceived: Notification[] = [];

  beforeAll(async () => {
    // Create two separate clients for better realtime isolation
    clientA = createTestClient();
    clientB = createTestClient();

    // Create test users and community
    communityMember = await createTestUser(clientA);
    testCommunity = await createTestCommunity(clientA);

    // Create resource creator user
    resourceCreator = await createTestUser(clientB);
    await joinCommunity(clientB, testCommunity.id);

    // Set up single persistent channel for INSERT events on clientA
    notificationChannel = clientA
      .channel(`user:${communityMember.id}:notifications`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${communityMember.id}`,
        },
        (payload) => {
          notificationsReceived.push(payload.new as Notification);
        },
      )
      .subscribe();

    // Wait for channel to be established
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (notificationChannel) {
      await notificationChannel.unsubscribe();
      clientA.removeChannel(notificationChannel);
    }
    await cleanupAllTestData(clientA);
  });

  beforeEach(async () => {
    // Sign in as community member for consistency
    await signIn(clientA, communityMember.email, 'TestPass123!');
  });

  describe('Community resource notifications', () => {
    it('should create new_resource notification when someone adds a resource to my community', async () => {
      // Have resource creator add a resource to the community using clientB
      await signIn(clientB, resourceCreator.email, 'TestPass123!');
      const resource = await createTestResource(
        clientB,
        testCommunity.id,
        'offer',
      );

      // Switch back to community member to check notifications
      await signIn(clientA, communityMember.email, 'TestPass123!');

      const result = await fetchNotifications(clientA, {
        type: 'new_resource',
        limit: 10,
      });

      expect(result.notifications.length).toBeGreaterThan(0);
      const resourceNotification = result.notifications.find(n => n.resourceId === resource.id);
      expect(resourceNotification).toBeDefined();
      expect(resourceNotification).toMatchObject({
        type: 'new_resource',
        resourceId: resource.id,
        communityId: testCommunity.id,
        actorId: resourceCreator.id,
        isRead: false,
      });
    });

    it('should receive real-time new_resource notification when someone adds a resource to my community', async () => {
      // Have resource creator add a resource using clientB to trigger realtime
      await signIn(clientB, resourceCreator.email, 'TestPass123!');
      const resource = await createTestResource(
        clientB,
        testCommunity.id,
        'offer',
      );

      // Wait for realtime to propagate
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify notification was received via persistent channel
      const resourceNotifications = notificationsReceived.filter(n => 
        n.type === 'new_resource' && n.resource_id === resource.id
      );
      expect(resourceNotifications.length).toBeGreaterThan(0);
      expect(resourceNotifications[0]).toMatchObject({
        type: 'new_resource',
        resource_id: resource.id,
        community_id: testCommunity.id,
        actor_id: resourceCreator.id,
        is_read: false,
      });
    });

    it('should create new_event notification when someone adds an event to my community', async () => {
      // Have resource creator add an event to the community using clientB
      await signIn(clientB, resourceCreator.email, 'TestPass123!');
      const event = await createTestResource(
        clientB,
        testCommunity.id,
        'event',
      );

      // Switch back to community member to check notifications
      await signIn(clientA, communityMember.email, 'TestPass123!');

      const result2 = await fetchNotifications(clientA, {
        type: 'new_event',
        limit: 10,
      });

      expect(result2.notifications.length).toBeGreaterThan(0);
      const eventNotification = result2.notifications.find(n => n.resourceId === event.id);
      expect(eventNotification).toBeDefined();
      expect(eventNotification).toMatchObject({
        type: 'new_event',
        resourceId: event.id,
        communityId: testCommunity.id,
        actorId: resourceCreator.id,
        isRead: false,
      });
    });

    it('should not notify myself when I create a resource in my own community', async () => {
      const initialNotifications = await fetchNotifications(clientA, {
        type: 'new_resource',
      });

      // Create a resource as the community member (should not notify self)
      const resource = await createTestResource(
        clientA,
        testCommunity.id,
        'offer',
      );

      const result3 = await fetchNotifications(clientA, {
        type: 'new_resource',
      });

      // Should not have new notifications for own resource
      const ownResourceNotifications = result3.notifications.filter(n => 
        n.resourceId === resource.id && n.actorId === communityMember.id
      );
      expect(ownResourceNotifications).toHaveLength(0);
    });

    it('should not notify when someone adds a resource to a community I am not in', async () => {
      // Create a separate community and user
      const anotherUser = await createTestUser(clientB);
      const anotherCommunity = await createTestCommunity(clientB);

      const initialNotifications = await fetchNotifications(clientA, {
        type: 'new_resource',
      });

      // Have another user create a resource in their community
      await signIn(clientB, anotherUser.email, 'TestPass123!');
      const resource = await createTestResource(
        clientB,
        anotherCommunity.id,
        'offer',
      );

      // Check that community member didn't receive notification
      await signIn(clientA, communityMember.email, 'TestPass123!');
      const result4 = await fetchNotifications(clientA, {
        type: 'new_resource',
      });

      const newNotifications = result4.notifications.filter(n => n.resourceId === resource.id);
      expect(newNotifications).toHaveLength(0);
    });
  });
});
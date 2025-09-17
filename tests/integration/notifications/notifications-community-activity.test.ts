import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
} from '../helpers/test-data';
import { fetchNotifications } from '@/features/notifications';
import { NOTIFICATION_TYPES } from '@/features/notifications/constants';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';

describe('Community Activity Notifications', () => {
  let clientA: SupabaseClient<Database>;
  let clientB: SupabaseClient<Database>;
  let communityMember: Account;
  let testCommunity: Community;
  let resourceCreator: Account;

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
  });

  afterAll(async () => {
    await cleanupAllTestData();
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

      const notifications = await fetchNotifications(clientA);

      expect(notifications.length).toBeGreaterThan(0);
      const resourceNotification = notifications.find(
        (n) => n.resourceId === resource.id,
      );
      expect(resourceNotification).toBeDefined();
      expect(resourceNotification).toMatchObject({
        type: NOTIFICATION_TYPES.NEW_RESOURCE,
        resourceId: resource.id,
        communityId: testCommunity.id,
        actorId: resourceCreator.id,
        isRead: false,
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

      const notifications = await fetchNotifications(clientA);

      expect(notifications.length).toBeGreaterThan(0);
      const eventNotification = notifications.find(
        (n) => n.resourceId === event.id,
      );
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
      // Create a resource as the community member (should not notify self)
      const resource = await createTestResource(
        clientA,
        testCommunity.id,
        'offer',
      );

      const notifications = await fetchNotifications(clientA);

      // Should not have new notifications for own resource
      const ownResourceNotifications = notifications.filter(
        (n) => n.resourceId === resource.id && n.actorId === communityMember.id,
      );
      expect(ownResourceNotifications).toHaveLength(0);
    });

    it('should not notify when someone adds a resource to a community I am not in', async () => {
      // Create a separate community and user
      const anotherUser = await createTestUser(clientB);
      const anotherCommunity = await createTestCommunity(clientB);

      // Have another user create a resource in their community
      await signIn(clientB, anotherUser.email, 'TestPass123!');
      const resource = await createTestResource(
        clientB,
        anotherCommunity.id,
        'offer',
      );

      // Check that community member didn't receive notification
      await signIn(clientA, communityMember.email, 'TestPass123!');
      const notifications = await fetchNotifications(clientA);

      const newNotifications = notifications.filter(
        (n) => n.resourceId === resource.id,
      );
      expect(newNotifications).toHaveLength(0);
    });
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
} from '../helpers/test-data';
import {
  fetchNotifications,
} from '@/features/notifications';
import {
  joinCommunity,
  leaveCommunity,
} from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';

describe('My Communities Notifications', () => {
  let clientA: SupabaseClient<Database>;
  let clientB: SupabaseClient<Database>;
  let communityOrganizer: Account;
  let testCommunity: Community;

  beforeAll(async () => {
    // Create two separate clients for better realtime isolation
    clientA = createTestClient();
    clientB = createTestClient();

    // Create test users and community
    communityOrganizer = await createTestUser(clientA);
    testCommunity = await createTestCommunity(clientA);

  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Sign in as community organizer for consistency
    await signIn(clientA, communityOrganizer.email, 'TestPass123!');
  });

  describe('Community member notifications', () => {
    it('should create community_member_joined notification when someone joins my community', async () => {
      // Create a fresh user for this test
      const freshJoiningUser = await createTestUser(clientB);
      
      // Have fresh user join the community using clientB
      await signIn(clientB, freshJoiningUser.email, 'TestPass123!');
      await joinCommunity(clientB, testCommunity.id);

      // Switch back to community organizer to check notifications
      await signIn(clientA, communityOrganizer.email, 'TestPass123!');

      const notifications = await fetchNotifications(clientA, {
        type: 'community_member_joined',
        limit: 10,
      });

      expect(notifications.length).toBeGreaterThan(0);
      const joinNotification = notifications.find(n => n.actorId === freshJoiningUser.id);
      expect(joinNotification).toBeDefined();
      expect(joinNotification).toMatchObject({
        type: 'community_member_joined',
        communityId: testCommunity.id,
        actorId: freshJoiningUser.id,
        isRead: false,
      });
    });

    it('should create community_member_left notification when someone leaves my community', async () => {
      // Create a fresh user for this test
      const leavingUser = await createTestUser(clientB);
      
      // First, have user join the community
      await signIn(clientB, leavingUser.email, 'TestPass123!');
      await joinCommunity(clientB, testCommunity.id);

      // Then have them leave
      await leaveCommunity(clientB, testCommunity.id);

      // Switch back to community organizer to check notifications
      await signIn(clientA, communityOrganizer.email, 'TestPass123!');

      const notifications = await fetchNotifications(clientA, {
        type: 'community_member_left',
        limit: 10,
      });

      expect(notifications.length).toBeGreaterThan(0);
      const leftNotification = notifications.find(n => n.actorId === leavingUser.id);
      expect(leftNotification).toBeDefined();
      expect(leftNotification).toMatchObject({
        type: 'community_member_left',
        communityId: testCommunity.id,
        actorId: leavingUser.id,
        isRead: false,
      });
    });

    it('should not notify myself when I join another community', async () => {
      const initialNotifications = await fetchNotifications(clientA, {
        type: 'community_member_joined',
      });
      const initialCount = initialNotifications.length;

      // Create another test community and join it as the organizer
      const anotherCommunity = await createTestCommunity(clientA);

      const finalNotifications = await fetchNotifications(clientA, {
        type: 'community_member_joined',
      });

      // Should not have new notifications for joining own community  
      const ownCommunityNotifications = finalNotifications.filter(n => 
        n.communityId === anotherCommunity.id && n.actorId === communityOrganizer.id
      );
      expect(ownCommunityNotifications).toHaveLength(0);
    });
  });
});
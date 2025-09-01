import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  createTestResourceTimeslot,
} from '../helpers/test-data';
import {
  fetchNotifications,
  markAllNotificationsAsRead,
} from '@/features/notifications';
import { createComment } from '@/features/comments';
import { createResourceClaim } from '@/features/resources/api';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';

describe('Notification Grouping', () => {
  let supabase: SupabaseClient<Database>;
  let resourceOwner: Account;
  let testCommunity: Community;
  let user1: Account;
  let user2: Account;
  let user3: Account;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test users and community
    resourceOwner = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create multiple users who will trigger notifications
    user1 = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);

    user2 = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);

    user3 = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData(supabase);
  });

  beforeEach(async () => {
    // Sign in as resource owner and clear existing notifications
    await signIn(supabase, resourceOwner.email, 'TestPass123!');
    await markAllNotificationsAsRead(supabase);
  });

  describe('Comment grouping', () => {
    it('should group multiple comments on same resource', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // First user comments
      await signIn(supabase, user1.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'First comment',
        resourceId: resource.id,
      });

      // Second user comments
      await signIn(supabase, user2.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'Second comment',
        resourceId: resource.id,
      });

      // Third user comments
      await signIn(supabase, user3.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'Third comment',
        resourceId: resource.id,
      });

      // Check notifications for resource owner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const notifications = await fetchNotifications(supabase, {
        type: 'comment',
        isRead: false,
      });

      // Should have only one grouped notification
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'comment',
        resourceId: resource.id,
        actorCount: 3,
        isRead: false,
      });
      expect(notifications[0].groupKey).toContain('resource_comment:');
    });

    it('should update actor count when additional comments are added', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // First comment
      await signIn(supabase, user1.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'First comment',
        resourceId: resource.id,
      });

      // Check initial notification
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      let notifications = await fetchNotifications(supabase, {
        type: 'comment',
        isRead: false,
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0].actorCount).toBe(1);

      // Second comment
      await signIn(supabase, user2.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'Second comment',
        resourceId: resource.id,
      });

      // Check updated notification
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      notifications = await fetchNotifications(supabase, {
        type: 'comment',
        isRead: false,
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0].actorCount).toBe(2);
    });
  });

  describe('Claim grouping', () => {
    it('should group multiple claims on same resource', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      // Multiple users claim the same resource
      await signIn(supabase, user1.email, 'TestPass123!');
      await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        notes: 'First claim',
      });

      await signIn(supabase, user2.email, 'TestPass123!');
      await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        notes: 'Second claim',
      });

      await signIn(supabase, user3.email, 'TestPass123!');
      await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        notes: 'Third claim',
      });

      // Check notifications for resource owner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const notifications = await fetchNotifications(supabase, {
        type: 'claim',
        isRead: false,
      });

      // Should have only one grouped notification
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'claim',
        resourceId: resource.id,
        actorCount: 3,
        isRead: false,
      });
      expect(notifications[0].groupKey).toContain('resource_claim:');
    });
  });

  describe('New resource grouping', () => {
    it('should group new resources by community', async () => {
      // user1 creates multiple resources in the community
      await signIn(supabase, user1.email, 'TestPass123!');
      
      const resource1 = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      const resource2 = await createTestResource(
        supabase,
        testCommunity.id,
        'request',
      );

      // Check notifications for communityMember
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const notifications = await fetchNotifications(supabase, {
        type: 'new_resource',
        isRead: false,
      });

      // Should have grouped notifications by community
      const groupedNotifications = notifications.filter(n => 
        n.groupKey?.includes('new_resource:' + testCommunity.name)
      );

      expect(groupedNotifications.length).toBeGreaterThan(0);
      
      if (groupedNotifications.length > 0) {
        expect(groupedNotifications[0].actorCount).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Cross-type notifications', () => {
    it('should not group notifications of different types', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      // user1 comments
      await signIn(supabase, user1.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'A comment',
        resourceId: resource.id,
      });

      // user2 claims
      await signIn(supabase, user2.email, 'TestPass123!');
      await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        notes: 'A claim',
      });

      // Check notifications for resource owner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const notifications = await fetchNotifications(supabase, {
        isRead: false,
      });

      const commentNotifications = notifications.filter(n => n.type === 'comment');
      const claimNotifications = notifications.filter(n => n.type === 'claim');

      // Should have separate notifications for different types
      expect(commentNotifications).toHaveLength(1);
      expect(claimNotifications).toHaveLength(1);
      expect(commentNotifications[0].groupKey).not.toBe(claimNotifications[0].groupKey);
    });
  });
});
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
  fetchNotificationCounts,
} from '@/features/notifications';
import { createComment } from '@/features/comments';
import { createResourceClaim } from '@/features/resources/api';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';

describe('Notification Triggers', () => {
  let supabase: SupabaseClient<Database>;
  let resourceOwner: Account;
  let testCommunity: Community;
  let communityMember: Account;
  let commenter: Account;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test users and community
    resourceOwner = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create community member
    communityMember = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);

    // Create another user for commenting
    commenter = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData(supabase);
  });

  beforeEach(async () => {
    // Sign in as resource owner for consistency
    await signIn(supabase, resourceOwner.email, 'TestPass123!');
  });

  describe('Comment notifications', () => {
    it('should create notification when someone comments on my resource', async () => {
      // Create a resource as resourceOwner
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Sign in as commenter and comment
      await signIn(supabase, commenter.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'This is a test comment on your resource',
        resourceId: resource.id,
      });

      // Switch back to resourceOwner to check notifications
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const notifications = await fetchNotifications(supabase, {
        type: 'comment',
        limit: 10,
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'comment',
        resourceId: resource.id,
        actorId: commenter.id,
        isRead: false,
        actorCount: 1,
      });
      expect(notifications[0].title).toContain('commented on your');
    });

    it('should not create notification when I comment on my own resource', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      const initialNotifications = await fetchNotifications(supabase);
      const initialCount = initialNotifications.length;

      // Comment on own resource
      await createComment(supabase, {
        content: 'This is my own comment',
        resourceId: resource.id,
      });

      const finalNotifications = await fetchNotifications(supabase);
      expect(finalNotifications).toHaveLength(initialCount);
    });
  });

  describe('Comment reply notifications', () => {
    it('should create notification when someone replies to my comment', async () => {
      // Create a resource as resourceOwner
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // resourceOwner comments on their own resource
      const parentComment = await createComment(supabase, {
        content: 'This is my original comment',
        resourceId: resource.id,
      });

      // commenter replies to the comment
      await signIn(supabase, commenter.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'This is a reply to your comment',
        resourceId: resource.id,
        parentId: parentComment.id,
      });

      // Switch back to resourceOwner to check notifications
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const notifications = await fetchNotifications(supabase, {
        type: 'comment_reply',
        limit: 10,
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'comment_reply',
        resourceId: resource.id,
        commentId: expect.any(String),
        actorId: commenter.id,
        isRead: false,
      });
      expect(notifications[0].title).toContain('replied to your comment');
    });

    it('should not create reply notification when I reply to my own comment', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      const parentComment = await createComment(supabase, {
        content: 'My original comment',
        resourceId: resource.id,
      });

      const initialNotifications = await fetchNotifications(supabase, {
        type: 'comment_reply',
      });
      const initialCount = initialNotifications.length;

      // Reply to own comment
      await createComment(supabase, {
        content: 'My own reply',
        resourceId: resource.id,
        parentId: parentComment.id,
      });

      const finalNotifications = await fetchNotifications(supabase, {
        type: 'comment_reply',
      });
      expect(finalNotifications).toHaveLength(initialCount);
    });
  });

  describe('Resource claim notifications', () => {
    it('should create notification when someone claims my resource', async () => {
      // Create a resource as resourceOwner
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      // commenter claims the resource
      await signIn(supabase, commenter.email, 'TestPass123!');
      await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        notes: 'I would like to claim this resource',
      });

      // Switch back to resourceOwner to check notifications
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const notifications = await fetchNotifications(supabase, {
        type: 'claim',
        limit: 10,
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'claim',
        resourceId: resource.id,
        actorId: commenter.id,
        isRead: false,
      });
      expect(notifications[0].title).toContain('claimed your');
    });

    it('should not create claim notification when I claim my own resource', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'request',
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      const initialNotifications = await fetchNotifications(supabase, {
        type: 'claim',
      });
      const initialCount = initialNotifications.length;

      // Claim own resource
      await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        notes: 'Claiming my own resource',
      });

      const finalNotifications = await fetchNotifications(supabase, {
        type: 'claim',
      });
      expect(finalNotifications).toHaveLength(initialCount);
    });
  });

  describe('New resource notifications', () => {
    it('should create notifications for community members when new resource is added', async () => {
      // Sign in as commenter to create a resource
      await signIn(supabase, commenter.email, 'TestPass123!');
      
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Check notifications for resourceOwner (who is also a community member)
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const notifications = await fetchNotifications(supabase, {
        type: 'new_resource',
        limit: 10,
      });

      expect(notifications.length).toBeGreaterThan(0);
      
      const resourceNotification = notifications.find(n => n.resourceId === resource.id);
      expect(resourceNotification).toBeDefined();
      expect(resourceNotification).toMatchObject({
        type: 'new_resource',
        resourceId: resource.id,
        actorId: commenter.id,
        isRead: false,
      });
      expect(resourceNotification!.title).toContain('New');
      expect(resourceNotification!.title).toContain(testCommunity.name);
    });

    it('should not notify resource owner about their own new resource', async () => {
      const initialNotifications = await fetchNotifications(supabase, {
        type: 'new_resource',
      });
      const initialCount = initialNotifications.length;

      // Create resource as resourceOwner
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      const finalNotifications = await fetchNotifications(supabase, {
        type: 'new_resource',
      });

      // Should not have new notifications for own resource
      const ownResourceNotifications = finalNotifications.filter(n => 
        n.resourceId === resource.id && n.actorId === resourceOwner.id
      );
      expect(ownResourceNotifications).toHaveLength(0);
    });
  });

  describe('Notification count updates', () => {
    it('should update counts when notifications are created and marked as read', async () => {
      // Get initial counts
      const initialCounts = await fetchNotificationCounts(supabase);

      // Create a resource and have someone comment on it
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      await signIn(supabase, commenter.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'Test comment for counts',
        resourceId: resource.id,
      });

      // Switch back to resourceOwner and check counts
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const countsAfterComment = await fetchNotificationCounts(supabase);
      expect(countsAfterComment.comments).toBe((initialCounts.comments || 0) + 1);
      expect(countsAfterComment.notifications).toBe((initialCounts.notifications || 0) + 1);
      expect(countsAfterComment.total).toBeGreaterThan(initialCounts.total || 0);

      // Mark all as read and verify counts update
      const notifications = await fetchNotifications(supabase, { isRead: false });
      if (notifications.length > 0) {
        const { markNotificationAsRead } = await import('@/features/notifications');
        await markNotificationAsRead(supabase, notifications[0].id);
      }

      const countsAfterRead = await fetchNotificationCounts(supabase);
      expect(countsAfterRead.comments).toBeLessThan(countsAfterComment.comments);
      expect(countsAfterRead.notifications).toBeLessThan(countsAfterComment.notifications);
    });
  });

  describe('Shoutout notifications', () => {
    it('should create notification when someone gives me a shoutout', async () => {
      // Create a resource for the shoutout (shoutouts are tied to resources)
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Create a shoutout from commenter to resourceOwner
      await signIn(supabase, commenter.email, 'TestPass123!');
      
      const { createShoutout } = await import('@/features/shoutouts');
      await createShoutout(supabase, {
        receiverId: resourceOwner.id,
        message: 'Great community member!',
        resourceId: resource.id,
        communityId: testCommunity.id,
      });

      // Switch to resourceOwner to check notifications
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const notifications = await fetchNotifications(supabase, {
        type: 'shoutout_received',
        limit: 10,
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'shoutout_received',
        communityId: testCommunity.id,
        actorId: commenter.id,
        isRead: false,
      });
      expect(notifications[0].title).toContain('gave you a shoutout');
    });

    it('should not create notification when I give myself a shoutout', async () => {
      // Create a resource for the shoutout
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Try to give shoutout to self - should be prevented by database constraint
      const { createShoutout } = await import('@/features/shoutouts');
      await expect(
        createShoutout(supabase, {
          receiverId: resourceOwner.id,
          message: 'Self shoutout',
          resourceId: resource.id,
          communityId: testCommunity.id,
        })
      ).rejects.toThrow();
    });
  });
});
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
  fetchNotificationCount,
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
  let commenter: Account;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test users and community
    resourceOwner = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create community member
    await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);

    // Create another user for commenting
    commenter = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
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

      expect(notifications.length).toBeGreaterThan(0);
      
      const specificNotification = notifications.find(n => 
        n.type === 'comment' && 
        n.resourceId === resource.id && 
        n.actorId === commenter.id
      );
      expect(specificNotification).toBeDefined();
      expect(specificNotification).toMatchObject({
        type: 'comment',
        resourceId: resource.id,
        actorId: commenter.id,
        isRead: false,
      });
    });

    it('should not create notification when I comment on my own resource', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Comment on own resource
      await createComment(supabase, {
        content: 'This is my own comment',
        resourceId: resource.id,
      });

      const finalNotifications = await fetchNotifications(supabase);
      
      const selfCommentNotification = finalNotifications.find(n => 
        n.type === 'comment' && 
        n.resourceId === resource.id && 
        n.actorId === resourceOwner.id
      );
      expect(selfCommentNotification).toBeUndefined();
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

      expect(notifications.length).toBeGreaterThan(0);
      
      const specificNotification = notifications.find(n => 
        n.type === 'comment_reply' && 
        n.resourceId === resource.id && 
        n.actorId === commenter.id
      );
      expect(specificNotification).toBeDefined();
      expect(specificNotification).toMatchObject({
        type: 'comment_reply',
        resourceId: resource.id,
        commentId: expect.any(String),
        actorId: commenter.id,
        isRead: false,
      });
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

      // Reply to own comment
      await createComment(supabase, {
        content: 'My own reply',
        resourceId: resource.id,
        parentId: parentComment.id,
      });

      const finalNotifications = await fetchNotifications(supabase, {
        type: 'comment_reply',
      });
      
      const selfReplyNotification = finalNotifications.find(n => 
        n.type === 'comment_reply' && 
        n.resourceId === resource.id && 
        n.actorId === resourceOwner.id
      );
      expect(selfReplyNotification).toBeUndefined();
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

      expect(notifications.length).toBeGreaterThan(0);
      
      const specificNotification = notifications.find(n => 
        n.type === 'claim' && 
        n.resourceId === resource.id && 
        n.actorId === commenter.id
      );
      expect(specificNotification).toBeDefined();
      expect(specificNotification).toMatchObject({
        type: 'claim',
        resourceId: resource.id,
        actorId: commenter.id,
        isRead: false,
      });
    });

    it('should not create claim notification when I claim my own resource', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'request',
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      // Claim own resource
      await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        notes: 'Claiming my own resource',
      });

      const finalNotifications = await fetchNotifications(supabase, {
        type: 'claim',
      });
      
      const selfClaimNotification = finalNotifications.find(n => 
        n.type === 'claim' && 
        n.resourceId === resource.id && 
        n.actorId === resourceOwner.id
      );
      expect(selfClaimNotification).toBeUndefined();
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

      const resourceNotification = notifications.find(
        (n) => n.resourceId === resource.id,
      );
      expect(resourceNotification).toBeDefined();
      expect(resourceNotification).toMatchObject({
        type: 'new_resource',
        resourceId: resource.id,
        actorId: commenter.id,
        isRead: false,
      });
    });

    it('should not notify resource owner about their own new resource', async () => {
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
      const ownResourceNotification = finalNotifications.find(
        (n) => n.resourceId === resource.id && n.actorId === resourceOwner.id,
      );
      expect(ownResourceNotification).toBeUndefined();
    });
  });

  describe('Notification count updates', () => {
    it('should update counts when notifications are created and marked as read', async () => {
      // Get initial counts
      await fetchNotificationCount(supabase);

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

      const countAfterComment = await fetchNotificationCount(supabase);
      expect(countAfterComment).toBeGreaterThan(0);

      // Mark all as read and verify counts update
      const notifications = await fetchNotifications(supabase, {
        isRead: false,
      });
      if (notifications.length > 0) {
        const { markNotificationAsRead } = await import(
          '@/features/notifications'
        );
        await markNotificationAsRead(supabase, notifications[0].id);
      }

      const countAfterRead = await fetchNotificationCount(supabase);
      expect(countAfterRead).toBeLessThan(countAfterComment);
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

      expect(notifications.length).toBeGreaterThan(0);
      
      const specificNotification = notifications.find(n => 
        n.type === 'shoutout_received' && 
        n.communityId === testCommunity.id && 
        n.actorId === commenter.id
      );
      expect(specificNotification).toBeDefined();
      expect(specificNotification).toMatchObject({
        type: 'shoutout_received',
        communityId: testCommunity.id,
        actorId: commenter.id,
        isRead: false,
      });
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
        }),
      ).rejects.toThrow();
    });
  });
});

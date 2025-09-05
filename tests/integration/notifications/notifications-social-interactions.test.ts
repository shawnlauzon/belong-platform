import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
} from '../helpers/test-data';
import { fetchNotifications } from '@/features/notifications';
import { createComment } from '@/features/comments';
import { createShoutout } from '@/features/shoutouts';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';

describe('Social Interactions Notifications', () => {
  let clientA: SupabaseClient<Database>;
  let clientB: SupabaseClient<Database>;
  let resourceOwner: Account;
  let testCommunity: Community;
  let interactingUser: Account;

  beforeAll(async () => {
    // Create two separate clients for better realtime isolation
    clientA = createTestClient();
    clientB = createTestClient();

    // Create test users and community
    resourceOwner = await createTestUser(clientA);
    testCommunity = await createTestCommunity(clientA);

    // Create interacting user
    interactingUser = await createTestUser(clientB);
    await joinCommunity(clientB, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Sign in as resource owner for consistency
    await signIn(clientA, resourceOwner.email, 'TestPass123!');
  });

  describe('Comment notifications', () => {
    it('should create comment notification in database when someone comments on my resource', async () => {
      // Create a resource as resourceOwner
      const resource = await createTestResource(
        clientA,
        testCommunity.id,
        'offer',
      );

      // Sign in as interacting user and comment
      await signIn(clientB, interactingUser.email, 'TestPass123!');
      await createComment(clientB, {
        content: 'This is a test comment on your resource',
        resourceId: resource.id,
      });

      // Switch back to resourceOwner to check notifications
      await signIn(clientA, resourceOwner.email, 'TestPass123!');

      const result = await fetchNotifications(clientA, {
        type: 'comment',
        limit: 10,
      });

      expect(result.notifications.length).toBeGreaterThan(0);
      const commentNotification = result.notifications.find(
        (n) =>
          n.type === 'comment' &&
          n.resourceId === resource.id &&
          n.actorId === interactingUser.id,
      );
      expect(commentNotification).toBeDefined();
      expect(commentNotification).toMatchObject({
        type: 'comment',
        resourceId: resource.id,
        actorId: interactingUser.id,
        isRead: false,
      });
    });

    it('should create comment_reply notification in database when someone replies to my comment', async () => {
      // Create a resource as resourceOwner
      const resource = await createTestResource(
        clientA,
        testCommunity.id,
        'offer',
      );

      // resourceOwner comments on their own resource
      const parentComment = await createComment(clientA, {
        content: 'This is my original comment',
        resourceId: resource.id,
      });

      // interacting user replies to the comment
      await signIn(clientA, interactingUser.email, 'TestPass123!');
      await createComment(clientA, {
        content: 'This is a reply to your comment',
        resourceId: resource.id,
        parentId: parentComment.id,
      });

      // Switch back to resourceOwner to check notifications
      await signIn(clientA, resourceOwner.email, 'TestPass123!');

      const result2 = await fetchNotifications(clientA, {
        type: 'comment_reply',
        limit: 10,
      });

      expect(result2.notifications.length).toBeGreaterThan(0);
      const replyNotification = result2.notifications.find(
        (n) =>
          n.type === 'comment_reply' &&
          n.resourceId === resource.id &&
          n.actorId === interactingUser.id,
      );
      expect(replyNotification).toBeDefined();
      expect(replyNotification).toMatchObject({
        type: 'comment_reply',
        resourceId: resource.id,
        commentId: expect.any(String),
        actorId: interactingUser.id,
        isRead: false,
      });
    });
  });

  describe('Shoutout notifications', () => {
    it('should create shoutout_received notification in database when someone gives me a shoutout', async () => {
      // Create a resource for the shoutout (shoutouts are tied to resources)
      const resource = await createTestResource(
        clientA,
        testCommunity.id,
        'offer',
      );

      // Create a shoutout from interacting user to resourceOwner
      await signIn(clientA, interactingUser.email, 'TestPass123!');

      await createShoutout(clientA, {
        receiverId: resourceOwner.id,
        message: 'Great community member!',
        resourceId: resource.id,
        communityId: testCommunity.id,
      });

      // Switch to resourceOwner to check notifications
      await signIn(clientA, resourceOwner.email, 'TestPass123!');

      const result3 = await fetchNotifications(clientA, {
        type: 'shoutout_received',
        limit: 10,
      });

      expect(result3.notifications.length).toBeGreaterThan(0);
      const shoutoutNotification = result3.notifications.find(
        (n) =>
          n.type === 'shoutout_received' &&
          n.communityId === testCommunity.id &&
          n.actorId === interactingUser.id,
      );
      expect(shoutoutNotification).toBeDefined();
      expect(shoutoutNotification).toMatchObject({
        type: 'shoutout_received',
        communityId: testCommunity.id,
        actorId: interactingUser.id,
        isRead: false,
      });
    });
  });

  describe('Self-notification prevention', () => {
    it('should not create notification when I comment on my own resource', async () => {
      const resource = await createTestResource(
        clientA,
        testCommunity.id,
        'offer',
      );

      const initialResult = await fetchNotifications(clientA);
      const initialCount = initialResult.notifications.length;

      // Comment on own resource
      await createComment(clientA, {
        content: 'This is my own comment',
        resourceId: resource.id,
      });

      const finalResult = await fetchNotifications(clientA);
      expect(finalResult.notifications).toHaveLength(initialCount);
    });

    it('should not create notification when I reply to my own comment', async () => {
      const resource = await createTestResource(
        clientA,
        testCommunity.id,
        'offer',
      );

      const parentComment = await createComment(clientA, {
        content: 'My original comment',
        resourceId: resource.id,
      });

      const initialResult2 = await fetchNotifications(clientA, {
        type: 'comment_reply',
      });
      const initialCount = initialResult2.notifications.length;

      // Reply to own comment
      await createComment(clientA, {
        content: 'My own reply',
        resourceId: resource.id,
        parentId: parentComment.id,
      });

      const finalResult2 = await fetchNotifications(clientA, {
        type: 'comment_reply',
      });
      expect(finalResult2.notifications).toHaveLength(initialCount);
    });

    it('should not create notification when I try to give myself a shoutout', async () => {
      // Create a resource for the shoutout
      const resource = await createTestResource(
        clientA,
        testCommunity.id,
        'offer',
      );

      // Try to give shoutout to self - should be prevented by database constraint
      await expect(
        createShoutout(clientA, {
          receiverId: resourceOwner.id,
          message: 'Self shoutout',
          resourceId: resource.id,
          communityId: testCommunity.id,
        }),
      ).rejects.toThrow();
    });
  });
});

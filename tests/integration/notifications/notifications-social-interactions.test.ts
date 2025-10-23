import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
} from '../helpers/test-data';
import { fetchNotifications } from '@/features/notifications/api';
import { NOTIFICATION_TYPES } from '@/features/notifications/constants';
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
    await joinCommunity(clientB, interactingUser.id, testCommunity.id);
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

      const notifications = await fetchNotifications(clientA, resourceOwner.id);

      expect(notifications.length).toBeGreaterThan(0);
      const commentNotification = notifications.find(
        (n) =>
          n.type === NOTIFICATION_TYPES.COMMENT_CREATED &&
          n.resourceId === resource.id &&
          n.actorId === interactingUser.id,
      );
      expect(commentNotification).toBeDefined();
      expect(commentNotification).toMatchObject({
        type: NOTIFICATION_TYPES.COMMENT_CREATED,
        resourceId: resource.id,
        actorId: interactingUser.id,
        readAt: null,
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

      const notifications = await fetchNotifications(clientA, resourceOwner.id);

      expect(notifications.length).toBeGreaterThan(0);
      const replyNotification = notifications.find(
        (n) =>
          n.type === NOTIFICATION_TYPES.COMMENT_REPLY &&
          n.resourceId === resource.id &&
          n.actorId === interactingUser.id,
      );
      expect(replyNotification).toBeDefined();
      expect(replyNotification).toMatchObject({
        type: NOTIFICATION_TYPES.COMMENT_REPLY,
        resourceId: resource.id,
        commentId: expect.any(String),
        actorId: interactingUser.id,
        readAt: null,
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

      const notifications = await fetchNotifications(clientA, resourceOwner.id);

      expect(notifications.length).toBeGreaterThan(0);
      const shoutoutNotification = notifications.find(
        (n) =>
          n.type === NOTIFICATION_TYPES.SHOUTOUT_CREATED &&
          n.communityId === testCommunity.id &&
          n.actorId === interactingUser.id,
      );
      expect(shoutoutNotification).toBeDefined();
      expect(shoutoutNotification).toMatchObject({
        type: NOTIFICATION_TYPES.SHOUTOUT_CREATED,
        communityId: testCommunity.id,
        actorId: interactingUser.id,
        readAt: null,
      });
    });
  });
});

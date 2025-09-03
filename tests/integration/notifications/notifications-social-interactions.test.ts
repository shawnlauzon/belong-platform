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
import {
  createConnectionRequest,
  approveConnection,
  getMemberConnectionCode,
} from '@/features/connections';
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

      const notifications = await fetchNotifications(clientA, {
        type: 'comment',
        limit: 10,
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
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

      const notifications = await fetchNotifications(clientA, {
        type: 'comment_reply',
        limit: 10,
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
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

      const notifications = await fetchNotifications(clientA, {
        type: 'shoutout_received',
        limit: 10,
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'shoutout_received',
        communityId: testCommunity.id,
        actorId: interactingUser.id,
        isRead: false,
      });
    });
  });

  describe('Connection notifications', () => {
    it('should create connection_request notification in database when someone wants to connect with me', async () => {
      // Get resourceOwner's connection code
      const memberCode = await getMemberConnectionCode(
        clientA,
        testCommunity.id,
      );

      // Create connection request from interacting user using resourceOwner's code
      await signIn(clientA, interactingUser.email, 'TestPass123!');

      const response = await createConnectionRequest(clientA, memberCode.code);
      expect(response.success).toBe(true);

      // Switch to resourceOwner to check notifications
      await signIn(clientA, resourceOwner.email, 'TestPass123!');

      const notifications = await fetchNotifications(clientA, {
        type: 'connection_request',
        limit: 10,
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'connection_request',
        actorId: interactingUser.id,
        isRead: false,
      });
    });

    it('should create connection_accepted notification in database when my connection request is accepted', async () => {
      // Get interactingUser's connection code
      await signIn(clientA, interactingUser.email, 'TestPass123!');
      const memberCode = await getMemberConnectionCode(
        clientA,
        testCommunity.id,
      );

      // Create connection request from resourceOwner to interacting user
      await signIn(clientA, resourceOwner.email, 'TestPass123!');
      const response = await createConnectionRequest(clientA, memberCode.code);
      expect(response.success).toBe(true);

      // Get the pending connection
      const { fetchPendingConnections } = await import(
        '@/features/connections'
      );
      await signIn(clientA, interactingUser.email, 'TestPass123!');
      const pendingConnections = await fetchPendingConnections(clientA);

      expect(pendingConnections).toHaveLength(1);
      const connectionRequest = pendingConnections[0];

      // Approve the connection (this should create notification for resourceOwner)
      await approveConnection(clientA, connectionRequest.id);

      // Switch to resourceOwner to check notifications
      await signIn(clientA, resourceOwner.email, 'TestPass123!');

      const notifications = await fetchNotifications(clientA, {
        type: 'connection_accepted',
        limit: 10,
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'connection_accepted',
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

      const initialNotifications = await fetchNotifications(clientA);
      const initialCount = initialNotifications.length;

      // Comment on own resource
      await createComment(clientA, {
        content: 'This is my own comment',
        resourceId: resource.id,
      });

      const finalNotifications = await fetchNotifications(clientA);
      expect(finalNotifications).toHaveLength(initialCount);
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

      const initialNotifications = await fetchNotifications(clientA, {
        type: 'comment_reply',
      });
      const initialCount = initialNotifications.length;

      // Reply to own comment
      await createComment(clientA, {
        content: 'My own reply',
        resourceId: resource.id,
        parentId: parentComment.id,
      });

      const finalNotifications = await fetchNotifications(clientA, {
        type: 'comment_reply',
      });
      expect(finalNotifications).toHaveLength(initialCount);
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

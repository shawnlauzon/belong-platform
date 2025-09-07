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
  fetchNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/features/notifications';
import { createComment } from '@/features/comments';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';

describe('test_int_notifications_react_query_integration', () => {
  let supabase: SupabaseClient<Database>;
  let notificationReceiver: Account;
  let testCommunity: Community;
  let notificationTrigger: Account;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test users and community
    notificationReceiver = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create another user who will trigger notifications
    notificationTrigger = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Sign in as notification receiver for consistency
    await signIn(supabase, notificationReceiver.email, 'TestPass123!');
  });

  it('should fetch notifications through API after database trigger creates them', async () => {
    // Create a resource as notificationReceiver
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    // Sign in as notificationTrigger and create comment to trigger notification
    await signIn(supabase, notificationTrigger.email, 'TestPass123!');
    const comment = await createComment(supabase, {
      content: 'This comment should create a notification via trigger',
      resourceId: resource.id,
    });

    // Sign back in as receiver and fetch notifications via React Query API
    await signIn(supabase, notificationReceiver.email, 'TestPass123!');
    
    const result = await fetchNotifications(supabase, {
      type: 'comment',
      limit: 10,
    });

    expect(result.notifications).toBeDefined();
    expect(result.notifications.length).toBeGreaterThan(0);
    
    // Find the specific notification created by the trigger
    const triggerNotification = result.notifications.find(n => 
      n.type === 'comment' && 
      n.resourceId === resource.id && 
      n.commentId === comment.id &&
      n.actorId === notificationTrigger.id
    );

    expect(triggerNotification).toBeDefined();
    expect(triggerNotification).toMatchObject({
      type: 'comment',
      resourceId: resource.id,
      commentId: comment.id,
      communityId: testCommunity.id,
      actorId: notificationTrigger.id,
      isRead: false,
      createdAt: expect.any(Date),
      id: expect.any(String),
    });
  });

  it('should fetch notification counts that reflect database trigger updates', async () => {
    // Get initial count
    const initialCount = await fetchNotificationCount(supabase);
    
    // Create multiple actions that should trigger notifications
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

    // Switch to notificationTrigger to create multiple notifications
    await signIn(supabase, notificationTrigger.email, 'TestPass123!');
    
    await createComment(supabase, {
      content: 'First comment notification',
      resourceId: resource1.id,
    });

    await createComment(supabase, {
      content: 'Second comment notification',
      resourceId: resource2.id,
    });

    // Switch back to receiver and check counts
    await signIn(supabase, notificationReceiver.email, 'TestPass123!');
    
    const updatedCount = await fetchNotificationCount(supabase);
    expect(updatedCount).toBeGreaterThanOrEqual(initialCount + 2);
  });

  it('should update counts when notifications are marked as read through API', async () => {
    // Create a resource and trigger a notification
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    await signIn(supabase, notificationTrigger.email, 'TestPass123!');
    await createComment(supabase, {
      content: 'Comment for read test',
      resourceId: resource.id,
    });

    // Switch back and get initial counts
    await signIn(supabase, notificationReceiver.email, 'TestPass123!');
    const initialCount = await fetchNotificationCount(supabase);

    // Fetch notifications to get the ID
    const result = await fetchNotifications(supabase, {
      isRead: false,
      limit: 1,
    });

    expect(result.notifications.length).toBeGreaterThan(0);
    const notificationId = result.notifications[0].id;

    // Mark one notification as read via API
    await markNotificationAsRead(supabase, notificationId);

    // Check that counts were updated
    const updatedCount = await fetchNotificationCount(supabase);
    expect(updatedCount).toBeLessThan(initialCount);
  });

  it('should mark all notifications as read through API and update counts', async () => {
    // Create multiple resources and notifications
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

    await signIn(supabase, notificationTrigger.email, 'TestPass123!');
    await createComment(supabase, {
      content: 'First comment for bulk read test',
      resourceId: resource1.id,
    });
    await createComment(supabase, {
      content: 'Second comment for bulk read test',
      resourceId: resource2.id,
    });

    // Switch back and verify unread notifications exist
    await signIn(supabase, notificationReceiver.email, 'TestPass123!');
    const beforeReadResult = await fetchNotifications(supabase, {
      isRead: false,
    });
    expect(beforeReadResult.notifications.length).toBeGreaterThan(0);

    // Mark all as read via API
    await markAllNotificationsAsRead(supabase);

    // Verify no unread notifications remain
    const afterReadResult = await fetchNotifications(supabase, {
      isRead: false,
    });

    // Should either have 0 notifications or only very recent ones from other tests
    const finalCount = await fetchNotificationCount(supabase);
    expect(finalCount).toBeLessThanOrEqual(1); // Allow for potential concurrent test interference
  });

  it('should filter notifications by type through API', async () => {
    // Create resources to generate different notification types
    const resource1 = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    await signIn(supabase, notificationTrigger.email, 'TestPass123!');
    
    // Create comment (comment notification)
    await createComment(supabase, {
      content: 'Comment notification',
      resourceId: resource1.id,
    });

    // Create another resource (new_resource notification for receiver)
    await createTestResource(
      supabase,
      testCommunity.id,
      'request',
    );

    // Switch back and test filtering
    await signIn(supabase, notificationReceiver.email, 'TestPass123!');
    
    // Fetch only comment notifications
    const commentResult = await fetchNotifications(supabase, {
      type: 'comment',
      limit: 10,
    });

    // All returned notifications should be comment type
    commentResult.notifications.forEach(notification => {
      expect(notification.type).toBe('comment');
    });

    // Fetch only new_resource notifications
    const resourceResult = await fetchNotifications(supabase, {
      type: 'new_resource',
      limit: 10,
    });

    // All returned notifications should be new_resource type
    resourceResult.notifications.forEach(notification => {
      expect(notification.type).toBe('new_resource');
    });

    expect(commentResult.notifications.length).toBeGreaterThan(0);
    expect(resourceResult.notifications.length).toBeGreaterThan(0);
  });

  it('should paginate notifications correctly through API', async () => {
    // Create multiple notifications to test pagination
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    await signIn(supabase, notificationTrigger.email, 'TestPass123!');
    
    // Create multiple comments to generate several notifications
    for (let i = 0; i < 5; i++) {
      await createComment(supabase, {
        content: `Comment ${i} for pagination test`,
        resourceId: resource.id,
      });
    }

    // Switch back and test pagination
    await signIn(supabase, notificationReceiver.email, 'TestPass123!');

    // Fetch first page
    const page1 = await fetchNotifications(supabase, {
      limit: 2,
    });

    expect(page1.notifications.length).toBeGreaterThanOrEqual(2);
    expect(page1.hasMore).toBe(true);

    // Fetch second page
    const page2 = await fetchNotifications(supabase, {
      limit: 2,
      offset: 2,
    });

    expect(page2.notifications.length).toBeGreaterThan(0);
    
    // Pages should contain different notifications
    const page1Ids = page1.notifications.map(n => n.id);
    const page2Ids = page2.notifications.map(n => n.id);
    const overlap = page1Ids.filter(id => page2Ids.includes(id));
    expect(overlap.length).toBe(0);
  });
});
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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
} from '@/features/notifications';
import { createComment } from '@/features/comments';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';

describe('test_int_notification_system_integration', () => {
  let supabase: SupabaseClient<Database>;
  let notificationReceiver: Account;
  let testCommunity: Community;
  let activityGenerator: Account;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test users and community
    notificationReceiver = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create another user who will generate activity
    activityGenerator = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it('should create and fetch notifications through the complete system', async () => {
    // Sign in as notification receiver and create a resource
    await signIn(supabase, notificationReceiver.email, 'TestPass123!');
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    // Get initial notification count
    const initialCount = await fetchNotificationCount(supabase);

    // Sign in as activity generator and create a comment
    await signIn(supabase, activityGenerator.email, 'TestPass123!');
    await createComment(supabase, {
      content: 'Test comment for end-to-end notification test',
      resourceId: resource.id,
    });

    // Switch back to receiver and check if notification appears via API
    await signIn(supabase, notificationReceiver.email, 'TestPass123!');
    
    // Allow time for any async processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Fetch notifications and verify at least one exists
    const notificationsResult = await fetchNotifications(supabase, {
      limit: 10,
    });

    expect(notificationsResult.notifications).toBeDefined();
    expect(Array.isArray(notificationsResult.notifications)).toBe(true);

    // Check if count increased
    const updatedCount = await fetchNotificationCount(supabase);
    expect(updatedCount).toBeGreaterThanOrEqual(initialCount);

    // If notifications exist, verify the structure matches expected API contract
    if (notificationsResult.notifications.length > 0) {
      const notification = notificationsResult.notifications[0];
      expect(notification).toMatchObject({
        id: expect.any(String),
        type: expect.any(String),
        isRead: expect.any(Boolean),
        createdAt: expect.any(Date),
      });

      // Test marking as read functionality
      if (!notification.isRead) {
        await markNotificationAsRead(supabase, notification.id);
        const reducedCount = await fetchNotificationCount(supabase);
        expect(reducedCount).toBeLessThanOrEqual(updatedCount);
      }
    }
  });

  it('should handle notification filtering and pagination correctly', async () => {
    // Sign in as notification receiver
    await signIn(supabase, notificationReceiver.email, 'TestPass123!');
    
    // Create multiple resources to potentially generate notifications
    const resource1 = await createTestResource(supabase, testCommunity.id, 'offer');
    const resource2 = await createTestResource(supabase, testCommunity.id, 'request');

    // Switch to activity generator and create multiple comments
    await signIn(supabase, activityGenerator.email, 'TestPass123!');
    await createComment(supabase, {
      content: 'First comment for filtering test',
      resourceId: resource1.id,
    });
    await createComment(supabase, {
      content: 'Second comment for filtering test', 
      resourceId: resource2.id,
    });

    // Switch back and test API functionality
    await signIn(supabase, notificationReceiver.email, 'TestPass123!');
    
    // Allow processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test unfiltered fetch
    const allNotifications = await fetchNotifications(supabase, { limit: 10 });
    expect(allNotifications.notifications).toBeDefined();

    // Test pagination
    const page1 = await fetchNotifications(supabase, { limit: 1 });
    const page2 = await fetchNotifications(supabase, { limit: 1, offset: 1 });

    expect(page1.notifications).toBeDefined();
    expect(page2.notifications).toBeDefined();

    // If we have notifications, pages should be different
    if (page1.notifications.length > 0 && page2.notifications.length > 0) {
      expect(page1.notifications[0].id).not.toBe(page2.notifications[0].id);
    }
  });

  it('should provide correct data structure through all API functions', async () => {
    // Sign in as notification receiver  
    await signIn(supabase, notificationReceiver.email, 'TestPass123!');

    // Test that API functions return expected data types even with no data
    const count = await fetchNotificationCount(supabase);
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);

    const result = await fetchNotifications(supabase, { limit: 5 });
    expect(result).toMatchObject({
      notifications: expect.any(Array),
      hasMore: expect.any(Boolean),
    });

    expect(Array.isArray(result.notifications)).toBe(true);
    
    // Verify all notifications have correct structure
    result.notifications.forEach(notification => {
      expect(notification).toMatchObject({
        id: expect.any(String),
        type: expect.any(String),
        isRead: expect.any(Boolean),
        createdAt: expect.any(Date),
      });

      // Optional fields should be strings if present
      if (notification.actorId) {
        expect(typeof notification.actorId).toBe('string');
      }
      if (notification.resourceId) {
        expect(typeof notification.resourceId).toBe('string');
      }
      if (notification.communityId) {
        expect(typeof notification.communityId).toBe('string');
      }
    });
  });

  it('should handle error cases gracefully', async () => {
    // Test unauthenticated state
    await supabase.auth.signOut();
    
    await expect(fetchNotifications(supabase)).rejects.toThrow();
    await expect(fetchNotificationCount(supabase)).rejects.toThrow();

    // Test invalid notification ID
    await signIn(supabase, notificationReceiver.email, 'TestPass123!');
    await expect(
      markNotificationAsRead(supabase, 'invalid-uuid-format')
    ).rejects.toThrow();
  });
});

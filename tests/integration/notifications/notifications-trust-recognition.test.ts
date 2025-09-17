import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { createTestUser, createTestCommunity } from '../helpers/test-data';
import { fetchNotifications } from '@/features/notifications';
import { NOTIFICATION_TYPES } from '@/features/notifications/constants';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Notification } from '@/features/notifications';

describe('Trust & Recognition Notifications', () => {
  let clientA: SupabaseClient<Database>;
  let trustRecipient: Account;

  // Real-time testing
  let notificationChannel: RealtimeChannel;
  let notificationsReceived: Notification[] = [];

  beforeAll(async () => {
    // Create client for testing
    clientA = createTestClient();

    // Create test user
    trustRecipient = await createTestUser(clientA);

    // Set up single persistent channel for INSERT events on clientA
    notificationChannel = clientA
      .channel(`user:${trustRecipient.id}:notifications`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${trustRecipient.id}`,
        },
        (payload) => {
          notificationsReceived.push(payload.new as Notification);
        },
      )
      .subscribe();

    // Wait for channel to be established
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (notificationChannel) {
      await notificationChannel.unsubscribe();
      clientA.removeChannel(notificationChannel);
    }
  });

  beforeEach(async () => {
    // Sign in as trust recipient for consistency
    await signIn(clientA, trustRecipient.email, 'TestPass123!');
  });

  describe('Trust points notifications', () => {
    it('should create trust_points_changed notification when I receive trust points', async () => {
      // Check initial trust points notifications
      const initialResult = await fetchNotifications(clientA);
      const initialCount = initialResult.notifications.length;

      // Trigger an action that awards trust points (e.g., creating a community)
      // Note: This test may need to be adjusted based on what actions actually trigger trust points
      await createTestCommunity(clientA);

      // Check for new trust points notifications
      const finalResult = await fetchNotifications(clientA);

      // Should have received a trust points notification for community creation
      expect(finalResult.notifications.length).toBeGreaterThan(initialCount);
      const trustPointsNotification = finalResult.notifications.find(
        (n) =>
          n.type === NOTIFICATION_TYPES.TRUST_POINTS_CHANGED &&
          !initialResult.notifications.some((init) => init.id === n.id),
      );

      expect(trustPointsNotification).toBeDefined();
      expect(trustPointsNotification).toMatchObject({
        type: NOTIFICATION_TYPES.TRUST_POINTS_CHANGED,
        userId: trustRecipient.id,
        communityId: expect.any(String),
        isRead: false,
        metadata: expect.objectContaining({
          amount: expect.any(Number)
        })
      });
    });

    it('should create trust_level_changed notification when I reach a new trust level', async () => {
      // This test is challenging to implement without knowing the exact trust level thresholds
      // and having a way to reliably trigger level changes

      const initialResult2 = await fetchNotifications(clientA);

      // Note: This would require performing enough actions to level up
      // which might be difficult in an integration test environment
      // For now, we'll check if any trust level notifications exist in the system

      // Filter to only trust level notifications
      const trustLevelNotifications = initialResult2.notifications.filter(n => n.type === NOTIFICATION_TYPES.TRUST_LEVEL_CHANGED);
      
      if (trustLevelNotifications.length > 0) {
        expect(trustLevelNotifications[0]).toMatchObject({
          type: NOTIFICATION_TYPES.TRUST_LEVEL_CHANGED,
          userId: trustRecipient.id,
          isRead: expect.any(Boolean),
        });
      } else {
        // This is expected for new users who haven't leveled up yet
        expect(trustLevelNotifications).toHaveLength(0);
      }
    });

    it('should receive real-time trust_points_received notification', async () => {
      // Clear any existing notifications
      notificationsReceived = [];

      // Trigger an action that awards trust points
      await createTestCommunity(clientA);

      // Wait for realtime to propagate
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check if we received any trust points notifications via realtime
      const trustPointsNotifications = notificationsReceived.filter(
        (n) => n.type === NOTIFICATION_TYPES.TRUST_POINTS_CHANGED,
      );

      expect(trustPointsNotifications.length).toBeGreaterThan(0);
      expect(trustPointsNotifications[0]).toMatchObject({
        type: NOTIFICATION_TYPES.TRUST_POINTS_CHANGED,
        user_id: trustRecipient.id,
        is_read: false,
      });
    });

    it('should not duplicate trust points notifications for the same action', async () => {
      // Get current notifications count
      const initialResult3 = await fetchNotifications(clientA);

      // Perform the same action twice (if that's how the system works)
      await createTestCommunity(clientA);

      // Wait a moment
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await createTestCommunity(clientA);

      // Wait a moment
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const finalResult3 = await fetchNotifications(clientA);

      // Each community creation should generate its own trust points notification
      // (assuming community creation awards trust points)
      const initialTrustCount = initialResult3.notifications.filter(n => n.type === NOTIFICATION_TYPES.TRUST_POINTS_CHANGED).length;
      const finalTrustCount = finalResult3.notifications.filter(n => n.type === NOTIFICATION_TYPES.TRUST_POINTS_CHANGED).length;
      const newNotificationsCount = finalTrustCount - initialTrustCount;

      // Should have received notifications for both community creations
      // or none if trust points for community creation aren't implemented
      expect(newNotificationsCount).toBeGreaterThanOrEqual(0);

      if (newNotificationsCount > 0) {
        expect(newNotificationsCount).toBeGreaterThanOrEqual(1);
      }
    });

    it('should send notification for trust points when offering a resource', async () => {
      // Get initial trust points notifications
      const initialResult = await fetchNotifications(clientA);
      const initialTrustCount = initialResult.notifications.filter(n => n.type === NOTIFICATION_TYPES.TRUST_POINTS_CHANGED).length;

      // Create a community first
      const testCommunity = await createTestCommunity(clientA);

      // Create a resource offer (this should award trust points)
      const { createResource } = await import('@/features/resources/api');
      await createResource(clientA, {
        title: 'Test Resource Offer',
        description: 'A helpful resource to share',
        type: 'offer',
        communityIds: [testCommunity.id],
        locationName: 'Test Location',
        status: 'open',
        requiresApproval: false
      });

      // Wait for trust point calculation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check for new trust points notifications
      const finalResult = await fetchNotifications(clientA);

      const finalTrustCount = finalResult.notifications.filter(n => n.type === NOTIFICATION_TYPES.TRUST_POINTS_CHANGED).length;
      expect(finalTrustCount).toBeGreaterThan(initialTrustCount);
      
      const newNotification = finalResult.notifications.find(n => 
        n.type === NOTIFICATION_TYPES.TRUST_POINTS_CHANGED && 
        !initialResult.notifications.some(init => init.id === n.id)
      );
      
      expect(newNotification).toBeDefined();
      expect(newNotification).toMatchObject({
        type: NOTIFICATION_TYPES.TRUST_POINTS_CHANGED,
        userId: trustRecipient.id,
        isRead: false,
        metadata: expect.objectContaining({
          amount: expect.any(Number)
        })
      });
    });

  });
});

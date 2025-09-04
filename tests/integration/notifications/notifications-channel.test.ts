import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
} from '../helpers/test-data';
import { subscribeToNotifications } from '@/features/notifications/api/subscribeToNotifications';
import { createComment } from '@/features/comments';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';

describe('Notification Channel Integration', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: Account;
  let testCommunity: Community;
  let anotherUser: Account;
  // Track received notifications and status changes per test
  let receivedNotifications: Record<string, unknown>[] = [];
  let statusChanges: { status: string; error?: unknown }[] = [];

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test users and community
    testUser = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create another user and have them join
    anotherUser = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);
  });

  afterAll(async () => {
    // Channel cleanup is handled in individual tests
  });

  beforeEach(async () => {
    // Clear tracking arrays
    receivedNotifications = [];
    statusChanges = [];
    
    // Sign in as testUser for consistency
    await signIn(supabase, testUser.email, 'TestPass123!');
  });

  describe('Channel subscription setup', () => {
    it('should establish subscription with SUBSCRIBED status', async () => {
      const notificationChannel = subscribeToNotifications(supabase, testUser.id, {
        onNotification: (payload) => {
          receivedNotifications.push(payload.new);
        },
        onStatusChange: (status, error) => {
          statusChanges.push({ status, error });
        },
      });

      // Wait for subscription to establish
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Should have received status updates
      expect(statusChanges.length).toBeGreaterThan(0);
      
      // Should reach SUBSCRIBED status
      const hasSubscribed = statusChanges.some(change => 
        change.status === 'SUBSCRIBED'
      );
      expect(hasSubscribed).toBe(true);
      
      // Should not have any errors
      const hasErrors = statusChanges.some(change => !!change.error);
      expect(hasErrors).toBe(false);

      // Clean up
      await notificationChannel.unsubscribe();
      supabase.removeChannel(notificationChannel);
    });

    it('should receive real-time notifications when they are created', async () => {
      // Set up subscription
      const notificationChannel = subscribeToNotifications(supabase, testUser.id, {
        onNotification: (payload) => {
          receivedNotifications.push(payload.new);
        },
        onStatusChange: (status, error) => {
          statusChanges.push({ status, error });
        },
      });

      // Wait for subscription to establish
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Create a resource as testUser
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Have another user comment (this should trigger notification)
      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'Channel test comment',
        resourceId: resource.id,
      });

      // Wait for realtime to propagate
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify notification was received
      expect(receivedNotifications.length).toBeGreaterThan(0);
      
      const commentNotification = receivedNotifications.find(n => 
        n.type === 'comment' && 
        n.resource_id === resource.id && 
        n.actor_id === anotherUser.id
      );
      
      expect(commentNotification).toBeDefined();
      expect(commentNotification).toMatchObject({
        type: 'comment',
        resource_id: resource.id,
        actor_id: anotherUser.id,
        user_id: testUser.id,
        is_read: false,
      });

      // Clean up
      await notificationChannel.unsubscribe();
      supabase.removeChannel(notificationChannel);
    });
  });

  describe('Error handling and reconnection', () => {
    it('should handle subscription errors gracefully', async () => {
      // Test with invalid user ID to trigger potential errors
      const invalidUserId = '00000000-0000-0000-0000-000000000000';
      
      const errorChannel = subscribeToNotifications(supabase, invalidUserId, {
        onNotification: (payload) => {
          receivedNotifications.push(payload.new);
        },
        onStatusChange: (status, error) => {
          statusChanges.push({ status, error });
        },
      });

      // Wait for potential error
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Clean up
      await errorChannel.unsubscribe();
      supabase.removeChannel(errorChannel);

      // Should have recorded status changes (might include errors)
      expect(statusChanges.length).toBeGreaterThan(0);
      
      // Log for debugging
      console.log('📊 Error test status changes:', statusChanges);
    });

    it('should handle multiple concurrent subscriptions', async () => {
      // Test multiple channels with different names to avoid conflicts
      const channel1StatusChanges: { status: string; error?: unknown }[] = [];
      const channel2StatusChanges: { status: string; error?: unknown }[] = [];
      
      // Use different channel names by modifying the API function call
      const channel1 = supabase
        .channel(`user:${testUser.id}:notifications:test1`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${testUser.id}`,
          },
          () => {},
        )
        .subscribe((status, error) => {
          channel1StatusChanges.push({ status, error });
        });

      const channel2 = supabase
        .channel(`user:${testUser.id}:notifications:test2`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${testUser.id}`,
          },
          () => {},
        )
        .subscribe((status, error) => {
          channel2StatusChanges.push({ status, error });
        });

      // Wait for both to establish
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Clean up
      await channel1.unsubscribe();
      await channel2.unsubscribe();
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);

      // Both should have established with SUBSCRIBED status
      expect(channel1StatusChanges.length).toBeGreaterThan(0);
      expect(channel2StatusChanges.length).toBeGreaterThan(0);
      
      const channel1HasSubscribed = channel1StatusChanges.some(c => c.status === 'SUBSCRIBED');
      const channel2HasSubscribed = channel2StatusChanges.some(c => c.status === 'SUBSCRIBED');
      
      expect(channel1HasSubscribed).toBe(true);
      expect(channel2HasSubscribed).toBe(true);
    });
  });
});
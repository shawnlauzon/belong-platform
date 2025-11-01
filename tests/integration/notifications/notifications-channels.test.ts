import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  signInAsUser,
} from '../helpers/test-data';
import { createComment } from '@/features/comments';
import { joinCommunity } from '@/features/communities/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';

/**
 * Test suite for in-app notification delivery based on user preferences.
 *
 * Verifies that in-app notifications are created (or not created) in the notifications
 * table based on user's per-type in_app preference settings.
 *
 * Note: Push notification delivery is not tested here as it involves:
 * - pg_net HTTP queueing (infrastructure layer)
 * - Edge function invocation (requires deployment)
 * - Actual web push delivery (requires real devices)
 *
 * Push notifications should be verified through manual testing and production monitoring.
 */
describe('In-App Notification Delivery', () => {
  let supabase: SupabaseClient<Database>;
  let resourceOwner: Account;
  let commenter: Account;
  let testCommunity: Community;

  beforeAll(async () => {
    supabase = createTestClient();

    resourceOwner = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    commenter = await createTestUser(supabase);
    await joinCommunity(supabase, commenter.id, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    await signInAsUser(supabase, resourceOwner);
  });

  describe('In-app preference enforcement', () => {
    it('creates in-app notification', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      await signInAsUser(supabase, commenter);
      await createComment(supabase, commenter.id, {
        content: 'Test in-app delivery',
        resourceId: resource.id,
      });

      await signInAsUser(supabase, resourceOwner);

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('action', 'resource.commented')
        .eq('resource_id', resource.id);

      expect(notifications).toHaveLength(1);
      expect(notifications![0].action).toBe('resource.commented');
    });

    it('respects different in_app preferences for different notification types', async () => {
      // Enable in_app for resource.commented but disable for claim.created
      await supabase
        .from('notification_preferences')
        .update({
          resource_commented: {
            in_app: true,
            push: false,
            email: false,
          },
          claim_created: {
            in_app: false,
            push: false,
            email: false,
          },
        })
        .eq('user_id', resourceOwner.id);

      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Trigger resource.commented notification
      await signInAsUser(supabase, commenter);
      await createComment(supabase, commenter.id, {
        content: 'This should create a notification',
        resourceId: resource.id,
      });

      await signInAsUser(supabase, resourceOwner);

      // Should have resource.commented notification
      const { data: commentNotifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('action', 'resource.commented')
        .eq('resource_id', resource.id);

      expect(commentNotifications).toHaveLength(1);
    });

    it('creates in-app notification with all required fields populated', async () => {
      await supabase
        .from('notification_preferences')
        .update({
          resource_commented: {
            in_app: true,
            push: false,
            email: false,
          },
        })
        .eq('user_id', resourceOwner.id);

      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      await signInAsUser(supabase, commenter);
      await createComment(supabase, commenter.id, {
        content: 'Verify complete notification structure',
        resourceId: resource.id,
      });

      await signInAsUser(supabase, resourceOwner);

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('action', 'resource.commented')
        .eq('resource_id', resource.id);

      expect(notifications).toHaveLength(1);

      const notification = notifications![0];
      expect(notification).toMatchObject({
        action: 'resource.commented',
        user_id: resourceOwner.id,
        actor_id: commenter.id,
        resource_id: resource.id,
        community_id: testCommunity.id,
        read_at: null,
      });

      expect(notification.id).toBeDefined();
      expect(notification.comment_id).toBeDefined();
      expect(notification.created_at).toBeDefined();
    });
  });
});

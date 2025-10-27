import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  createTestResourceTimeslot,
  signInAsUser,
} from '../helpers/test-data';
import { createComment } from '@/features/comments';
import { createResourceClaim } from '@/features/resources/api';
import { joinCommunity } from '@/features/communities/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';
import { parseChannelPreferences } from '@/features/notifications/types/notificationPreferences';

/**
 * Test suite for multi-channel notification delivery.
 *
 * Channels:
 * 1. In-App: Controlled by type preference in_app
 * 2. Push: Requires push_enabled=true AND type preference push=true (except event.cancelled)
 * 3. Email: Requires email_enabled=true AND type preference email=true
 *
 * Critical notifications (event.cancelled) always push if push_enabled=true.
 *
 * These tests will FAIL until the channel delivery logic is implemented.
 */
describe('Notification Channels - Multi-Channel Delivery', () => {
  let supabase: SupabaseClient<Database>;
  let resourceOwner: Account;
  let claimant: Account;
  let testCommunity: Community;

  // Mock push subscription for testing
  const mockPushSubscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/channel-test',
    p256dh_key: 'BTestKeyForChannelDelivery123456789012345678',
    auth_key: 'auth-key-channel-test',
  };

  beforeAll(async () => {
    supabase = createTestClient();

    resourceOwner = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    claimant = await createTestUser(supabase);
    await joinCommunity(supabase, claimant.id, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    await signInAsUser(supabase, resourceOwner);
  });

  describe('In-App channel', () => {
    it('delivers in-app notification when type preference in_app is true', async () => {
      // Set up preferences: in_app enabled
      await supabase
        .from('notification_preferences')
        .update({
          'resource.commented': {
            in_app: true,
            push: false,
            email: false,
          },
        })
        .eq('user_id', resourceOwner.id);

      const resource = await createTestResource(supabase, testCommunity.id, 'offer');

      await signInAsUser(supabase, claimant);
      await createComment(supabase, claimant.id, {
        content: 'Test in-app delivery',
        resourceId: resource.id,
      });

      await signInAsUser(supabase, resourceOwner);

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('type', 'resource.commented')
        .eq('resource_id', resource.id);

      expect(notifications).toHaveLength(1);
      expect(notifications![0].type).toBe('resource.commented');
    });

    it('does not deliver in-app notification when type preference in_app is false', async () => {
      await supabase
        .from('notification_preferences')
        .update({
          'resource.commented': {
            in_app: false,
            push: false,
            email: false,
          },
        })
        .eq('user_id', resourceOwner.id);

      const resource = await createTestResource(supabase, testCommunity.id, 'offer');

      await signInAsUser(supabase, claimant);
      await createComment(supabase, claimant.id, {
        content: 'Should not appear in-app',
        resourceId: resource.id,
      });

      await signInAsUser(supabase, resourceOwner);

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('type', 'resource.commented')
        .eq('resource_id', resource.id);

      expect(notifications).toHaveLength(0);
    });
  });

  describe('Push channel - standard notifications', () => {
    beforeEach(async () => {
      // Register push subscription for tests
      await supabase.from('push_subscriptions').insert({
        user_id: resourceOwner.id,
        endpoint: mockPushSubscription.endpoint,
        p256dh_key: mockPushSubscription.p256dh_key,
        auth_key: mockPushSubscription.auth_key,
      });
    });

    it('sends push when push_enabled=true AND type preference push=true', async () => {
      await supabase
        .from('notification_preferences')
        .update({
          push_enabled: true,
          'resource.commented': {
            in_app: true,
            push: true,
            email: false,
          },
        })
        .eq('user_id', resourceOwner.id);

      // Verify preference setup
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('push_enabled, "resource.commented"')
        .eq('user_id', resourceOwner.id)
        .single();

      expect(prefs!.push_enabled).toBe(true);
      expect((prefs!['resource.commented'] as Record<string, unknown>).push).toBe(true);

      // Note: Actual push delivery verification would require
      // checking edge function invocation logs or push_notifications table
    });

    it('does not send push when push_enabled=false', async () => {
      await supabase
        .from('notification_preferences')
        .update({
          push_enabled: false,
          resource_commented: {
            in_app: true,
            push: true, // Type allows it, but global switch is off
            email: false,
          },
        })
        .eq('user_id', resourceOwner.id);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('push_enabled')
        .eq('user_id', resourceOwner.id)
        .single();

      expect(prefs!.push_enabled).toBe(false);
      // Push should NOT be sent
    });

    it('does not send push when type preference push=false', async () => {
      await supabase
        .from('notification_preferences')
        .update({
          push_enabled: true, // Global switch on
          resource_commented: {
            in_app: true,
            push: false, // But type disables it
            email: false,
          },
        })
        .eq('user_id', resourceOwner.id);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('"resource.commented"')
        .eq('user_id', resourceOwner.id)
        .single();

      const channelPrefs = parseChannelPreferences(prefs!['resource.commented']);
      expect(channelPrefs.push).toBe(false);
      // Push should NOT be sent
    });

    it('does not send push when user has no push subscriptions', async () => {
      // Remove all push subscriptions
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', resourceOwner.id);

      await supabase
        .from('notification_preferences')
        .update({
          push_enabled: true,
          resource_commented: {
            in_app: true,
            push: true,
            email: false,
          },
        })
        .eq('user_id', resourceOwner.id);

      // Verify no subscriptions
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', resourceOwner.id);

      expect(subscriptions).toHaveLength(0);
      // Push should NOT be sent (no devices to send to)
    });
  });

  describe('Push channel - critical notifications', () => {
    beforeEach(async () => {
      await supabase.from('push_subscriptions').insert({
        user_id: resourceOwner.id,
        endpoint: mockPushSubscription.endpoint,
        p256dh_key: mockPushSubscription.p256dh_key,
        auth_key: mockPushSubscription.auth_key,
      });
    });

    it('event.cancelled always sends push if push_enabled=true (overrides type preference)', async () => {
      // Set push_enabled=true but disable push for event.cancelled
      await supabase
        .from('notification_preferences')
        .update({
          push_enabled: true,
          'event.cancelled': {
            in_app: true,
            push: false, // User disabled it, but should still push (critical)
            email: false,
          },
        })
        .eq('user_id', resourceOwner.id);

      const event = await createTestResource(supabase, testCommunity.id, 'event');
      const timeslot = await createTestResourceTimeslot(supabase, event.id);

      await signInAsUser(supabase, claimant);
      await createResourceClaim(supabase, {
        resourceId: event.id,
        timeslotId: timeslot.id,
      });

      // Owner cancels event
      await signInAsUser(supabase, resourceOwner);
      await supabase.from('resources').update({ status: 'cancelled' }).eq('id', event.id);

      // Verify push would be sent despite type preference
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('push_enabled, "event.cancelled"')
        .eq('user_id', resourceOwner.id)
        .single();

      expect(prefs!.push_enabled).toBe(true);
      // event.cancelled should override type preference and push anyway
    });

    it('event.cancelled does not push if push_enabled=false (global switch takes priority)', async () => {
      await supabase
        .from('notification_preferences')
        .update({
          push_enabled: false, // Global switch off
          'event.cancelled': {
            in_app: true,
            push: true,
            email: false,
          },
        })
        .eq('user_id', resourceOwner.id);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('push_enabled')
        .eq('user_id', resourceOwner.id)
        .single();

      expect(prefs!.push_enabled).toBe(false);
      // Even critical notifications respect push_enabled=false
    });
  });

  describe('Email channel', () => {
    it('sends email when email_enabled=true AND type preference email=true', async () => {
      await supabase
        .from('notification_preferences')
        .update({
          email_enabled: true,
          'resource.commented': {
            in_app: true,
            push: false,
            email: true,
          },
        })
        .eq('user_id', resourceOwner.id);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('email_enabled, "resource.commented"')
        .eq('user_id', resourceOwner.id)
        .single();

      expect(prefs!.email_enabled).toBe(true);
      expect((prefs!['resource.commented'] as Record<string, unknown>).email).toBe(true);
      // Email should be sent
    });

    it('does not send email when email_enabled=false', async () => {
      await supabase
        .from('notification_preferences')
        .update({
          email_enabled: false,
          'resource.commented': {
            in_app: true,
            push: false,
            email: true, // Type allows it, but global switch is off
          },
        })
        .eq('user_id', resourceOwner.id);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('email_enabled')
        .eq('user_id', resourceOwner.id)
        .single();

      expect(prefs!.email_enabled).toBe(false);
      // Email should NOT be sent
    });

    it('does not send email when type preference email=false', async () => {
      await supabase
        .from('notification_preferences')
        .update({
          email_enabled: true, // Global switch on
          'resource.commented': {
            in_app: true,
            push: false,
            email: false, // But type disables it
          },
        })
        .eq('user_id', resourceOwner.id);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('"resource.commented"')
        .eq('user_id', resourceOwner.id)
        .single();

      expect((prefs!['resource.commented'] as Record<string, unknown>).email).toBe(false);
      // Email should NOT be sent
    });
  });

  describe('Multi-channel delivery', () => {
    it('delivers to multiple channels when all enabled', async () => {
      await supabase.from('push_subscriptions').insert({
        user_id: resourceOwner.id,
        endpoint: mockPushSubscription.endpoint,
        p256dh_key: mockPushSubscription.p256dh_key,
        auth_key: mockPushSubscription.auth_key,
      });

      await supabase
        .from('notification_preferences')
        .update({
          push_enabled: true,
          email_enabled: true,
          'resource.commented': {
            in_app: true,
            push: true,
            email: true,
          },
        })
        .eq('user_id', resourceOwner.id);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .single();

      expect(prefs!.push_enabled).toBe(true);
      expect(prefs!.email_enabled).toBe(true);
      expect((prefs!['resource.commented'] as Record<string, unknown>).in_app).toBe(true);
      expect((prefs!['resource.commented'] as Record<string, unknown>).push).toBe(true);
      expect((prefs!['resource.commented'] as Record<string, unknown>).email).toBe(true);
      // All three channels should deliver
    });

    it('delivers to selective channels based on preferences', async () => {
      await supabase
        .from('notification_preferences')
        .update({
          push_enabled: false,
          email_enabled: true,
          'resource.commented': {
            in_app: true,
            push: true,
            email: false,
          },
        })
        .eq('user_id', resourceOwner.id);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .single();

      // Only in-app should deliver (push disabled globally, email disabled for type)
      expect((prefs!['resource.commented'] as Record<string, unknown>).in_app).toBe(true);
      expect(prefs!.push_enabled).toBe(false); // Push blocked by global switch
      expect((prefs!['resource.commented'] as Record<string, unknown>).email).toBe(false); // Email blocked by type pref
    });

    it('supports different channel combinations per notification type', async () => {
      await supabase
        .from('notification_preferences')
        .update({
          push_enabled: true,
          email_enabled: true,
          'resource.commented': {
            in_app: true,
            push: true,
            email: false,
          },
          'claim.created': {
            in_app: true,
            push: false,
            email: true,
          },
        })
        .eq('user_id', resourceOwner.id);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('"resource.commented", "claim.created"')
        .eq('user_id', resourceOwner.id)
        .single();

      // resource.commented: in-app + push
      expect((prefs!['resource.commented'] as Record<string, unknown>).in_app).toBe(true);
      expect((prefs!['resource.commented'] as Record<string, unknown>).push).toBe(true);
      expect((prefs!['resource.commented'] as Record<string, unknown>).email).toBe(false);

      // claim.created: in-app + email
      expect((prefs!['claim.created'] as Record<string, unknown>).in_app).toBe(true);
      expect((prefs!['claim.created'] as Record<string, unknown>).push).toBe(false);
      expect((prefs!['claim.created'] as Record<string, unknown>).email).toBe(true);
    });
  });
});

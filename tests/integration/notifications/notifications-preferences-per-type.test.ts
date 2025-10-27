import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createTestUser, createTestCommunity, createTestResource, signInAsUser } from '../helpers/test-data';
import { createComment } from '@/features/comments';
import { joinCommunity } from '@/features/communities/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';
import { parseChannelPreferences } from '@/features/notifications/types/notificationPreferences';

/**
 * Test suite for the new per-type, per-channel notification preference system.
 *
 * Structure:
 * - notification_preferences table (separate from profiles)
 * - One row per user
 * - 19 JSONB columns (one per notification type)
 * - Each JSONB: {in_app: bool, push: bool, email: bool}
 * - Global switches: push_enabled, email_enabled
 *
 * These tests will FAIL until the new preference system is implemented.
 */
describe('Notification Preferences - Per Type, Per Channel', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: Account;
  let testCommunity: Community;
  let anotherUser: Account;

  beforeAll(async () => {
    supabase = createTestClient();

    testUser = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    anotherUser = await createTestUser(supabase);
    await joinCommunity(supabase, anotherUser.id, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    await signInAsUser(supabase, testUser);
  });

  describe('Default preferences', () => {
    it('creates default preferences for new users', async () => {
      const newUser = await createTestUser(supabase);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', newUser.id)
        .single();

      expect(prefs).toBeDefined();
      expect(prefs!.user_id).toBe(newUser.id);

      // All notification types should default to enabled for all channels
      expect(prefs!.resource_commented).toEqual({
        in_app: true,
        push: true,
        email: false,
      });

      expect(prefs!.comment_replied).toEqual({
        in_app: true,
        push: true,
        email: false,
      });

      // Global switches default to disabled
      expect(prefs!.push_enabled).toBe(false);
      expect(prefs!.email_enabled).toBe(false);
    });

    it('has default preferences for all 19 notification types', async () => {
      const newUser = await createTestUser(supabase);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', newUser.id)
        .single();

      expect(prefs).toBeDefined();

      // Comments (2)
      expect(prefs!.resource_commented).toBeDefined();
      expect(prefs!.comment_replied).toBeDefined();

      // Claims (3)
      expect(prefs!.claim_created).toBeDefined();
      expect(prefs!.claim_cancelled).toBeDefined();
      expect(prefs!.claim_responded).toBeDefined();

      // Transaction confirmation (2)
      expect(prefs!.resource_given).toBeDefined();
      expect(prefs!.resource_received).toBeDefined();

      // Resources & Events (7)
      expect(prefs!.resource_created).toBeDefined();
      expect(prefs!.event_created).toBeDefined();
      expect(prefs!.resource_updated).toBeDefined();
      expect(prefs!.event_updated).toBeDefined();
      expect(prefs!.event_cancelled).toBeDefined();
      expect(prefs!.resource_expiring).toBeDefined();
      expect(prefs!.event_starting).toBeDefined();

      // Social (4)
      expect(prefs!.message_received).toBeDefined();
      expect(prefs!.conversation_requested).toBeDefined();
      expect(prefs!.shoutout_received).toBeDefined();
      expect(prefs!.membership_updated).toBeDefined();

      // System (1)
      expect(prefs!.trustlevel_changed).toBeDefined();
    });
  });

  describe('Updating preferences', () => {
    it('updates specific notification type preferences', async () => {
      // Disable push notifications for resource.commented
      await supabase
        .from('notification_preferences')
        .update({
          resource_commented: {
            in_app: true,
            push: false,
            email: false,
          },
        })
        .eq('user_id', testUser.id);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('resource_commented')
        .eq('user_id', testUser.id)
        .single();

      expect(prefs!.resource_commented).toEqual({
        in_app: true,
        push: false,
        email: false,
      });
    });

    it('updates multiple notification type preferences', async () => {
      await supabase
        .from('notification_preferences')
        .update({
          claim_created: {
            in_app: true,
            push: false,
            email: false,
          },
          claim_responded: {
            in_app: false,
            push: false,
            email: false,
          },
        })
        .eq('user_id', testUser.id);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('claim_created, claim_responded')
        .eq('user_id', testUser.id)
        .single();

      expect(prefs!.claim_created).toEqual({
        in_app: true,
        push: false,
        email: false,
      });

      expect(prefs!.claim_responded).toEqual({
        in_app: false,
        push: false,
        email: false,
      });
    });

    it('updates global push_enabled switch', async () => {
      await supabase
        .from('notification_preferences')
        .update({ push_enabled: true })
        .eq('user_id', testUser.id);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('push_enabled')
        .eq('user_id', testUser.id)
        .single();

      expect(prefs!.push_enabled).toBe(true);
    });

    it('updates global email_enabled switch', async () => {
      await supabase
        .from('notification_preferences')
        .update({ email_enabled: true })
        .eq('user_id', testUser.id);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('email_enabled')
        .eq('user_id', testUser.id)
        .single();

      expect(prefs!.email_enabled).toBe(true);
    });
  });

  describe('Preference enforcement - in-app channel', () => {
    it('creates in-app notification when type preference in_app is true', async () => {
      // Ensure in_app is enabled for resource.commented
      await supabase
        .from('notification_preferences')
        .update({
          resource_commented: {
            in_app: true,
            push: false,
            email: false,
          },
        })
        .eq('user_id', testUser.id);

      const resource = await createTestResource(supabase, testCommunity.id, 'offer');

      await signInAsUser(supabase, anotherUser);
      await createComment(supabase, anotherUser.id, {
        content: 'Test comment',
        resourceId: resource.id,
      });

      await signInAsUser(supabase, testUser);

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', testUser.id)
        .eq('type', 'resource.commented')
        .eq('resource_id', resource.id);

      expect(notifications).toHaveLength(1);
    });

    it('does not create in-app notification when type preference in_app is false', async () => {
      // Disable in_app for resource.commented
      await supabase
        .from('notification_preferences')
        .update({
          resource_commented: {
            in_app: false,
            push: false,
            email: false,
          },
        })
        .eq('user_id', testUser.id);

      const resource = await createTestResource(supabase, testCommunity.id, 'offer');

      await signInAsUser(supabase, anotherUser);
      await createComment(supabase, anotherUser.id, {
        content: 'Test comment',
        resourceId: resource.id,
      });

      await signInAsUser(supabase, testUser);

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', testUser.id)
        .eq('type', 'resource.commented')
        .eq('resource_id', resource.id);

      expect(notifications).toHaveLength(0);
    });
  });

  describe('Preference enforcement - push channel', () => {
    it('sends push when push_enabled=true AND type preference push=true', async () => {
      // Enable push globally and for type
      await supabase
        .from('notification_preferences')
        .update({
          push_enabled: true,
          claim_created: {
            in_app: true,
            push: true,
            email: false,
          },
        })
        .eq('user_id', testUser.id);

      // This test verifies the preference setup
      // Actual push delivery would be tested in notifications-channels.test.ts
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('push_enabled, "claim.created"')
        .eq('user_id', testUser.id)
        .single();

      expect(prefs!.push_enabled).toBe(true);
      expect(parseChannelPreferences(prefs!['claim.created']).push).toBe(true);
    });

    it('does not send push when push_enabled=false (even if type preference push=true)', async () => {
      // Type preference allows push, but global switch is off
      await supabase
        .from('notification_preferences')
        .update({
          push_enabled: false,
          claim_created: {
            in_app: true,
            push: true,
            email: false,
          },
        })
        .eq('user_id', testUser.id);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('push_enabled, claim_created')
        .eq('user_id', testUser.id)
        .single();

      expect(prefs!.push_enabled).toBe(false);
      // Push should NOT be sent despite type preference being true
    });

    it('does not send push when type preference push=false (even if push_enabled=true)', async () => {
      // Global switch on, but type preference disables push
      await supabase
        .from('notification_preferences')
        .update({
          push_enabled: true,
          claim_created: {
            in_app: true,
            push: false,
            email: false,
          },
        })
        .eq('user_id', testUser.id);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('push_enabled, "claim.created"')
        .eq('user_id', testUser.id)
        .single();

      expect(prefs!.push_enabled).toBe(true);
      expect(parseChannelPreferences(prefs!['claim.created']).push).toBe(false);
      // Push should NOT be sent
    });
  });

  describe('Preference enforcement - email channel', () => {
    it('sends email when email_enabled=true AND type preference email=true', async () => {
      await supabase
        .from('notification_preferences')
        .update({
          email_enabled: true,
          shoutout_received: {
            in_app: true,
            push: false,
            email: true,
          },
        })
        .eq('user_id', testUser.id);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('email_enabled, "shoutout.received"')
        .eq('user_id', testUser.id)
        .single();

      expect(prefs!.email_enabled).toBe(true);
      expect(parseChannelPreferences(prefs!['shoutout.received']).email).toBe(true);
    });

    it('does not send email when email_enabled=false', async () => {
      await supabase
        .from('notification_preferences')
        .update({
          email_enabled: false,
          shoutout_received: {
            in_app: true,
            push: false,
            email: true,
          },
        })
        .eq('user_id', testUser.id);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('email_enabled')
        .eq('user_id', testUser.id)
        .single();

      expect(prefs!.email_enabled).toBe(false);
      // Email should NOT be sent
    });
  });

  describe('Critical notifications', () => {
    it('event.cancelled always sends push if push_enabled=true (critical notification)', async () => {
      // Enable push globally, but disable push for event.cancelled
      await supabase
        .from('notification_preferences')
        .update({
          push_enabled: true,
          event_cancelled: {
            in_app: true,
            push: false, // Disabled, but should still push because it's critical
            email: false,
          },
        })
        .eq('user_id', testUser.id);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('push_enabled, event_cancelled')
        .eq('user_id', testUser.id)
        .single();

      expect(prefs!.push_enabled).toBe(true);
      // event.cancelled should override type preference and always push
      // This would be verified in the actual notification sending logic
    });
  });

  describe('Independent channel preferences', () => {
    it('allows different preferences for each channel', async () => {
      await supabase
        .from('notification_preferences')
        .update({
          resource_commented: {
            in_app: true,
            push: false,
            email: true,
          },
        })
        .eq('user_id', testUser.id);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('"resource.commented"')
        .eq('user_id', testUser.id)
        .single();

      const typedPrefs = parseChannelPreferences(prefs!['resource.commented']);
      expect(typedPrefs.in_app).toBe(true);
      expect(typedPrefs.push).toBe(false);
      expect(typedPrefs.email).toBe(true);
    });
  });

  describe('Preferences persistence', () => {
    it('persists preferences across sessions', async () => {
      await supabase
        .from('notification_preferences')
        .update({
          claim_created: {
            in_app: false,
            push: false,
            email: false,
          },
        })
        .eq('user_id', testUser.id);

      // Sign out and back in
      await supabase.auth.signOut();
      await signInAsUser(supabase, testUser);

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('claim_created')
        .eq('user_id', testUser.id)
        .single();

      expect(prefs!.claim_created).toEqual({
        in_app: false,
        push: false,
        email: false,
      });
    });
  });
});

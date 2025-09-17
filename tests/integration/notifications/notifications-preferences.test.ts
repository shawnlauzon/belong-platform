import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  createTestResourceTimeslot,
} from '../helpers/test-data';
import {
  fetchNotifications,
  updatePreferences,
  fetchPreferences,
} from '@/features/notifications';
import { NOTIFICATION_TYPES } from '@/features/notifications/constants';
import { createComment } from '@/features/comments';
import { createResourceClaim } from '@/features/resources/api';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';

describe('Notification Preferences', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: Account;
  let testCommunity: Community;
  let anotherUser: Account;

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
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Sign in as testUser for consistency
    await signIn(supabase, testUser.email, 'TestPass123!');
  });

  describe('Preference updates', () => {
    it('should allow updating notification preferences', async () => {
      // Update preferences to disable some notifications
      await updatePreferences(supabase, {
        social_interactions: false,
        my_resources: true,
        my_registrations: true,
        my_communities: true,
        community_activity: true,
        trust_recognition: true,
        direct_messages: true,
        community_messages: true,
      });

      // Verify preferences were updated
      const preferences = await fetchPreferences(supabase);

      expect(preferences).toMatchObject({
        social_interactions: false,
        my_resources: true,
        my_registrations: true,
        my_communities: true,
        community_activity: true,
        trust_recognition: true,
        direct_messages: true,
        community_messages: true,
      });
    });

    it('should create default preferences for new users', async () => {
      // Reset the test user's preferences to defaults first
      await updatePreferences(supabase, {
        social_interactions: true,
        my_resources: true,
        my_registrations: true,
        my_communities: true,
        community_activity: true,
        trust_recognition: true,
        direct_messages: true,
        community_messages: true,
      });

      // Check that the user has default preferences
      const preferences = await fetchPreferences(supabase);

      expect(preferences).toMatchObject({
        social_interactions: true,
        my_resources: true,
        my_registrations: true,
        my_communities: true,
        community_activity: true,
        trust_recognition: true,
        direct_messages: true,
        community_messages: true,
        email_enabled: false,
        push_enabled: false,
      });
    });
  });

  describe('Preference enforcement', () => {
    it('should not create comment notifications when disabled', async () => {
      // Disable social interaction notifications (includes comments)
      await updatePreferences(supabase, {
        social_interactions: false,
        my_resources: true,
        my_registrations: true,
        my_communities: true,
        community_activity: true,
        trust_recognition: true,
        direct_messages: true,
        community_messages: true,
      });

      // Create a resource
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      const initialResult = await fetchNotifications(supabase, {
        type: NOTIFICATION_TYPES.COMMENT,
      });
      const initialCount = initialResult.notifications.length;

      // Have another user comment
      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'This comment should not generate notification',
        resourceId: resource.id,
      });

      // Check that no new notification was created
      await signIn(supabase, testUser.email, 'TestPass123!');
      const finalResult = await fetchNotifications(supabase, {
        type: NOTIFICATION_TYPES.COMMENT,
      });

      expect(finalResult.notifications).toHaveLength(initialCount);
    });

    it('should not create claim notifications when disabled', async () => {
      // Disable resource notifications (includes claims)
      await updatePreferences(supabase, {
        social_interactions: true,
        my_resources: false,
        my_registrations: true,
        my_communities: true,
        community_activity: true,
        trust_recognition: true,
        direct_messages: true,
        community_messages: true,
      });

      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      const initialResult2 = await fetchNotifications(supabase, {
        type: NOTIFICATION_TYPES.CLAIM,
      });
      const initialCount = initialResult2.notifications.length;

      // Have another user claim
      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        notes: 'This claim should not generate notification',
      });

      // Check that no new notification was created
      await signIn(supabase, testUser.email, 'TestPass123!');
      const finalResult2 = await fetchNotifications(supabase, {
        type: NOTIFICATION_TYPES.CLAIM,
      });

      expect(finalResult2.notifications).toHaveLength(initialCount);
    });

    it('should not create new resource notifications when disabled', async () => {
      // Disable community activity notifications (includes new resources)
      await updatePreferences(supabase, {
        social_interactions: true,
        my_resources: true,
        my_registrations: true,
        my_communities: true,
        community_activity: false,
        trust_recognition: true,
        direct_messages: true,
        community_messages: true,
      });

      const initialResult3 = await fetchNotifications(supabase, {
        type: NOTIFICATION_TYPES.NEW_RESOURCE,
      });
      const initialCount = initialResult3.notifications.length;

      // Have another user create a resource
      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createTestResource(supabase, testCommunity.id, 'offer');

      // Check that no new notification was created
      await signIn(supabase, testUser.email, 'TestPass123!');
      const finalResult3 = await fetchNotifications(supabase, {
        type: NOTIFICATION_TYPES.NEW_RESOURCE,
      });

      expect(finalResult3.notifications).toHaveLength(initialCount);
    });

    it('should still create notifications when preferences are enabled', async () => {
      // Ensure social interaction notifications are enabled
      await updatePreferences(supabase, {
        social_interactions: true,
        my_resources: true,
        my_registrations: true,
        my_communities: true,
        community_activity: true,
        trust_recognition: true,
        direct_messages: true,
        community_messages: true,
      });

      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      const initialResult4 = await fetchNotifications(supabase, {
        type: NOTIFICATION_TYPES.COMMENT,
        isRead: false,
      });
      const initialCount = initialResult4.notifications.length;

      // Have another user comment
      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'This comment should generate notification',
        resourceId: resource.id,
      });

      // Check that notification was created
      await signIn(supabase, testUser.email, 'TestPass123!');
      const finalResult4 = await fetchNotifications(supabase, {
        type: NOTIFICATION_TYPES.COMMENT,
        isRead: false,
      });

      expect(finalResult4.notifications).toHaveLength(initialCount + 1);
    });
  });

  describe('Preference defaults', () => {
    it('should apply default preferences to new users', async () => {
      // Create a new user (automatically signed in)
      await createTestUser(supabase);

      // Check their default preferences
      const preferences = await fetchPreferences(supabase);

      expect(preferences).toMatchObject({
        social_interactions: true,
        my_resources: true,
        my_registrations: true,
        my_communities: true,
        community_activity: true,
        trust_recognition: true,
        direct_messages: true,
        community_messages: true,
        email_enabled: false,
        push_enabled: false,
      });
    });
  });

  describe('Extended notification types', () => {
    it('should handle grouped notification preferences', async () => {
      // Update preferences using grouped categories
      await updatePreferences(supabase, {
        social_interactions: false,
        my_resources: true,
        my_registrations: false,
        my_communities: true,
        community_activity: false,
        trust_recognition: true,
        direct_messages: true,
        community_messages: true,
        email_enabled: false,
        push_enabled: true,
      });

      // Verify all preferences were saved
      const preferences = await fetchPreferences(supabase);

      expect(preferences).toMatchObject({
        social_interactions: false,
        my_resources: true,
        my_registrations: false,
        my_communities: true,
        community_activity: false,
        trust_recognition: true,
        direct_messages: true,
        community_messages: true,
        email_enabled: false,
        push_enabled: true,
      });
    });

    it('should allow disabling direct and community messages separately', async () => {
      // Disable both types of messages and social interactions
      await updatePreferences(supabase, {
        social_interactions: false,
        direct_messages: false,
        community_messages: false,
      });

      const preferences = await fetchPreferences(supabase);

      // Messages should be able to be disabled now
      expect(preferences?.direct_messages).toBe(false);
      expect(preferences?.community_messages).toBe(false);
      expect(preferences?.social_interactions).toBe(false);
    });

    it('should provide default values for all preference categories', async () => {
      // Create a fresh user to test defaults (automatically signed in)
      await createTestUser(supabase);

      // Check that all preference categories have proper defaults
      const preferences = await fetchPreferences(supabase);

      // All categories should default to true except email/push
      expect(preferences).toMatchObject({
        social_interactions: true,
        my_resources: true,
        my_registrations: true,
        my_communities: true,
        community_activity: true,
        trust_recognition: true,
        direct_messages: true,
        community_messages: true,
        email_enabled: false,
        push_enabled: false,
      });
    });
  });
});

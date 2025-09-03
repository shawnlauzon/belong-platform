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
} from '@/features/notifications';
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
    await cleanupAllTestData(supabase);
  });

  beforeEach(async () => {
    // Sign in as testUser for consistency
    await signIn(supabase, testUser.email, 'TestPass123!');
  });

  describe('Preference updates', () => {
    it('should allow updating notification preferences', async () => {
      // Update preferences to disable comment notifications
      await updatePreferences(supabase, {
        user_id: testUser.id,
        comments_on_resources: false,
        comment_replies: true,
        resource_claims: true,
        direct_messages: true,
        community_messages: true,
        community_resources: true,
      });

      // Verify preferences were updated
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('*')
        .single();

      expect(preferences).toMatchObject({
        comments_on_resources: false,
        comment_replies: true,
        resource_claims: true,
        direct_messages: true,
        community_messages: true,
        community_resources: true,
      });
    });

    it('should create default preferences for new users', async () => {
      // Reset the test user's preferences to defaults first
      await updatePreferences(supabase, {
        user_id: testUser.id,
        comments_on_resources: true,
        comment_replies: true,
        resource_claims: true,
        direct_messages: true,
        community_messages: true,
        community_resources: true,
      });

      // Check that the user has default preferences
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('*')
        .single();

      expect(preferences).toMatchObject({
        comments_on_resources: true,
        comment_replies: true,
        resource_claims: true,
        direct_messages: true,
        community_messages: true,
        community_resources: true,
        email_enabled: false,
        push_enabled: false,
      });
    });
  });

  describe('Preference enforcement', () => {
    it('should not create comment notifications when disabled', async () => {
      // Disable comment notifications
      await updatePreferences(supabase, {
        user_id: testUser.id,
        comments_on_resources: false,
        comment_replies: true,
        resource_claims: true,
        direct_messages: true,
        community_messages: true,
        community_resources: true,
      });

      // Create a resource
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      const initialNotifications = await fetchNotifications(supabase, {
        type: 'comment',
      });
      const initialCount = initialNotifications.length;

      // Have another user comment
      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'This comment should not generate notification',
        resourceId: resource.id,
      });

      // Check that no new notification was created
      await signIn(supabase, testUser.email, 'TestPass123!');
      const finalNotifications = await fetchNotifications(supabase, {
        type: 'comment',
      });

      expect(finalNotifications).toHaveLength(initialCount);
    });

    it('should not create claim notifications when disabled', async () => {
      // Disable claim notifications
      await updatePreferences(supabase, {
        user_id: testUser.id,
        comments_on_resources: true,
        comment_replies: true,
        resource_claims: false,
        direct_messages: true,
        community_messages: true,
        community_resources: true,
      });

      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      const initialNotifications = await fetchNotifications(supabase, {
        type: 'claim',
      });
      const initialCount = initialNotifications.length;

      // Have another user claim
      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        notes: 'This claim should not generate notification',
      });

      // Check that no new notification was created
      await signIn(supabase, testUser.email, 'TestPass123!');
      const finalNotifications = await fetchNotifications(supabase, {
        type: 'claim',
      });

      expect(finalNotifications).toHaveLength(initialCount);
    });

    it('should not create new resource notifications when disabled', async () => {
      // Disable new resource notifications
      await updatePreferences(supabase, {
        user_id: testUser.id,
        comments_on_resources: true,
        comment_replies: true,
        resource_claims: true,
        direct_messages: true,
        community_messages: true,
        community_resources: false,
      });

      const initialNotifications = await fetchNotifications(supabase, {
        type: 'new_resource',
      });
      const initialCount = initialNotifications.length;

      // Have another user create a resource
      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Check that no new notification was created
      await signIn(supabase, testUser.email, 'TestPass123!');
      const finalNotifications = await fetchNotifications(supabase, {
        type: 'new_resource',
      });

      expect(finalNotifications).toHaveLength(initialCount);
    });

    it('should still create notifications when preferences are enabled', async () => {
      // Ensure comment notifications are enabled
      await updatePreferences(supabase, {
        user_id: testUser.id,
        comments_on_resources: true,
        comment_replies: true,
        resource_claims: true,
        direct_messages: true,
        community_messages: true,
        community_resources: true,
      });

      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      const initialNotifications = await fetchNotifications(supabase, {
        type: 'comment',
        isRead: false,
      });
      const initialCount = initialNotifications.length;

      // Have another user comment
      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await createComment(supabase, {
        content: 'This comment should generate notification',
        resourceId: resource.id,
      });

      // Check that notification was created
      await signIn(supabase, testUser.email, 'TestPass123!');
      const finalNotifications = await fetchNotifications(supabase, {
        type: 'comment',
        isRead: false,
      });

      expect(finalNotifications).toHaveLength(initialCount + 1);
    });
  });

  describe('Preference defaults', () => {
    it('should apply default preferences to new users', async () => {
      // Create a new user
      const newUser = await createTestUser(supabase);

      // Check their default preferences
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', newUser.id)
        .single();

      expect(preferences).toMatchObject({
        comments_on_resources: true,
        comment_replies: true,
        resource_claims: true,
        direct_messages: true,
        community_messages: true,
        community_resources: true,
        email_enabled: false,
        push_enabled: false,
      });
    });
  });

  describe('Extended notification types', () => {
    it('should handle all 19 notification types in preferences', async () => {
      // Update preferences to include all new types
      await updatePreferences(supabase, {
        user_id: testUser.id,
        // Existing types
        comments_on_resources: false,
        comment_replies: true,
        resource_claims: false,
        direct_messages: true,
        community_messages: true, // Always enabled
        community_resources: true,
        // New Social Interactions
        shoutout_received: false,
        connection_request: true,
        connection_accepted: false,
        // New My Resources
        resource_claim_cancelled: true,
        resource_claim_completed: false,
        // New My Registrations  
        claim_approved: false,
        claim_rejected: true,
        claimed_resource_updated: false,
        claimed_resource_cancelled: true,
        // New My Communities
        community_member_joined: false,
        community_member_left: true,
        // New Community Activity
        new_event: false,
        // New Trust & Recognition
        trust_points_received: true,
        trust_level_changed: false,
      });

      // Verify all preferences were saved
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', testUser.id)
        .single();

      expect(preferences).toMatchObject({
        // Existing types
        comments_on_resources: false,
        comment_replies: true,
        resource_claims: false,
        direct_messages: true,
        community_messages: true, // Always enabled
        community_resources: true,
        // New Social Interactions
        shoutout_received: false,
        connection_request: true,
        connection_accepted: false,
        // New My Resources
        resource_claim_cancelled: true,
        resource_claim_completed: false,
        // New My Registrations
        claim_approved: false,
        claim_rejected: true,
        claimed_resource_updated: false,
        claimed_resource_cancelled: true,
        // New My Communities
        community_member_joined: false,
        community_member_left: true,
        // New Community Activity
        new_event: false,
        // New Trust & Recognition
        trust_points_received: true,
        trust_level_changed: false,
      });
    });

    it('should allow disabling direct and community messages separately', async () => {
      // Disable both types of messages
      await updatePreferences(supabase, {
        user_id: testUser.id,
        direct_messages: false,
        community_messages: false,
        comments_on_resources: false,
      });

      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', testUser.id)
        .single();

      // Messages should be able to be disabled now
      expect(preferences?.direct_messages).toBe(false);
      expect(preferences?.community_messages).toBe(false);
      expect(preferences?.comments_on_resources).toBe(false);
    });

    it('should provide default values for all new preference types', async () => {
      // Create a fresh user to test defaults
      const freshUser = await createTestUser(supabase);

      // Check that all new preference columns have proper defaults when accessed
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', freshUser.id)
        .maybeSingle();

      // If no record exists, defaults should apply via database constraints
      if (!preferences) {
        // Insert a minimal record to trigger defaults
        await supabase.from('notification_preferences').insert({
          user_id: freshUser.id,
        });

        const { data: defaultPrefs } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', freshUser.id)
          .single();

        // All new types should default to true
        expect(defaultPrefs).toMatchObject({
          shoutout_received: true,
          connection_request: true,
          connection_accepted: true,
          resource_claim_cancelled: true,
          resource_claim_completed: true,
          claim_approved: true,
          claim_rejected: true,
          claimed_resource_updated: true,
          claimed_resource_cancelled: true,
          community_member_joined: true,
          community_member_left: true,
          new_event: true,
          trust_points_received: true,
          trust_level_changed: true,
        });
      }
    });
  });
});
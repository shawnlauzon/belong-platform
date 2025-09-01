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
        new_messages: true,
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
        new_messages: true,
        community_resources: true,
      });
    });

    it('should create default preferences for new users', async () => {
      // Check that the user has default preferences
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('*')
        .single();

      expect(preferences).toMatchObject({
        comments_on_resources: true,
        comment_replies: true,
        resource_claims: true,
        new_messages: true,
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
        new_messages: true,
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
        new_messages: true,
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
        new_messages: true,
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
        new_messages: true,
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
        new_messages: true,
        community_resources: true,
        email_enabled: false,
        push_enabled: false,
      });
    });
  });
});
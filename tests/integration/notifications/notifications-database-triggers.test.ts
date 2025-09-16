import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  createTestResourceTimeslot,
} from '../helpers/test-data';
import { createComment } from '@/features/comments';
import { createResourceClaim } from '@/features/resources/api';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import { createShoutout } from '@/features/shoutouts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';

describe('Database triggers', () => {
  let supabase: SupabaseClient<Database>;
  let resourceOwner: Account;
  let testCommunity: Community;
  let communityMember: Account;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test users and community
    resourceOwner = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create another user and join community
    communityMember = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Sign in as resource owner for consistency
    await signIn(supabase, resourceOwner.email, 'TestPass123!');

    // Ensure profiles exist for both users (workaround for profile trigger timing issues)
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('id')
      .in('id', [resourceOwner.id, communityMember.id]);

    const existingProfileIds = existingProfiles?.map((p) => p.id) || [];

    if (!existingProfileIds.includes(resourceOwner.id)) {
      await supabase.from('profiles').insert({
        id: resourceOwner.id,
        email: resourceOwner.email,
        user_metadata: { first_name: 'test_resource_owner' },
        notification_preferences: {
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
        },
      });
    }

    if (!existingProfileIds.includes(communityMember.id)) {
      await supabase.from('profiles').insert({
        id: communityMember.id,
        email: communityMember.email,
        user_metadata: { first_name: 'test_community_member' },
        notification_preferences: {
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
        },
      });
    }
  });

  it('should create notification record via database trigger when someone comments', async () => {
    // Create a resource as resourceOwner
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    // Sign in as communityMember and create comment
    await signIn(supabase, communityMember.email, 'TestPass123!');

    let comment;
    try {
      comment = await createComment(supabase, {
        content: 'Test comment that should trigger notification',
        resourceId: resource.id,
      });
      console.log('Comment created successfully:', comment.id);
    } catch (error) {
      console.error('Failed to create comment:', error);
      throw error;
    }

    // Query database directly to verify trigger created notification
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', resourceOwner.id)
      .eq('type', 'comment')
      .eq('resource_id', resource.id)
      .eq('actor_id', communityMember.id);

    expect(error).toBeNull();
    expect(notifications).toBeDefined();
    expect(notifications!.length).toBe(1);

    const notification = notifications![0];
    expect(notification).toMatchObject({
      type: 'comment',
      resource_id: resource.id,
      comment_id: comment.id,
      community_id: testCommunity.id,
      actor_id: communityMember.id,
      user_id: resourceOwner.id,
      is_read: false,
    });
  });

  it('should create notification record via database trigger when someone claims resource', async () => {
    // Create a resource with timeslot as resourceOwner
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );
    const timeslot = await createTestResourceTimeslot(supabase, resource.id);

    // Sign in as communityMember and create claim
    await signIn(supabase, communityMember.email, 'TestPass123!');
    const claim = await createResourceClaim(supabase, {
      resourceId: resource.id,
      timeslotId: timeslot.id,
      notes: 'Test claim that should trigger notification',
    });

    // Query database directly to verify trigger created notification
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', resourceOwner.id)
      .eq('type', 'claim')
      .eq('resource_id', resource.id)
      .eq('actor_id', communityMember.id);

    expect(error).toBeNull();
    expect(notifications).toBeDefined();
    expect(notifications!.length).toBe(1);

    const notification = notifications![0];
    expect(notification).toMatchObject({
      type: 'claim',
      resource_id: resource.id,
      claim_id: claim.id,
      community_id: testCommunity.id,
      actor_id: communityMember.id,
      user_id: resourceOwner.id,
      is_read: false,
    });
  });

  it('should create notification record via database trigger when someone gives shoutout', async () => {
    // Create a resource for the shoutout context
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    // Sign in as communityMember and create shoutout to resourceOwner
    await signIn(supabase, communityMember.email, 'TestPass123!');
    const shoutout = await createShoutout(supabase, {
      receiverId: resourceOwner.id,
      message: 'Great community member!',
      resourceId: resource.id,
      communityId: testCommunity.id,
    });

    // Query database directly to verify trigger created notification
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', resourceOwner.id)
      .eq('type', 'shoutout_received')
      .eq('actor_id', communityMember.id);

    expect(error).toBeNull();
    expect(notifications).toBeDefined();
    expect(notifications!.length).toBe(1);

    const notification = notifications![0];
    expect(notification).toMatchObject({
      type: 'shoutout_received',
      shoutout_id: shoutout.id,
      community_id: testCommunity.id,
      actor_id: communityMember.id,
      user_id: resourceOwner.id,
      is_read: false,
    });
  });

  it('should create notification record via database trigger when new resource is added to community', async () => {
    // Sign in as communityMember and create a resource
    await signIn(supabase, communityMember.email, 'TestPass123!');
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'request',
    );

    // Query database directly to verify trigger created notification for resourceOwner
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', resourceOwner.id)
      .eq('type', 'new_resource')
      .eq('resource_id', resource.id)
      .eq('actor_id', communityMember.id);

    expect(error).toBeNull();
    expect(notifications).toBeDefined();
    expect(notifications!.length).toBe(1);

    const notification = notifications![0];
    expect(notification).toMatchObject({
      type: 'new_resource',
      resource_id: resource.id,
      community_id: testCommunity.id,
      actor_id: communityMember.id,
      user_id: resourceOwner.id,
      is_read: false,
    });
  });

  it('should not create notification via trigger when user performs action on own content', async () => {
    // Create a resource as resourceOwner
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    // Comment on own resource (should NOT trigger notification)
    await createComment(supabase, {
      content: 'This is my own comment',
      resourceId: resource.id,
    });

    // Query database to verify no notification was created
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', resourceOwner.id)
      .eq('type', 'comment')
      .eq('resource_id', resource.id)
      .eq('actor_id', resourceOwner.id);

    expect(error).toBeNull();
    expect(notifications).toBeDefined();
    expect(notifications!.length).toBe(0);
  });

  it('should reflect notification count changes when notifications are created', async () => {
    // Import the API function to get counts
    const { fetchNotificationCount } = await import('@/features/notifications');

    // Get initial counts
    const initialTotal = await fetchNotificationCount(supabase);

    // Create a resource and have communityMember comment on it
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    await signIn(supabase, communityMember.email, 'TestPass123!');
    await createComment(supabase, {
      content: 'Comment that should increment counts',
      resourceId: resource.id,
    });

    // Switch back to resourceOwner and check that count increased
    await signIn(supabase, resourceOwner.email, 'TestPass123!');
    const updatedTotal = await fetchNotificationCount(supabase);

    expect(updatedTotal).toBeGreaterThan(initialTotal);
  });
});

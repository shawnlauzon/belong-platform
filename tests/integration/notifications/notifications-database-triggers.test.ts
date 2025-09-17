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
import { NOTIFICATION_TYPES } from '@/features/notifications/constants';
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

    await signIn(supabase, resourceOwner.email, 'TestPass123!');

    // Query database directly to verify trigger created notification
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', resourceOwner.id)
      .eq('type', NOTIFICATION_TYPES.COMMENT)
      .eq('resource_id', resource.id)
      .eq('actor_id', communityMember.id);

    expect(error).toBeNull();
    expect(notifications).toBeDefined();
    expect(notifications!.length).toBe(1);

    const notification = notifications![0];
    expect(notification).toMatchObject({
      type: NOTIFICATION_TYPES.COMMENT,
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

    await signIn(supabase, resourceOwner.email, 'TestPass123!');

    // Query database directly to verify trigger created notification
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', resourceOwner.id)
      .eq('type', NOTIFICATION_TYPES.CLAIM)
      .eq('resource_id', resource.id)
      .eq('actor_id', communityMember.id);

    expect(error).toBeNull();
    expect(notifications).toBeDefined();
    expect(notifications!.length).toBe(1);

    const notification = notifications![0];
    expect(notification).toMatchObject({
      type: NOTIFICATION_TYPES.CLAIM,
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

    await signIn(supabase, resourceOwner.email, 'TestPass123!');

    // Query database directly to verify trigger created notification
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', resourceOwner.id)
      .eq('type', NOTIFICATION_TYPES.SHOUTOUT_RECEIVED)
      .eq('actor_id', communityMember.id);

    expect(error).toBeNull();
    expect(notifications).toBeDefined();
    expect(notifications!.length).toBe(1);

    const notification = notifications![0];
    expect(notification).toMatchObject({
      type: NOTIFICATION_TYPES.SHOUTOUT_RECEIVED,
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

    await signIn(supabase, resourceOwner.email, 'TestPass123!');

    // Query database directly to verify trigger created notification for resourceOwner
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', resourceOwner.id)
      .eq('type', NOTIFICATION_TYPES.NEW_RESOURCE)
      .eq('resource_id', resource.id)
      .eq('actor_id', communityMember.id);

    expect(error).toBeNull();
    expect(notifications).toBeDefined();
    expect(notifications!.length).toBe(1);

    const notification = notifications![0];
    expect(notification).toMatchObject({
      type: NOTIFICATION_TYPES.NEW_RESOURCE,
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

    await signIn(supabase, resourceOwner.email, 'TestPass123!');

    // Query database to verify no notification was created
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', resourceOwner.id)
      .eq('type', NOTIFICATION_TYPES.COMMENT)
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

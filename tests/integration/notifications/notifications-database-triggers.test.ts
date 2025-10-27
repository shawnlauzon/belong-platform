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
import { createShoutout } from '@/features/shoutouts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';
import { fetchNotificationUnreadCount } from '@/features/notifications/api';

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
    await joinCommunity(supabase, communityMember.id, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Sign in as resource owner for consistency
    await signInAsUser(supabase, resourceOwner);
  });

  it('should create notification record via database trigger when someone comments', async () => {
    // Create a resource as resourceOwner
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    // Sign in as communityMember and create comment
    await signInAsUser(supabase, communityMember);

    let comment;
    try {
      comment = await createComment(supabase, communityMember.id, {
        content: 'Test comment that should trigger notification',
        resourceId: resource.id,
      });
      console.log('Comment created successfully:', comment.id);
    } catch (error) {
      console.error('Failed to create comment:', error);
      throw error;
    }

    await signInAsUser(supabase, resourceOwner);

    // Query database directly to verify trigger created notification
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', resourceOwner.id)
      .eq('type', 'resource.commented')
      .eq('resource_id', resource.id)
      .eq('actor_id', communityMember.id);

    expect(error).toBeNull();
    expect(notifications).toBeDefined();
    expect(notifications!.length).toBe(1);

    const notification = notifications![0];
    expect(notification).toMatchObject({
      type: 'resource.commented',
      resource_id: resource.id,
      comment_id: comment.id,
      community_id: testCommunity.id,
      actor_id: communityMember.id,
      user_id: resourceOwner.id,
      read_at: null,
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
    await signInAsUser(supabase, communityMember);
    const claim = await createResourceClaim(supabase, {
      resourceId: resource.id,
      timeslotId: timeslot.id,
      requestText: 'Test claim that should trigger notification',
    });

    await signInAsUser(supabase, resourceOwner);

    // Query database directly to verify trigger created notification
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', resourceOwner.id)
      .eq('type', 'claim.created')
      .eq('resource_id', resource.id)
      .eq('actor_id', communityMember.id);

    expect(error).toBeNull();
    expect(notifications).toBeDefined();
    expect(notifications!.length).toBe(1);

    const notification = notifications![0];
    expect(notification).toMatchObject({
      type: 'claim.created',
      resource_id: resource.id,
      claim_id: claim.id,
      community_id: testCommunity.id,
      actor_id: communityMember.id,
      user_id: resourceOwner.id,
      read_at: null,
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
    await signInAsUser(supabase, communityMember);
    const shoutout = await createShoutout(supabase, communityMember.id, {
      message: 'Great community member!',
      resourceId: resource.id,
    });

    await signInAsUser(supabase, resourceOwner);

    // Query database directly to verify trigger created notification
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', resourceOwner.id)
      .eq('type', 'shoutout.received')
      .eq('actor_id', communityMember.id);

    expect(error).toBeNull();
    expect(notifications).toBeDefined();
    expect(notifications!.length).toBe(1);

    const notification = notifications![0];
    expect(notification).toMatchObject({
      type: 'shoutout.received',
      shoutout_id: shoutout.id,
      community_id: testCommunity.id,
      actor_id: communityMember.id,
      user_id: resourceOwner.id,
      read_at: null,
    });
  });

  it('should create notification record via database trigger when new resource is added to community', async () => {
    // Sign in as communityMember and create a resource
    await signInAsUser(supabase, communityMember);
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'request',
    );

    await signInAsUser(supabase, resourceOwner);

    // Query database directly to verify trigger created notification for resourceOwner
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', resourceOwner.id)
      .eq('type', 'resource.created')
      .eq('resource_id', resource.id)
      .eq('actor_id', communityMember.id);

    expect(error).toBeNull();
    expect(notifications).toBeDefined();
    expect(notifications!.length).toBe(1);

    const notification = notifications![0];
    expect(notification).toMatchObject({
      type: 'resource.created',
      resource_id: resource.id,
      community_id: testCommunity.id,
      actor_id: communityMember.id,
      user_id: resourceOwner.id,
      read_at: null,
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
    await createComment(supabase, resourceOwner.id, {
      content: 'This is my own comment',
      resourceId: resource.id,
    });

    await signInAsUser(supabase, resourceOwner);

    // Query database to verify no notification was created
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', resourceOwner.id)
      .eq('type', 'resource.commented')
      .eq('resource_id', resource.id)
      .eq('actor_id', resourceOwner.id);

    expect(error).toBeNull();
    expect(notifications).toBeDefined();
    expect(notifications!.length).toBe(0);
  });

  it('should reflect notification count changes when notifications are created', async () => {
    // Get initial counts
    const initialTotal = await fetchNotificationUnreadCount(
      supabase,
      resourceOwner.id,
    );

    // Create a resource and have communityMember comment on it
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    await signInAsUser(supabase, communityMember);
    await createComment(supabase, communityMember.id, {
      content: 'Comment that should increment counts',
      resourceId: resource.id,
    });

    // Switch back to resourceOwner and check that count increased
    await signInAsUser(supabase, resourceOwner);
    const updatedTotal = await fetchNotificationUnreadCount(
      supabase,
      resourceOwner.id,
    );

    expect(updatedTotal).toBeGreaterThan(initialTotal);
  });
});

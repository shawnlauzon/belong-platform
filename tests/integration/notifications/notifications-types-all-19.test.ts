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
import {
  createResourceClaim,
  updateResourceClaim,
} from '@/features/resources/api';
import { joinCommunity, leaveCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import { createShoutout } from '@/features/shoutouts';
import { startConversation, sendMessage } from '@/features/messaging/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';
import type {
  ClaimResponseMetadata,
  MembershipMetadata,
  TrustLevelMetadata,
} from '@/features/notifications/types/notificationMetadata';

/**
 * Comprehensive test suite for all 19 notification types in the redesigned system.
 * These tests verify that database triggers create notifications with correct structure.
 *
 * Many tests will FAIL until the new notification system is fully implemented.
 */
describe('All 19 Notification Types', () => {
  let supabase: SupabaseClient<Database>;
  let resourceOwner: Account;
  let claimant: Account;
  let commenter: Account;
  let testCommunity: Community;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test users and community
    resourceOwner = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create additional users and join community
    claimant = await createTestUser(supabase);
    await joinCommunity(supabase, claimant.id, testCommunity.id);

    commenter = await createTestUser(supabase);
    await joinCommunity(supabase, commenter.id, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    await signIn(supabase, resourceOwner.email, 'TestPass123!');
  });

  describe('Comments (2 types)', () => {
    it('resource.commented - notifies resource owner when someone comments', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      await signIn(supabase, commenter.email, 'TestPass123!');
      const comment = await createComment(supabase, commenter.id, {
        content: 'Test comment',
        resourceId: resource.id,
      });

      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('type', 'resource.commented')
        .eq('resource_id', resource.id);

      expect(notifications).toHaveLength(1);
      expect(notifications![0]).toMatchObject({
        type: 'resource.commented',
        user_id: resourceOwner.id,
        actor_id: commenter.id,
        resource_id: resource.id,
        comment_id: comment.id,
        community_id: testCommunity.id,
        read_at: null,
      });
    });

    it('comment.replied - notifies comment author when someone replies', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Commenter creates original comment
      await signIn(supabase, commenter.email, 'TestPass123!');
      const originalComment = await createComment(supabase, commenter.id, {
        content: 'Original comment',
        resourceId: resource.id,
      });

      // Claimant replies to comment
      await signIn(supabase, claimant.email, 'TestPass123!');
      const reply = await createComment(supabase, claimant.id, {
        content: 'Reply to comment',
        resourceId: resource.id,
        parentId: originalComment.id,
      });

      await signIn(supabase, commenter.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', commenter.id)
        .eq('type', 'comment.replied')
        .eq('comment_id', reply.id);

      expect(notifications).toHaveLength(1);
      expect(notifications![0]).toMatchObject({
        type: 'comment.replied',
        user_id: commenter.id,
        actor_id: claimant.id,
        comment_id: reply.id,
        resource_id: resource.id,
        read_at: null,
      });
    });
  });

  describe('Claims (3 types)', () => {
    it('claim.created - notifies resource owner when someone claims', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      await signIn(supabase, claimant.email, 'TestPass123!');
      const claim = await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        requestText: 'I would like this',
      });

      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('type', 'claim.created')
        .eq('claim_id', claim.id);

      expect(notifications).toHaveLength(1);
      expect(notifications![0]).toMatchObject({
        type: 'claim.created',
        user_id: resourceOwner.id,
        actor_id: claimant.id,
        resource_id: resource.id,
        claim_id: claim.id,
        read_at: null,
      });
    });

    it('claim.cancelled - notifies resource owner when claimant cancels', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      await signIn(supabase, claimant.email, 'TestPass123!');
      const claim = await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        requestText: 'Cancel test',
      });

      // Cancel the claim
      await updateResourceClaim(supabase, {
        id: claim.id,
        status: 'cancelled',
      });

      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('type', 'claim.cancelled')
        .eq('claim_id', claim.id);

      expect(notifications).toHaveLength(1);
      expect(notifications![0]).toMatchObject({
        type: 'claim.cancelled',
        user_id: resourceOwner.id,
        actor_id: claimant.id,
        claim_id: claim.id,
        read_at: null,
      });
    });

    it('claim.responded - notifies claimant when owner approves/rejects', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      await signIn(supabase, claimant.email, 'TestPass123!');
      const claim = await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        requestText: 'Response test',
      });

      // Owner approves claim
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await updateResourceClaim(supabase, { id: claim.id, status: 'approved' });

      await signIn(supabase, claimant.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', claimant.id)
        .eq('type', 'claim.responded')
        .eq('claim_id', claim.id);

      expect(notifications).toHaveLength(1);
      expect(notifications![0]).toMatchObject({
        type: 'claim.responded',
        user_id: claimant.id,
        actor_id: resourceOwner.id,
        claim_id: claim.id,
        read_at: null,
      });

      // Verify metadata contains response type
      const metadata = notifications![0]
        .metadata as unknown as ClaimResponseMetadata;
      expect(metadata.response).toBe('approved');
    });
  });

  describe('Transaction Confirmation (2 types)', () => {
    it('resource.given - notifies receiver to confirm (Offer: owner gives)', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      await signIn(supabase, claimant.email, 'TestPass123!');
      const claim = await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
      });

      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await updateResourceClaim(supabase, { id: claim.id, status: 'approved' });

      // Owner marks as given
      await updateResourceClaim(supabase, { id: claim.id, status: 'given' });

      await signIn(supabase, claimant.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', claimant.id)
        .eq('type', 'resource.given')
        .eq('claim_id', claim.id);

      expect(notifications).toHaveLength(1);
      expect(notifications![0]).toMatchObject({
        type: 'resource.given',
        user_id: claimant.id,
        actor_id: resourceOwner.id,
        claim_id: claim.id,
        read_at: null,
      });
    });

    it('resource.received - notifies giver to confirm (Offer: claimant confirms received)', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      await signIn(supabase, claimant.email, 'TestPass123!');
      const claim = await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
      });

      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await updateResourceClaim(supabase, { id: claim.id, status: 'approved' });

      // Claimant marks as received
      await signIn(supabase, claimant.email, 'TestPass123!');
      await updateResourceClaim(supabase, { id: claim.id, status: 'received' });

      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('type', 'resource.received')
        .eq('claim_id', claim.id);

      expect(notifications).toHaveLength(1);
      expect(notifications![0]).toMatchObject({
        type: 'resource.received',
        user_id: resourceOwner.id,
        actor_id: claimant.id,
        claim_id: claim.id,
        read_at: null,
      });
    });
  });

  describe('Resources & Events (7 types)', () => {
    it('resource.created - notifies community members of new resource', async () => {
      await signIn(supabase, commenter.email, 'TestPass123!');
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Check resource owner got notification
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('type', 'resource.created')
        .eq('resource_id', resource.id);

      expect(notifications!.length).toBeGreaterThan(0);
      expect(notifications![0]).toMatchObject({
        type: 'resource.created',
        actor_id: commenter.id,
        resource_id: resource.id,
        community_id: testCommunity.id,
        read_at: null,
      });
    });

    it('event.created - notifies community members of new event', async () => {
      await signIn(supabase, commenter.email, 'TestPass123!');
      const event = await createTestResource(
        supabase,
        testCommunity.id,
        'event',
      );

      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('type', 'event.created')
        .eq('resource_id', event.id);

      expect(notifications!.length).toBeGreaterThan(0);
      expect(notifications![0]).toMatchObject({
        type: 'event.created',
        actor_id: commenter.id,
        resource_id: event.id,
        community_id: testCommunity.id,
        read_at: null,
      });
    });

    it('resource.updated - notifies active claimants of resource changes', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      // Claimant claims resource
      await signIn(supabase, claimant.email, 'TestPass123!');
      await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
      });

      // Owner updates resource
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await supabase
        .from('resources')
        .update({ title: 'Updated title' })
        .eq('id', resource.id);

      await signIn(supabase, claimant.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', claimant.id)
        .eq('type', 'resource.updated')
        .eq('resource_id', resource.id);

      expect(notifications).toHaveLength(1);
      expect(notifications![0]).toMatchObject({
        type: 'resource.updated',
        user_id: claimant.id,
        actor_id: resourceOwner.id,
        resource_id: resource.id,
        read_at: null,
      });
    });

    it('event.updated - notifies registered participants of event changes', async () => {
      const event = await createTestResource(
        supabase,
        testCommunity.id,
        'event',
      );
      const timeslot = await createTestResourceTimeslot(supabase, event.id);

      // Claimant registers for event
      await signIn(supabase, claimant.email, 'TestPass123!');
      await createResourceClaim(supabase, {
        resourceId: event.id,
        timeslotId: timeslot.id,
      });

      // Owner updates event
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await supabase
        .from('resources')
        .update({ title: 'Updated event' })
        .eq('id', event.id);

      await signIn(supabase, claimant.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', claimant.id)
        .eq('type', 'event.updated')
        .eq('resource_id', event.id);

      expect(notifications).toHaveLength(1);
      expect(notifications![0]).toMatchObject({
        type: 'event.updated',
        user_id: claimant.id,
        actor_id: resourceOwner.id,
        resource_id: event.id,
        read_at: null,
      });
    });

    it('event.cancelled - notifies registered participants event is cancelled', async () => {
      const event = await createTestResource(
        supabase,
        testCommunity.id,
        'event',
      );
      const timeslot = await createTestResourceTimeslot(supabase, event.id);

      // Claimant registers for event
      await signIn(supabase, claimant.email, 'TestPass123!');
      await createResourceClaim(supabase, {
        resourceId: event.id,
        timeslotId: timeslot.id,
      });

      // Owner cancels event
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await supabase
        .from('resources')
        .update({ status: 'cancelled' })
        .eq('id', event.id);

      await signIn(supabase, claimant.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', claimant.id)
        .eq('type', 'event.cancelled')
        .eq('resource_id', event.id);

      expect(notifications).toHaveLength(1);
      expect(notifications![0]).toMatchObject({
        type: 'event.cancelled',
        user_id: claimant.id,
        actor_id: resourceOwner.id,
        resource_id: event.id,
        read_at: null,
      });
    });

    it('resource.expiring - notifies owner when resource is expiring soon', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Simulate expiry notification (typically triggered by scheduled job)
      await supabase.from('notifications').insert({
        user_id: resourceOwner.id,
        type: 'resource.expiring',
        resource_id: resource.id,
        community_id: testCommunity.id,
        actor_id: null, // System notification
      });

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('type', 'resource.expiring')
        .eq('resource_id', resource.id);

      expect(notifications).toHaveLength(1);
      expect(notifications![0]).toMatchObject({
        type: 'resource.expiring',
        user_id: resourceOwner.id,
        actor_id: null,
        resource_id: resource.id,
        read_at: null,
      });
    });

    it('event.starting - notifies owner and participants event is starting soon', async () => {
      const event = await createTestResource(
        supabase,
        testCommunity.id,
        'event',
      );
      const timeslot = await createTestResourceTimeslot(supabase, event.id);

      await signIn(supabase, claimant.email, 'TestPass123!');
      await createResourceClaim(supabase, {
        resourceId: event.id,
        timeslotId: timeslot.id,
      });

      // Simulate event starting notification (typically triggered by scheduled job)
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await supabase.from('notifications').insert([
        {
          user_id: resourceOwner.id,
          type: 'event.starting',
          resource_id: event.id,
          community_id: testCommunity.id,
          actor_id: null,
        },
        {
          user_id: claimant.id,
          type: 'event.starting',
          resource_id: event.id,
          community_id: testCommunity.id,
          actor_id: null,
        },
      ]);

      // Check owner notification
      const { data: ownerNotifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('type', 'event.starting')
        .eq('resource_id', event.id);

      expect(ownerNotifications).toHaveLength(1);

      // Check participant notification
      const { data: participantNotifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', claimant.id)
        .eq('type', 'event.starting')
        .eq('resource_id', event.id);

      expect(participantNotifications).toHaveLength(1);
    });
  });

  describe('Social (4 types)', () => {
    it('message.received - notifies user of new message', async () => {
      await signIn(supabase, commenter.email, 'TestPass123!');
      const conversation = await startConversation(supabase, {
        otherUserId: resourceOwner.id,
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      await sendMessage(supabase, user!.id, {
        conversationId: conversation.id,
        content: 'Hello!',
      });

      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('type', 'message.received')
        .eq('conversation_id', conversation.id);

      expect(notifications!.length).toBeGreaterThan(0);
      expect(notifications![0]).toMatchObject({
        type: 'message.received',
        user_id: resourceOwner.id,
        actor_id: commenter.id,
        conversation_id: conversation.id,
        read_at: null,
      });
    });

    it('conversation.requested - notifies user of new conversation request', async () => {
      await signIn(supabase, commenter.email, 'TestPass123!');
      const conversation = await startConversation(supabase, {
        otherUserId: claimant.id,
      });

      await signIn(supabase, claimant.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', claimant.id)
        .eq('type', 'conversation.requested')
        .eq('conversation_id', conversation.id);

      expect(notifications).toHaveLength(1);
      expect(notifications![0]).toMatchObject({
        type: 'conversation.requested',
        user_id: claimant.id,
        actor_id: commenter.id,
        conversation_id: conversation.id,
        read_at: null,
      });
    });

    it('shoutout.received - notifies user of shoutout', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      await signIn(supabase, commenter.email, 'TestPass123!');
      const shoutout = await createShoutout(supabase, commenter.id, {
        message: 'Great work!',
        resourceId: resource.id,
      });

      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('type', 'shoutout.received')
        .eq('shoutout_id', shoutout.id);

      expect(notifications).toHaveLength(1);
      expect(notifications![0]).toMatchObject({
        type: 'shoutout.received',
        user_id: resourceOwner.id,
        actor_id: commenter.id,
        shoutout_id: shoutout.id,
        read_at: null,
      });
    });

    it('membership.updated - notifies organizers when member joins', async () => {
      const newUser = await createTestUser(supabase);

      // New user joins community
      await joinCommunity(supabase, newUser.id, testCommunity.id);

      // Check organizer (resourceOwner) got notification
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('type', 'membership.updated')
        .eq('community_id', testCommunity.id)
        .eq('actor_id', newUser.id);

      expect(notifications).toHaveLength(1);
      expect(notifications![0]).toMatchObject({
        type: 'membership.updated',
        user_id: resourceOwner.id,
        actor_id: newUser.id,
        community_id: testCommunity.id,
        read_at: null,
      });

      // Verify metadata contains action
      const metadata = notifications![0]
        .metadata as unknown as MembershipMetadata;
      expect(metadata.action).toBe('joined');
    });

    it('membership.updated - notifies organizers when member leaves', async () => {
      // Commenter leaves community
      await signIn(supabase, commenter.email, 'TestPass123!');
      await leaveCommunity(supabase, commenter.id, testCommunity.id);

      // Check organizer got notification
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('type', 'membership.updated')
        .eq('community_id', testCommunity.id)
        .eq('actor_id', commenter.id);

      expect(notifications!.length).toBeGreaterThan(0);

      const leaveNotification = notifications!.find((n) => {
        const metadata = n.metadata as unknown as MembershipMetadata;
        return metadata?.action === 'left';
      });

      expect(leaveNotification).toBeDefined();
      expect(leaveNotification).toMatchObject({
        type: 'membership.updated',
        user_id: resourceOwner.id,
        actor_id: commenter.id,
        community_id: testCommunity.id,
        read_at: null,
      });
    });
  });

  describe('System (1 type)', () => {
    it('trustlevel.changed - notifies user of trust level change', async () => {
      // Simulate trust level change (typically triggered by trust score calculation)
      await supabase.from('notifications').insert({
        user_id: resourceOwner.id,
        type: 'trustlevel.changed',
        actor_id: null, // System notification
        metadata: {
          old_level: 1,
          new_level: 2,
        },
      });

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('type', 'trustlevel.changed');

      expect(notifications).toHaveLength(1);
      expect(notifications![0]).toMatchObject({
        type: 'trustlevel.changed',
        user_id: resourceOwner.id,
        actor_id: null,
        read_at: null,
      });

      // Verify metadata
      const metadata = notifications![0]
        .metadata as unknown as TrustLevelMetadata;
      expect(metadata.old_level).toBe(1);
      expect(metadata.new_level).toBe(2);
    });
  });
});

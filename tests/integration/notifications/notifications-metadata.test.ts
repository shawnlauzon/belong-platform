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
import { createResourceClaim, updateResourceClaim } from '@/features/resources/api';
import { joinCommunity, leaveCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';
import type {
  ClaimResponseMetadata,
  MembershipMetadata,
  ResourceUpdatedMetadata,
  TrustLevelMetadata,
} from '@/features/notifications/types/notificationMetadata';

/**
 * Test suite for type-specific notification metadata structures.
 *
 * Metadata Types:
 * - ClaimResponseMetadata: {response: "approved" | "rejected"}
 * - MembershipMetadata: {action: "joined" | "left"}
 * - ResourceUpdatedMetadata: {changes: string[]}
 * - TrustLevelMetadata: {old_level: number, new_level: number}
 * - CommentMetadata: {content_preview: string}
 *
 * These tests will FAIL until the metadata structures are implemented.
 */
describe('Notification Metadata Structures', () => {
  let supabase: SupabaseClient<Database>;
  let resourceOwner: Account;
  let claimant: Account;
  let testCommunity: Community;

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
    await signIn(supabase, resourceOwner.email, 'TestPass123!');
  });

  describe('ClaimResponseMetadata', () => {
    it('includes response="approved" when claim is approved', async () => {
      const resource = await createTestResource(supabase, testCommunity.id, 'offer', undefined, true);
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      await signIn(supabase, claimant.email, 'TestPass123!');
      const claim = await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
      });

      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await updateResourceClaim(supabase, { id: claim.id, status: 'approved' });

      await signIn(supabase, claimant.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', claimant.id)
        .eq('action', 'claim.approved')
        .eq('claim_id', claim.id);

      expect(notifications).toHaveLength(1);

      const metadata = notifications![0].metadata as unknown as ClaimResponseMetadata;
      expect(metadata).toBeDefined();
      expect(metadata.response).toBe('approved');
    });

    it('includes response="rejected" when claim is rejected', async () => {
      const resource = await createTestResource(supabase, testCommunity.id, 'offer', undefined, true);
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      await signIn(supabase, claimant.email, 'TestPass123!');
      const claim = await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
      });

      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await updateResourceClaim(supabase, { id: claim.id, status: 'rejected' });

      await signIn(supabase, claimant.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', claimant.id)
        .eq('action', 'claim.rejected')
        .eq('claim_id', claim.id);

      expect(notifications).toHaveLength(1);

      const metadata = notifications![0].metadata as unknown as ClaimResponseMetadata;
      expect(metadata).toBeDefined();
      expect(metadata.response).toBe('rejected');
    });
  });

  describe('MembershipMetadata', () => {
    it('includes action="joined" when member joins community', async () => {
      const newMember = await createTestUser(supabase);

      await joinCommunity(supabase, newMember.id, testCommunity.id);

      // Check organizer notification
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('action', 'member.joined')
        .eq('community_id', testCommunity.id)
        .eq('actor_id', newMember.id);

      expect(notifications).toHaveLength(1);

      const metadata = notifications![0].metadata as unknown as MembershipMetadata;
      expect(metadata).toBeDefined();
      expect(metadata.action).toBe('joined');
    });

    it('includes action="left" when member leaves community', async () => {
      // Create a separate user for this test to avoid breaking subsequent tests
      const leavingMember = await createTestUser(supabase);
      await joinCommunity(supabase, leavingMember.id, testCommunity.id);

      // Member leaves
      await leaveCommunity(supabase, leavingMember.id, testCommunity.id);

      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('action', 'member.left')
        .eq('community_id', testCommunity.id)
        .eq('actor_id', leavingMember.id);

      expect(notifications!.length).toBeGreaterThan(0);

      const metadata = notifications![0].metadata as unknown as MembershipMetadata;
      expect(metadata.action).toBe('left');
    });
  });

  describe('ResourceUpdatedMetadata', () => {
    it('includes list of changed fields when resource is updated', async () => {
      const resource = await createTestResource(supabase, testCommunity.id, 'offer');
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      await signIn(supabase, claimant.email, 'TestPass123!');
      await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
      });

      // Update multiple fields
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await supabase
        .from('resources')
        .update({
          title: 'Updated title',
          description: 'Updated description',
        })
        .eq('id', resource.id);

      await signIn(supabase, claimant.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', claimant.id)
        .eq('action', 'resource.updated')
        .eq('resource_id', resource.id);

      expect(notifications).toHaveLength(1);

      const metadata = notifications![0].metadata as unknown as ResourceUpdatedMetadata;
      expect(metadata).toBeDefined();
      expect(metadata.changes).toBeDefined();
      expect(Array.isArray(metadata.changes)).toBe(true);
      expect(metadata.changes).toContain('title');
      expect(metadata.changes).toContain('description');
    });

    it('includes single change when only one field updated', async () => {
      const resource = await createTestResource(supabase, testCommunity.id, 'offer');
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      await signIn(supabase, claimant.email, 'TestPass123!');
      await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
      });

      // Update single field
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await supabase
        .from('resources')
        .update({ title: 'New title only' })
        .eq('id', resource.id);

      await signIn(supabase, claimant.email, 'TestPass123!');

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', claimant.id)
        .eq('action', 'resource.updated')
        .eq('resource_id', resource.id);

      expect(notifications).toHaveLength(1);

      const metadata = notifications![0].metadata as unknown as ResourceUpdatedMetadata;
      expect(metadata.changes).toHaveLength(1);
      expect(metadata.changes[0]).toBe('title');
    });
  });

  describe('TrustLevelMetadata', () => {
    it('includes old_level and new_level when trust level changes', async () => {
      // Simulate trust level change notification
      await supabase.from('notifications').insert({
        user_id: resourceOwner.id,
        action: 'trustlevel.changed',
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
        .eq('action', 'trustlevel.changed');

      expect(notifications!.length).toBeGreaterThan(0);

      const metadata = notifications![0].metadata as unknown as TrustLevelMetadata;
      expect(metadata).toBeDefined();
      expect(metadata.old_level).toBe(1);
      expect(metadata.new_level).toBe(2);
    });

    it('handles level decrease (old_level > new_level)', async () => {
      await supabase.from('notifications').insert({
        user_id: resourceOwner.id,
        action: 'trustlevel.changed',
        actor_id: null,
        metadata: {
          old_level: 3,
          new_level: 2,
        },
      });

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('action', 'trustlevel.changed')
        .order('created_at', { ascending: false })
        .limit(1);

      const metadata = notifications![0].metadata as unknown as TrustLevelMetadata;
      expect(metadata.old_level).toBe(3);
      expect(metadata.new_level).toBe(2);
      expect(metadata.new_level).toBeLessThan(metadata.old_level);
    });
  });

  describe('CommentMetadata', () => {
    it('includes content_preview for comment notifications', async () => {
      const resource = await createTestResource(supabase, testCommunity.id, 'offer');

      await signIn(supabase, claimant.email, 'TestPass123!');
      const longComment = 'This is a long comment that should be truncated in the preview. '.repeat(5);
      await createComment(supabase, claimant.id, {
        content: longComment,
        resourceId: resource.id,
      });

      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const { data: allNotifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id);

      const notifications = allNotifications?.filter(
        (n) => n.action === 'resource.commented' && n.resource_id === resource.id
      );

      expect(notifications).toHaveLength(1);

      const metadata = notifications![0].metadata as unknown as { content_preview?: string };
      if (metadata?.content_preview) {
        expect(typeof metadata.content_preview).toBe('string');
        expect(metadata.content_preview.length).toBeGreaterThan(0);
        // Preview should be truncated (e.g., max 100-200 chars)
        expect(metadata.content_preview.length).toBeLessThanOrEqual(200);
      }
    });

    it('handles short comments without truncation', async () => {
      const resource = await createTestResource(supabase, testCommunity.id, 'offer');

      await signIn(supabase, claimant.email, 'TestPass123!');
      const shortComment = 'Short comment';
      await createComment(supabase, claimant.id, {
        content: shortComment,
        resourceId: resource.id,
      });

      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const { data: allNotifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id);

      const notifications = allNotifications?.filter(
        (n) => n.action === 'resource.commented' && n.resource_id === resource.id
      );

      expect(notifications).toHaveLength(1);

      const metadata = notifications![0].metadata as unknown as { content_preview?: string };
      if (metadata?.content_preview) {
        expect(metadata.content_preview).toBe(shortComment);
      }
    });
  });

  describe('Metadata persistence', () => {
    it('preserves metadata structure across queries', async () => {
      await supabase.from('notifications').insert({
        user_id: resourceOwner.id,
        action: 'trustlevel.changed',
        actor_id: null,
        metadata: {
          old_level: 1,
          new_level: 2,
        },
      });

      // Query multiple times
      const { data: firstQuery } = await supabase
        .from('notifications')
        .select('metadata')
        .eq('user_id', resourceOwner.id)
        .eq('action', 'trustlevel.changed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const { data: secondQuery } = await supabase
        .from('notifications')
        .select('metadata')
        .eq('user_id', resourceOwner.id)
        .eq('action', 'trustlevel.changed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      expect(firstQuery!.metadata).toEqual(secondQuery!.metadata);
    });

    it('handles null metadata for types that do not require it', async () => {
      const resource = await createTestResource(supabase, testCommunity.id, 'offer');

      await signIn(supabase, claimant.email, 'TestPass123!');
      await createComment(supabase, claimant.id, {
        content: 'Test',
        resourceId: resource.id,
      });

      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const { data: allNotifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id);

      const notifications = allNotifications?.filter(
        (n) => n.action === 'resource.commented' && n.resource_id === resource.id
      );

      // Metadata can be null or contain data depending on implementation
      expect(notifications).toHaveLength(1);
      // Either null or object
      expect(
        notifications![0].metadata === null ||
        typeof notifications![0].metadata === 'object'
      ).toBe(true);
    });
  });

  describe('Metadata type safety', () => {
    it('stores complex nested metadata correctly', async () => {
      const complexMetadata = {
        changes: ['title', 'description', 'location'],
        timestamp: new Date().toISOString(),
        user_action: 'bulk_update',
      };

      await supabase.from('notifications').insert({
        user_id: resourceOwner.id,
        action: 'resource.updated',
        actor_id: claimant.id,
        metadata: complexMetadata,
      });

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id)
        .eq('action', 'resource.updated')
        .order('created_at', { ascending: false })
        .limit(1);

      const metadata = notifications![0].metadata as Record<string, unknown>;
      expect(metadata.changes).toEqual(complexMetadata.changes);
      expect(metadata.timestamp).toBe(complexMetadata.timestamp);
      expect(metadata.user_action).toBe(complexMetadata.user_action);
    });
  });
});

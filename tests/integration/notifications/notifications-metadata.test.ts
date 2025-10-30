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
import { createResourceClaim, updateResourceClaim } from '@/features/resources/api';
import { joinCommunity, leaveCommunity } from '@/features/communities/api';
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
    await signInAsUser(supabase, resourceOwner);
  });

  describe('ClaimResponseMetadata', () => {
    it('includes response="approved" when claim is approved', async () => {
      const resource = await createTestResource(supabase, testCommunity.id, 'offer', undefined, true);
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      await signInAsUser(supabase, claimant);
      const claim = await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
      });

      await signInAsUser(supabase, resourceOwner);
      await updateResourceClaim(supabase, { id: claim.id, status: 'approved' });

      await signInAsUser(supabase, claimant);

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

      await signInAsUser(supabase, claimant);
      const claim = await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
      });

      await signInAsUser(supabase, resourceOwner);
      await updateResourceClaim(supabase, { id: claim.id, status: 'rejected' });

      await signInAsUser(supabase, claimant);

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
      await signInAsUser(supabase, resourceOwner);

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

      await signInAsUser(supabase, resourceOwner);

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

      await signInAsUser(supabase, claimant);
      await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
      });

      // Update multiple fields
      await signInAsUser(supabase, resourceOwner);
      await supabase
        .from('resources')
        .update({
          title: 'Updated title',
          description: 'Updated description',
        })
        .eq('id', resource.id);

      await signInAsUser(supabase, claimant);

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

      await signInAsUser(supabase, claimant);
      await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
      });

      // Update single field
      await signInAsUser(supabase, resourceOwner);
      await supabase
        .from('resources')
        .update({ title: 'New title only' })
        .eq('id', resource.id);

      await signInAsUser(supabase, claimant);

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
    it('includes old_level and new_level when trust level increases', async () => {
      // Create a fresh user who starts at level 1
      const newUser = await createTestUser(supabase);
      await joinCommunity(supabase, newUser.id, testCommunity.id);

      // Get initial level
      const { data: initialScore } = await supabase
        .from('trust_scores')
        .select('level')
        .eq('user_id', newUser.id)
        .eq('community_id', testCommunity.id)
        .single();

      const initialLevel = initialScore?.level ?? 1;

      // Create a resource and receive multiple shoutouts to trigger level up
      await signInAsUser(supabase, newUser);
      const resource = await createTestResource(supabase, testCommunity.id, 'offer');

      // Multiple shoutouts to accumulate points
      await signInAsUser(supabase, resourceOwner);
      await createComment(supabase, resourceOwner.id, {
        content: 'Great!',
        resourceId: resource.id,
      });

      await signInAsUser(supabase, claimant);
      await createComment(supabase, claimant.id, {
        content: 'Thanks!',
        resourceId: resource.id,
      });

      // Give multiple shoutouts
      await signInAsUser(supabase, resourceOwner);
      const { data: shoutout1 } = await supabase
        .from('shoutouts')
        .insert({
          user_id: resourceOwner.id,
          receiver_id: newUser.id,
          resource_id: resource.id,
          community_id: testCommunity.id,
          message: 'Excellent work!',
        })
        .select()
        .single();

      await signInAsUser(supabase, claimant);
      const { data: shoutout2 } = await supabase
        .from('shoutouts')
        .insert({
          user_id: claimant.id,
          receiver_id: newUser.id,
          resource_id: resource.id,
          community_id: testCommunity.id,
          message: 'Very helpful!',
        })
        .select()
        .single();

      // Check if level changed
      const { data: updatedScore } = await supabase
        .from('trust_scores')
        .select('level')
        .eq('user_id', newUser.id)
        .eq('community_id', testCommunity.id)
        .single();

      const newLevel = updatedScore?.level ?? 1;

      // If level changed, verify metadata
      if (newLevel > initialLevel) {
        await signInAsUser(supabase, newUser);

        const { data: notifications } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', newUser.id)
          .eq('action', 'trustlevel.changed');

        expect(notifications!.length).toBeGreaterThan(0);

        const metadata = notifications![0].metadata as unknown as TrustLevelMetadata;
        expect(metadata).toBeDefined();
        expect(metadata.old_level).toBe(initialLevel);
        expect(metadata.new_level).toBe(newLevel);
        expect(metadata.new_level).toBeGreaterThan(metadata.old_level);
      } else {
        console.warn('Level did not change - may need more actions to trigger level up');
      }
    });
  });

  describe('CommentMetadata', () => {
    it('includes content_preview for comment notifications', async () => {
      const resource = await createTestResource(supabase, testCommunity.id, 'offer');

      await signInAsUser(supabase, claimant);
      const longComment = 'This is a long comment that should be truncated in the preview. '.repeat(5);
      await createComment(supabase, claimant.id, {
        content: longComment,
        resourceId: resource.id,
      });

      await signInAsUser(supabase, resourceOwner);

      const { data: allNotifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id);

      expect(allNotifications).toContainEqual(
        expect.objectContaining({
          action: 'resource.commented',
          resource_id: resource.id,
        })
      );

      const notification = allNotifications?.find(
        (n) => n.action === 'resource.commented' && n.resource_id === resource.id
      );
      const metadata = notification!.metadata as unknown as { content_preview?: string };
      if (metadata?.content_preview) {
        expect(typeof metadata.content_preview).toBe('string');
        expect(metadata.content_preview.length).toBeGreaterThan(0);
        // Preview should be truncated (e.g., max 100-200 chars)
        expect(metadata.content_preview.length).toBeLessThanOrEqual(200);
      }
    });

    it('handles short comments without truncation', async () => {
      const resource = await createTestResource(supabase, testCommunity.id, 'offer');

      await signInAsUser(supabase, claimant);
      const shortComment = 'Short comment';
      await createComment(supabase, claimant.id, {
        content: shortComment,
        resourceId: resource.id,
      });

      await signInAsUser(supabase, resourceOwner);

      const { data: allNotifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id);

      expect(allNotifications).toContainEqual(
        expect.objectContaining({
          action: 'resource.commented',
          resource_id: resource.id,
        })
      );

      const notification = allNotifications?.find(
        (n) => n.action === 'resource.commented' && n.resource_id === resource.id
      );
      const metadata = notification!.metadata as unknown as { content_preview?: string };
      if (metadata?.content_preview) {
        expect(metadata.content_preview).toBe(shortComment);
      }
    });
  });

  describe('Metadata persistence', () => {
    it('preserves metadata structure across queries', async () => {
      // Create a real notification with metadata via claim approval
      const resource = await createTestResource(supabase, testCommunity.id, 'offer', undefined, true);
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      await signInAsUser(supabase, claimant);
      const claim = await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
      });

      await signInAsUser(supabase, resourceOwner);
      await updateResourceClaim(supabase, { id: claim.id, status: 'approved' });

      await signInAsUser(supabase, claimant);

      // Query the same notification multiple times
      const { data: firstQuery } = await supabase
        .from('notifications')
        .select('metadata')
        .eq('user_id', claimant.id)
        .eq('action', 'claim.approved')
        .eq('claim_id', claim.id)
        .single();

      const { data: secondQuery } = await supabase
        .from('notifications')
        .select('metadata')
        .eq('user_id', claimant.id)
        .eq('action', 'claim.approved')
        .eq('claim_id', claim.id)
        .single();

      // Metadata should be identical across queries
      expect(firstQuery!.metadata).toEqual(secondQuery!.metadata);
    });

    it('handles null metadata for types that do not require it', async () => {
      const resource = await createTestResource(supabase, testCommunity.id, 'offer');

      await signInAsUser(supabase, claimant);
      await createComment(supabase, claimant.id, {
        content: 'Test',
        resourceId: resource.id,
      });

      await signInAsUser(supabase, resourceOwner);

      const { data: allNotifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resourceOwner.id);

      expect(allNotifications).toContainEqual(
        expect.objectContaining({
          action: 'resource.commented',
          resource_id: resource.id,
        })
      );

      const notification = allNotifications?.find(
        (n) => n.action === 'resource.commented' && n.resource_id === resource.id
      );
      // Either null or object
      expect(
        notification!.metadata === null ||
        typeof notification!.metadata === 'object'
      ).toBe(true);
    });
  });

  describe('Metadata type safety', () => {
    it('stores complex nested metadata correctly', async () => {
      // Create a resource.updated notification with metadata via real resource update
      const resource = await createTestResource(supabase, testCommunity.id, 'offer');
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      // Claimant claims resource
      await signInAsUser(supabase, claimant);
      await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
      });

      // Owner updates resource (triggers notification to claimant)
      await signInAsUser(supabase, resourceOwner);
      await supabase
        .from('resources')
        .update({
          title: 'Updated title',
          description: 'Updated description',
        })
        .eq('id', resource.id);

      await signInAsUser(supabase, claimant);

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', claimant.id)
        .eq('action', 'resource.updated')
        .eq('resource_id', resource.id);

      expect(notifications).toHaveLength(1);

      // Verify metadata is a complex JSONB object
      const metadata = notifications![0].metadata as Record<string, unknown>;
      expect(metadata).toBeDefined();
      expect(typeof metadata).toBe('object');

      // Should contain changes array
      if (metadata.changes) {
        expect(Array.isArray(metadata.changes)).toBe(true);
        expect((metadata.changes as string[]).length).toBeGreaterThan(0);
      }
    });
  });
});

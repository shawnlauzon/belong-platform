import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  createTestResourceTimeslot,
} from '../helpers/test-data';
import { fetchNotifications } from '@/features/notifications';
import {
  createResourceClaim,
  deleteResourceClaim,
  updateResourceClaim,
} from '@/features/resources/api';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';

describe('My Resources Notifications', () => {
  let supabase: SupabaseClient<Database>;
  let resourceOwner: Account;
  let testCommunity: Community;
  let claimingUser: Account;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test users and community
    resourceOwner = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create claiming user
    claimingUser = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);

  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Sign in as resource owner for consistency
    await signIn(supabase, resourceOwner.email, 'TestPass123!');
  });

  describe('Resource claim notifications', () => {
    it('should create claim notification in database when someone claims my resource', async () => {
      // Create a resource as resourceOwner
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      // claimingUser claims the resource
      await signIn(supabase, claimingUser.email, 'TestPass123!');
      await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        notes: 'I would like to claim this resource',
      });

      // Switch back to resourceOwner to check notifications
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const notifications = await fetchNotifications(supabase, {
        type: 'claim',
        limit: 10,
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'claim',
        resourceId: resource.id,
        actorId: claimingUser.id,
        isRead: false,
      });
    });

    it('should create resource_claim_cancelled notification in database when someone cancels their claim', async () => {
      // Create a resource as resourceOwner
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      // claimingUser claims the resource first
      await signIn(supabase, claimingUser.email, 'TestPass123!');
      const claim = await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        notes: 'Initial claim',
      });

      // claimingUser cancels their claim (deletes the claim)
      await deleteResourceClaim(supabase, claim.id);

      // Switch back to resourceOwner to check notifications
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const notifications = await fetchNotifications(supabase, {
        type: 'resource_claim_cancelled',
        limit: 10,
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'resource_claim_cancelled',
        resourceId: resource.id,
        actorId: claimingUser.id,
        isRead: false,
      });
    });

    it('should create resource_claim_completed notification in database when someone marks their claim as completed', async () => {
      // Create a resource as resourceOwner
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      // claimingUser claims the resource first
      await signIn(supabase, claimingUser.email, 'TestPass123!');
      const claim = await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        notes: 'Initial claim for completion test',
      });

      // Simulate the handshake flow - first mark as given by owner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await updateResourceClaim(supabase, {
        id: claim.id,
        status: 'given',
      });

      // Then claimingUser marks as completed
      await signIn(supabase, claimingUser.email, 'TestPass123!');
      await updateResourceClaim(supabase, {
        id: claim.id,
        status: 'completed',
      });

      // Switch back to resourceOwner to check notifications
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const notifications = await fetchNotifications(supabase, {
        type: 'resource_claim_completed',
        limit: 10,
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'resource_claim_completed',
        resourceId: resource.id,
        actorId: claimingUser.id,
        isRead: false,
      });
    });

  });

  describe('Self-notification prevention', () => {
    it('should not create claim notification when I claim my own resource', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'request',
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      const initialNotifications = await fetchNotifications(supabase, {
        type: 'claim',
      });
      const initialCount = initialNotifications.length;

      // Claim own resource
      await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        notes: 'Claiming my own resource',
      });

      const finalNotifications = await fetchNotifications(supabase, {
        type: 'claim',
      });
      expect(finalNotifications).toHaveLength(initialCount);
    });

    it('should not create notification when I cancel my own claim on my own resource', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'request',
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      // Claim own resource
      const claim = await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        notes: 'Self-claim for cancellation test',
      });

      const initialNotifications = await fetchNotifications(supabase, {
        type: 'resource_claim_cancelled',
      });
      const initialCount = initialNotifications.length;

      // Cancel own claim
      await deleteResourceClaim(supabase, claim.id);

      const finalNotifications = await fetchNotifications(supabase, {
        type: 'resource_claim_cancelled',
      });
      expect(finalNotifications).toHaveLength(initialCount);
    });

    it('should not create notification when I complete my own claim on my own resource', async () => {
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'request',
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      // Claim own resource
      const claim = await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        notes: 'Self-claim for completion test',
      });

      const initialNotifications = await fetchNotifications(supabase, {
        type: 'resource_claim_completed',
      });
      const initialCount = initialNotifications.length;

      // For requests, claimant gives first, then owner receives, then claimant confirms
      await updateResourceClaim(supabase, {
        id: claim.id,
        status: 'given',
      });

      await updateResourceClaim(supabase, {
        id: claim.id,
        status: 'completed',
      });

      const finalNotifications = await fetchNotifications(supabase, {
        type: 'resource_claim_completed',
      });
      expect(finalNotifications).toHaveLength(initialCount);
    });
  });
});

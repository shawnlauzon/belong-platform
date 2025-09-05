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

      const result = await fetchNotifications(supabase, {
        type: 'claim',
        limit: 10,
      });

      expect(result.notifications.length).toBeGreaterThan(0);
      const claimNotification = result.notifications.find(n => 
        n.type === 'claim' && 
        n.resourceId === resource.id && 
        n.actorId === claimingUser.id
      );
      expect(claimNotification).toBeDefined();
      expect(claimNotification).toMatchObject({
        type: 'claim',
        resourceId: resource.id,
        claimId: expect.any(String),
        communityId: testCommunity.id,
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

      const result2 = await fetchNotifications(supabase, {
        type: 'resource_claim_cancelled',
        limit: 10,
      });

      expect(result2.notifications.length).toBeGreaterThan(0);
      const cancelledNotification = result2.notifications.find(n => 
        n.type === 'resource_claim_cancelled' && 
        n.resourceId === resource.id && 
        n.actorId === claimingUser.id
      );
      expect(cancelledNotification).toBeDefined();
      expect(cancelledNotification).toMatchObject({
        type: 'resource_claim_cancelled',
        resourceId: resource.id,
        claimId: expect.any(String),
        communityId: testCommunity.id,
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

      const result3 = await fetchNotifications(supabase, {
        type: 'resource_claim_completed',
        limit: 10,
      });

      expect(result3.notifications.length).toBeGreaterThan(0);
      const completedNotification = result3.notifications.find(n => 
        n.type === 'resource_claim_completed' && 
        n.resourceId === resource.id && 
        n.actorId === claimingUser.id
      );
      expect(completedNotification).toBeDefined();
      expect(completedNotification).toMatchObject({
        type: 'resource_claim_completed',
        resourceId: resource.id,
        claimId: expect.any(String),
        communityId: testCommunity.id,
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

      // Claim own resource
      await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        notes: 'Claiming my own resource',
      });

      const result4 = await fetchNotifications(supabase, {
        type: 'claim',
      });
      
      // Should not find any notification for claiming own resource
      const selfClaimNotification = result4.notifications.find(n => 
        n.type === 'claim' && 
        n.resourceId === resource.id && 
        n.actorId === resourceOwner.id
      );
      expect(selfClaimNotification).toBeUndefined();
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

      // Cancel own claim
      await deleteResourceClaim(supabase, claim.id);

      const result5 = await fetchNotifications(supabase, {
        type: 'resource_claim_cancelled',
      });
      
      // Should not find any notification for cancelling own claim
      const selfCancelNotification = result5.notifications.find(n => 
        n.type === 'resource_claim_cancelled' && 
        n.resourceId === resource.id && 
        n.actorId === resourceOwner.id
      );
      expect(selfCancelNotification).toBeUndefined();
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

      // For requests, claimant gives first, then owner receives, then claimant confirms
      await updateResourceClaim(supabase, {
        id: claim.id,
        status: 'given',
      });

      await updateResourceClaim(supabase, {
        id: claim.id,
        status: 'completed',
      });

      const result6 = await fetchNotifications(supabase, {
        type: 'resource_claim_completed',
      });
      
      // Should not find any notification for completing own claim
      const selfCompleteNotification = result6.notifications.find(n => 
        n.type === 'resource_claim_completed' && 
        n.resourceId === resource.id && 
        n.actorId === resourceOwner.id
      );
      expect(selfCompleteNotification).toBeUndefined();
    });
  });
});

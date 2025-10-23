import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  createTestResourceTimeslot,
} from '../helpers/test-data';
import { fetchNotifications } from '@/features/notifications/api';
import { NOTIFICATION_TYPES } from '@/features/notifications/constants';
import {
  createResourceClaim,
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
    await joinCommunity(supabase, claimingUser.id, testCommunity.id);
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
        requestText: 'I would like to claim this resource',
      });

      // Switch back to resourceOwner to check notifications
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const notifications = await fetchNotifications(supabase, resourceOwner.id);

      expect(notifications.length).toBeGreaterThan(0);
      const claimNotification = notifications.find(
        (n) =>
          n.type === NOTIFICATION_TYPES.CLAIM_CREATED &&
          n.resourceId === resource.id &&
          n.actorId === claimingUser.id,
      );
      expect(claimNotification).toBeDefined();
      expect(claimNotification).toMatchObject({
        type: NOTIFICATION_TYPES.CLAIM_CREATED,
        resourceId: resource.id,
        claimId: expect.any(String),
        communityId: testCommunity.id,
        actorId: claimingUser.id,
        readAt: null,
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
        requestText: 'Initial claim',
      });

      // claimingUser cancels their claim
      await updateResourceClaim(supabase, {
        id: claim.id,
        status: 'cancelled',
      });

      // Switch back to resourceOwner to check notifications
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      const notifications = await fetchNotifications(supabase, resourceOwner.id);

      expect(notifications.length).toBeGreaterThan(0);
      const cancelledNotification = notifications.find(
        (n) =>
          n.type === NOTIFICATION_TYPES.RESOURCE_CLAIM_CANCELLED &&
          n.resourceId === resource.id &&
          n.actorId === claimingUser.id,
      );
      expect(cancelledNotification).toBeDefined();
      expect(cancelledNotification).toMatchObject({
        type: NOTIFICATION_TYPES.RESOURCE_CLAIM_CANCELLED,
        resourceId: resource.id,
        claimId: expect.any(String),
        communityId: testCommunity.id,
        actorId: claimingUser.id,
        readAt: null,
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
        requestText: 'Initial claim for completion test',
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

      const notifications = await fetchNotifications(supabase, resourceOwner.id);

      expect(notifications.length).toBeGreaterThan(0);
      const completedNotification = notifications.find(
        (n) =>
          n.type === NOTIFICATION_TYPES.RESOURCE_CLAIM_COMPLETED &&
          n.resourceId === resource.id &&
          n.actorId === claimingUser.id,
      );
      expect(completedNotification).toBeDefined();
      expect(completedNotification).toMatchObject({
        type: NOTIFICATION_TYPES.RESOURCE_CLAIM_COMPLETED,
        resourceId: resource.id,
        claimId: expect.any(String),
        communityId: testCommunity.id,
        actorId: claimingUser.id,
        readAt: null,
      });
    });
  });
});

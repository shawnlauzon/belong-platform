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
  updateResourceClaim,
} from '@/features/resources/api';
import { updateResource, deleteResource } from '@/features/resources/api';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';
import type { Notification } from '@/features/notifications';

describe('My Registrations Notifications', () => {
  let supabase: SupabaseClient<Database>;
  let resourceOwner: Account;
  let testCommunity: Community;
  let claimingUser: Account;

  // Real-time testing
  let notificationChannel: RealtimeChannel;
  let notificationsReceived: Notification[] = [];

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test users and community
    resourceOwner = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create claiming user - they will be the one making registrations/claims
    claimingUser = await createTestUser(supabase);
    await joinCommunity(supabase, testCommunity.id);

    // Set up single persistent channel for INSERT events for the claiming user
    notificationChannel = supabase
      .channel(`user:${claimingUser.id}:notifications`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          notificationsReceived.push(payload.new as Notification);
        },
      )
      .subscribe();

    // Wait for channel to be established
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (notificationChannel) {
      await notificationChannel.unsubscribe();
      supabase.removeChannel(notificationChannel);
    }
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Clear notifications array before each test
    notificationsReceived = [];
    // Sign in as claiming user for consistency (they receive these notifications)
    await signIn(supabase, claimingUser.email, 'TestPass123!');
  });

  describe('Claim status notifications', () => {
    it('should create claim_approved notification in database when my claim is approved', async () => {
      // Create a resource requiring approval as resourceOwner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
        'tools',
        true,
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      // claimingUser makes a claim (starts in 'pending' status)
      await signIn(supabase, claimingUser.email, 'TestPass123!');
      const claim = await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        notes: 'Please approve my claim',
      });

      // resourceOwner approves the claim
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await updateResourceClaim(supabase, {
        id: claim.id,
        status: 'approved',
      });

      // Switch back to claimingUser to check notifications
      await signIn(supabase, claimingUser.email, 'TestPass123!');

      const result = await fetchNotifications(supabase, {
        type: 'claim_approved',
        limit: 10,
      });

      expect(result.notifications.length).toBeGreaterThan(0);
      
      const specificNotification = result.notifications.find(n => 
        n.type === 'claim_approved' && 
        n.resourceId === resource.id && 
        n.actorId === resourceOwner.id
      );
      expect(specificNotification).toBeDefined();
      expect(specificNotification).toMatchObject({
        type: 'claim_approved',
        resourceId: resource.id,
        actorId: resourceOwner.id,
        isRead: false,
      });
    });

    it('should receive real-time claim_approved notification when my claim is approved', async () => {
      // Create a resource requiring approval as resourceOwner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
        'tools',
        true,
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      // claimingUser makes a claim
      await signIn(supabase, claimingUser.email, 'TestPass123!');
      const claim = await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        notes: 'Real-time approval test',
      });

      // resourceOwner approves the claim
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await updateResourceClaim(supabase, {
        id: claim.id,
        status: 'approved',
      });

      // Wait for realtime to propagate
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify notification was received via persistent channel
      expect(notificationsReceived.length).toBeGreaterThan(0);
      
      const specificNotification = notificationsReceived.find(n => 
        n.type === 'claim_approved' && 
        n.resource_id === resource.id && 
        n.actor_id === resourceOwner.id
      );
      expect(specificNotification).toBeDefined();
      expect(specificNotification).toMatchObject({
        type: 'claim_approved',
        resource_id: resource.id,
        actor_id: resourceOwner.id,
        is_read: false,
      });
    });

    it('should create claim_rejected notification in database when my claim is rejected', async () => {
      // Create a resource requiring approval as resourceOwner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
        'tools',
        true,
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      // claimingUser makes a claim (starts in 'pending' status)
      await signIn(supabase, claimingUser.email, 'TestPass123!');
      const claim = await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        notes: 'Hope this gets approved',
      });

      // resourceOwner rejects the claim
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await updateResourceClaim(supabase, {
        id: claim.id,
        status: 'rejected',
      });

      // Switch back to claimingUser to check notifications
      await signIn(supabase, claimingUser.email, 'TestPass123!');

      const result2 = await fetchNotifications(supabase, {
        type: 'claim_rejected',
        limit: 10,
      });

      expect(result2.notifications.length).toBeGreaterThan(0);
      
      const specificNotification = result2.notifications.find(n => 
        n.type === 'claim_rejected' && 
        n.resourceId === resource.id && 
        n.actorId === resourceOwner.id
      );
      expect(specificNotification).toBeDefined();
      expect(specificNotification).toMatchObject({
        type: 'claim_rejected',
        resourceId: resource.id,
        actorId: resourceOwner.id,
        isRead: false,
      });
    });

    it('should receive real-time claim_rejected notification when my claim is rejected', async () => {
      // Create a resource requiring approval as resourceOwner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
        'tools',
        true,
      );
      const timeslot = await createTestResourceTimeslot(supabase, resource.id);

      // claimingUser makes a claim
      await signIn(supabase, claimingUser.email, 'TestPass123!');
      const claim = await createResourceClaim(supabase, {
        resourceId: resource.id,
        timeslotId: timeslot.id,
        notes: 'Real-time rejection test',
      });

      // resourceOwner rejects the claim
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await updateResourceClaim(supabase, {
        id: claim.id,
        status: 'rejected',
      });

      // Wait for realtime to propagate
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify notification was received via persistent channel
      expect(notificationsReceived.length).toBeGreaterThan(0);
      
      const specificNotification = notificationsReceived.find(n => 
        n.type === 'claim_rejected' && 
        n.resource_id === resource.id && 
        n.actor_id === resourceOwner.id
      );
      expect(specificNotification).toBeDefined();
      expect(specificNotification).toMatchObject({
        type: 'claim_rejected',
        resource_id: resource.id,
        actor_id: resourceOwner.id,
        is_read: false,
      });
    });
  });

  describe('Resource update notifications for claimed resources', () => {
    it('should create claimed_resource_updated notification in database when a resource I claimed is updated', async () => {
      // Create a resource as resourceOwner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
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
        notes: 'Initial claim for update test',
      });

      // resourceOwner updates the resource
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await updateResource(supabase, {
        id: resource.id,
        title: 'Updated Resource Title',
        description: 'This resource has been updated',
      });

      // Switch back to claimingUser to check notifications
      await signIn(supabase, claimingUser.email, 'TestPass123!');

      const result3 = await fetchNotifications(supabase, {
        type: 'claimed_resource_updated',
        limit: 10,
      });

      expect(result3.notifications.length).toBeGreaterThan(0);
      
      const specificNotification = result3.notifications.find(n => 
        n.type === 'claimed_resource_updated' && 
        n.resourceId === resource.id && 
        n.actorId === resourceOwner.id
      );
      expect(specificNotification).toBeDefined();
      expect(specificNotification).toMatchObject({
        type: 'claimed_resource_updated',
        resourceId: resource.id,
        actorId: resourceOwner.id,
        isRead: false,
      });
    });

    it('should receive real-time claimed_resource_updated notification when a resource I claimed is updated', async () => {
      // Create a resource as resourceOwner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
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
        notes: 'Real-time update test claim',
      });

      // Clear notifications since claim creation also triggers notification
      notificationsReceived = [];

      // resourceOwner updates the resource
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await updateResource(supabase, {
        id: resource.id,
        title: 'Real-time Updated Resource',
        description: 'This resource was updated for real-time testing',
      });

      // Wait for realtime to propagate
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify notification was received via persistent channel
      expect(notificationsReceived.length).toBeGreaterThan(0);
      
      const specificNotification = notificationsReceived.find(n => 
        n.type === 'claimed_resource_updated' && 
        n.resource_id === resource.id && 
        n.actor_id === resourceOwner.id
      );
      expect(specificNotification).toBeDefined();
      expect(specificNotification).toMatchObject({
        type: 'claimed_resource_updated',
        resource_id: resource.id,
        actor_id: resourceOwner.id,
        is_read: false,
      });
    });

    it('should create claimed_resource_cancelled notification in database when a resource I claimed is deleted', async () => {
      // Create a resource as resourceOwner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
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
        notes: 'Initial claim for cancellation test',
      });

      // resourceOwner deletes the resource (cancels it)
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await deleteResource(supabase, resource.id);

      // Switch back to claimingUser to check notifications
      await signIn(supabase, claimingUser.email, 'TestPass123!');

      const result4 = await fetchNotifications(supabase, {
        type: 'claimed_resource_cancelled',
        limit: 10,
      });

      expect(result4.notifications.length).toBeGreaterThan(0);
      
      const specificNotification = result4.notifications.find(n => 
        n.type === 'claimed_resource_cancelled' && 
        n.resourceId === resource.id && 
        n.actorId === resourceOwner.id
      );
      expect(specificNotification).toBeDefined();
      expect(specificNotification).toMatchObject({
        type: 'claimed_resource_cancelled',
        resourceId: resource.id,
        actorId: resourceOwner.id,
        isRead: false,
      });
    });

    it('should receive real-time claimed_resource_cancelled notification when a resource I claimed is deleted', async () => {
      // Create a resource as resourceOwner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
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
        notes: 'Real-time cancellation test claim',
      });

      // Clear notifications since claim creation also triggers notification
      notificationsReceived = [];

      // resourceOwner deletes the resource
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await deleteResource(supabase, resource.id);

      // Wait for realtime to propagate
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify notification was received via persistent channel
      expect(notificationsReceived.length).toBeGreaterThan(0);
      
      const specificNotification = notificationsReceived.find(n => 
        n.type === 'claimed_resource_cancelled' && 
        n.resource_id === resource.id && 
        n.actor_id === resourceOwner.id
      );
      expect(specificNotification).toBeDefined();
      expect(specificNotification).toMatchObject({
        type: 'claimed_resource_cancelled',
        resource_id: resource.id,
        actor_id: resourceOwner.id,
        is_read: false,
      });
    });
  });

  describe('Event registration scenarios', () => {
    it('should create claim_approved notification for event registration approval', async () => {
      // Create an event requiring approval as resourceOwner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      const event = await createTestResource(
        supabase,
        testCommunity.id,
        'event',
        'tools',
        true,
      );
      const timeslot = await createTestResourceTimeslot(supabase, event.id);

      // claimingUser registers for the event (starts in 'pending' status)
      await signIn(supabase, claimingUser.email, 'TestPass123!');
      const registration = await createResourceClaim(supabase, {
        resourceId: event.id,
        timeslotId: timeslot.id,
        notes: 'Would like to attend this event',
      });

      // Event owner approves the registration (pending -> approved for events)
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await updateResourceClaim(supabase, {
        id: registration.id,
        status: 'approved',
      });

      // Switch back to claimingUser to check notifications
      await signIn(supabase, claimingUser.email, 'TestPass123!');

      const result5 = await fetchNotifications(supabase, {
        type: 'claim_approved',
        limit: 10,
      });

      expect(result5.notifications.length).toBeGreaterThan(0);
      
      const specificNotification = result5.notifications.find(n => 
        n.type === 'claim_approved' && 
        n.resourceId === event.id && 
        n.actorId === resourceOwner.id
      );
      expect(specificNotification).toBeDefined();
      expect(specificNotification).toMatchObject({
        type: 'claim_approved',
        resourceId: event.id,
        actorId: resourceOwner.id,
        isRead: false,
      });
    });

    it('should create claimed_resource_updated notification when event I registered for is updated', async () => {
      // Create an event as resourceOwner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      const event = await createTestResource(
        supabase,
        testCommunity.id,
        'event',
      );
      const timeslot = await createTestResourceTimeslot(supabase, event.id);

      // claimingUser registers for the event
      await signIn(supabase, claimingUser.email, 'TestPass123!');
      await createResourceClaim(supabase, {
        resourceId: event.id,
        timeslotId: timeslot.id,
        notes: 'Excited to attend!',
      });

      // Event owner updates the event details
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      await updateResource(supabase, {
        id: event.id,
        title: 'Updated Event Title',
        description: 'Event details have changed',
      });

      // Switch back to claimingUser to check notifications
      await signIn(supabase, claimingUser.email, 'TestPass123!');

      const result6 = await fetchNotifications(supabase, {
        type: 'claimed_resource_updated',
        limit: 10,
      });

      expect(result6.notifications.length).toBeGreaterThan(0);
      
      const specificNotification = result6.notifications.find(n => 
        n.type === 'claimed_resource_updated' && 
        n.resourceId === event.id && 
        n.actorId === resourceOwner.id
      );
      expect(specificNotification).toBeDefined();
      expect(specificNotification).toMatchObject({
        type: 'claimed_resource_updated',
        resourceId: event.id,
        actorId: resourceOwner.id,
        isRead: false,
      });
    });
  });

  describe('Self-notification prevention', () => {
    it('should not create notification when I update my own resource that I also claimed', async () => {
      // Create a resource
      await signIn(supabase, claimingUser.email, 'TestPass123!');
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
        notes: 'Self-claim for update test',
      });


      // Update own resource
      await updateResource(supabase, {
        id: resource.id,
        title: 'Self-updated resource',
        description: 'I updated my own resource',
      });

      const finalResult = await fetchNotifications(supabase, {
        type: 'claimed_resource_updated',
      });
      
      const selfNotification = finalResult.notifications.find(n => 
        n.type === 'claimed_resource_updated' && 
        n.resourceId === resource.id && 
        n.actorId === claimingUser.id
      );
      expect(selfNotification).toBeUndefined();
    });
  });
});

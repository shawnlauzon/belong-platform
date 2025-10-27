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
import { createResourceClaim, updateResourceClaim } from '@/features/resources/api';
import { joinCommunity } from '@/features/communities/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';

/**
 * Test suite for dual confirmation transaction notifications.
 *
 * Dual Confirmation System:
 * - Both parties must independently confirm the transaction
 * - Either party can initiate by marking "given" or "received"
 * - The other party receives a notification to confirm
 *
 * Notification Types:
 * - resource.given: Other party marked as given, confirm you received
 * - resource.received: Other party marked as received, confirm you gave
 *
 * Flows:
 * - Offer: Owner gives item → Claimant receives
 * - Favor: Claimant gives help → Owner receives
 *
 * These tests will FAIL until the dual confirmation system is implemented.
 */
describe('Dual Confirmation Transactions', () => {
  let supabase: SupabaseClient<Database>;
  let owner: Account;
  let claimant: Account;
  let testCommunity: Community;

  beforeAll(async () => {
    supabase = createTestClient();

    owner = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    claimant = await createTestUser(supabase);
    await joinCommunity(supabase, claimant.id, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    await signInAsUser(supabase, owner);
  });

  describe('Offer flow - Owner gives, Claimant receives', () => {
    it('notifies claimant when owner marks as given (resource.given)', async () => {
      const offer = await createTestResource(supabase, testCommunity.id, 'offer');
      const timeslot = await createTestResourceTimeslot(supabase, offer.id);

      // Claimant claims offer
      await signInAsUser(supabase, claimant);
      const claim = await createResourceClaim(supabase, {
        resourceId: offer.id,
        timeslotId: timeslot.id,
      });

      // Owner approves and marks as given
      await signInAsUser(supabase, owner);
      await updateResourceClaim(supabase, { id: claim.id, status: 'approved' });
      await updateResourceClaim(supabase, { id: claim.id, status: 'given' });

      // Claimant should receive resource.given notification
      await signInAsUser(supabase, claimant);

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
        actor_id: owner.id,
        claim_id: claim.id,
        resource_id: offer.id,
        read_at: null,
      });
    });

    it('notifies owner when claimant marks as received (resource.received)', async () => {
      const offer = await createTestResource(supabase, testCommunity.id, 'offer');
      const timeslot = await createTestResourceTimeslot(supabase, offer.id);

      await signInAsUser(supabase, claimant);
      const claim = await createResourceClaim(supabase, {
        resourceId: offer.id,
        timeslotId: timeslot.id,
      });

      await signInAsUser(supabase, owner);
      await updateResourceClaim(supabase, { id: claim.id, status: 'approved' });

      // Claimant marks as received
      await signInAsUser(supabase, claimant);
      await updateResourceClaim(supabase, { id: claim.id, status: 'received' });

      // Owner should receive resource.received notification
      await signInAsUser(supabase, owner);

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', owner.id)
        .eq('type', 'resource.received')
        .eq('claim_id', claim.id);

      expect(notifications).toHaveLength(1);
      expect(notifications![0]).toMatchObject({
        type: 'resource.received',
        user_id: owner.id,
        actor_id: claimant.id,
        claim_id: claim.id,
        resource_id: offer.id,
        read_at: null,
      });
    });

    it('completes transaction when both parties confirm (given → received)', async () => {
      const offer = await createTestResource(supabase, testCommunity.id, 'offer');
      const timeslot = await createTestResourceTimeslot(supabase, offer.id);

      await signInAsUser(supabase, claimant);
      const claim = await createResourceClaim(supabase, {
        resourceId: offer.id,
        timeslotId: timeslot.id,
      });

      await signInAsUser(supabase, owner);
      await updateResourceClaim(supabase, { id: claim.id, status: 'approved' });

      // Owner marks as given
      await updateResourceClaim(supabase, { id: claim.id, status: 'given' });

      // Claimant confirms received
      await signInAsUser(supabase, claimant);
      await updateResourceClaim(supabase, { id: claim.id, status: 'received' });

      // Verify both notifications exist
      const { data: givenNotification } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', claimant.id)
        .eq('type', 'resource.given')
        .eq('claim_id', claim.id);

      const { data: receivedNotification } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', owner.id)
        .eq('type', 'resource.received')
        .eq('claim_id', claim.id);

      expect(givenNotification).toHaveLength(1);
      expect(receivedNotification).toHaveLength(1);

      // Transaction should be completed
      const { data: updatedClaim } = await supabase
        .from('resource_claims')
        .select('status')
        .eq('id', claim.id)
        .single();

      expect(updatedClaim!.status).toBe('completed');
    });

    it('completes transaction when both parties confirm (received → given)', async () => {
      const offer = await createTestResource(supabase, testCommunity.id, 'offer');
      const timeslot = await createTestResourceTimeslot(supabase, offer.id);

      await signInAsUser(supabase, claimant);
      const claim = await createResourceClaim(supabase, {
        resourceId: offer.id,
        timeslotId: timeslot.id,
      });

      await signInAsUser(supabase, owner);
      await updateResourceClaim(supabase, { id: claim.id, status: 'approved' });

      // Claimant marks as received first
      await signInAsUser(supabase, claimant);
      await updateResourceClaim(supabase, { id: claim.id, status: 'received' });

      // Owner confirms given
      await signInAsUser(supabase, owner);
      await updateResourceClaim(supabase, { id: claim.id, status: 'given' });

      // Verify both notifications exist
      const { data: receivedNotification } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', owner.id)
        .eq('type', 'resource.received')
        .eq('claim_id', claim.id);

      await signInAsUser(supabase, claimant);
      const { data: givenNotification } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', claimant.id)
        .eq('type', 'resource.given')
        .eq('claim_id', claim.id);

      expect(receivedNotification).toHaveLength(1);
      expect(givenNotification).toHaveLength(1);

      // Transaction should be completed
      const { data: updatedClaim } = await supabase
        .from('resource_claims')
        .select('status')
        .eq('id', claim.id)
        .single();

      expect(updatedClaim!.status).toBe('completed');
    });
  });

  describe('Favor flow - Claimant gives, Owner receives', () => {
    it('notifies owner when claimant marks as given (resource.given)', async () => {
      const favor = await createTestResource(supabase, testCommunity.id, 'request');
      const timeslot = await createTestResourceTimeslot(supabase, favor.id);

      // Claimant offers to help
      await signInAsUser(supabase, claimant);
      const claim = await createResourceClaim(supabase, {
        resourceId: favor.id,
        timeslotId: timeslot.id,
      });

      // Owner approves
      await signInAsUser(supabase, owner);
      await updateResourceClaim(supabase, { id: claim.id, status: 'approved' });

      // Claimant marks as given (provided the help)
      await signInAsUser(supabase, claimant);
      await updateResourceClaim(supabase, { id: claim.id, status: 'given' });

      // Owner should receive resource.given notification
      await signInAsUser(supabase, owner);

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', owner.id)
        .eq('type', 'resource.given')
        .eq('claim_id', claim.id);

      expect(notifications).toHaveLength(1);
      expect(notifications![0]).toMatchObject({
        type: 'resource.given',
        user_id: owner.id,
        actor_id: claimant.id,
        claim_id: claim.id,
        resource_id: favor.id,
        read_at: null,
      });
    });

    it('notifies claimant when owner marks as received (resource.received)', async () => {
      const favor = await createTestResource(supabase, testCommunity.id, 'request');
      const timeslot = await createTestResourceTimeslot(supabase, favor.id);

      await signInAsUser(supabase, claimant);
      const claim = await createResourceClaim(supabase, {
        resourceId: favor.id,
        timeslotId: timeslot.id,
      });

      await signInAsUser(supabase, owner);
      await updateResourceClaim(supabase, { id: claim.id, status: 'approved' });

      // Owner marks as received (received the help)
      await updateResourceClaim(supabase, { id: claim.id, status: 'received' });

      // Claimant should receive resource.received notification
      await signInAsUser(supabase, claimant);

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', claimant.id)
        .eq('type', 'resource.received')
        .eq('claim_id', claim.id);

      expect(notifications).toHaveLength(1);
      expect(notifications![0]).toMatchObject({
        type: 'resource.received',
        user_id: claimant.id,
        actor_id: owner.id,
        claim_id: claim.id,
        resource_id: favor.id,
        read_at: null,
      });
    });
  });

  describe('Independent confirmation', () => {
    it('allows either party to initiate confirmation', async () => {
      const offer = await createTestResource(supabase, testCommunity.id, 'offer');
      const timeslot = await createTestResourceTimeslot(supabase, offer.id);

      await signInAsUser(supabase, claimant);
      const claim = await createResourceClaim(supabase, {
        resourceId: offer.id,
        timeslotId: timeslot.id,
      });

      await signInAsUser(supabase, owner);
      await updateResourceClaim(supabase, { id: claim.id, status: 'approved' });

      // Either party can mark first
      // This is tested by both "given first" and "received first" flows above

      // Verify claim is still pending after single confirmation
      await signInAsUser(supabase, claimant);
      await updateResourceClaim(supabase, { id: claim.id, status: 'received' });

      const { data: claimAfterFirst } = await supabase
        .from('resource_claims')
        .select('status')
        .eq('id', claim.id)
        .single();

      // Should not be completed with only one confirmation
      expect(claimAfterFirst!.status).not.toBe('completed');
    });

    it('does not complete until both parties confirm', async () => {
      const offer = await createTestResource(supabase, testCommunity.id, 'offer');
      const timeslot = await createTestResourceTimeslot(supabase, offer.id);

      await signInAsUser(supabase, claimant);
      const claim = await createResourceClaim(supabase, {
        resourceId: offer.id,
        timeslotId: timeslot.id,
      });

      await signInAsUser(supabase, owner);
      await updateResourceClaim(supabase, { id: claim.id, status: 'approved' });

      // Only owner confirms
      await updateResourceClaim(supabase, { id: claim.id, status: 'given' });

      const { data: claimStatus } = await supabase
        .from('resource_claims')
        .select('status')
        .eq('id', claim.id)
        .single();

      expect(claimStatus!.status).not.toBe('completed');

      // Now claimant confirms
      await signInAsUser(supabase, claimant);
      await updateResourceClaim(supabase, { id: claim.id, status: 'received' });

      const { data: finalStatus } = await supabase
        .from('resource_claims')
        .select('status')
        .eq('id', claim.id)
        .single();

      expect(finalStatus!.status).toBe('completed');
    });
  });

  describe('Notification content', () => {
    it('includes all relevant context in resource.given notification', async () => {
      const offer = await createTestResource(supabase, testCommunity.id, 'offer');
      const timeslot = await createTestResourceTimeslot(supabase, offer.id);

      await signInAsUser(supabase, claimant);
      const claim = await createResourceClaim(supabase, {
        resourceId: offer.id,
        timeslotId: timeslot.id,
      });

      await signInAsUser(supabase, owner);
      await updateResourceClaim(supabase, { id: claim.id, status: 'approved' });
      await updateResourceClaim(supabase, { id: claim.id, status: 'given' });

      await signInAsUser(supabase, claimant);

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', claimant.id)
        .eq('type', 'resource.given')
        .eq('claim_id', claim.id);

      expect(notifications![0]).toMatchObject({
        user_id: claimant.id,
        actor_id: owner.id,
        resource_id: offer.id,
        claim_id: claim.id,
        community_id: testCommunity.id,
      });
    });

    it('includes all relevant context in resource.received notification', async () => {
      const offer = await createTestResource(supabase, testCommunity.id, 'offer');
      const timeslot = await createTestResourceTimeslot(supabase, offer.id);

      await signInAsUser(supabase, claimant);
      const claim = await createResourceClaim(supabase, {
        resourceId: offer.id,
        timeslotId: timeslot.id,
      });

      await signInAsUser(supabase, owner);
      await updateResourceClaim(supabase, { id: claim.id, status: 'approved' });

      await signInAsUser(supabase, claimant);
      await updateResourceClaim(supabase, { id: claim.id, status: 'received' });

      await signInAsUser(supabase, owner);

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', owner.id)
        .eq('type', 'resource.received')
        .eq('claim_id', claim.id);

      expect(notifications![0]).toMatchObject({
        user_id: owner.id,
        actor_id: claimant.id,
        resource_id: offer.id,
        claim_id: claim.id,
        community_id: testCommunity.id,
      });
    });
  });
});

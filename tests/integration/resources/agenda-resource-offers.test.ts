import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { TEST_PREFIX } from '../helpers/test-data';

import {
  createTestUser,
  createTestCommunity,
  createTestShoutout,
} from '../helpers/test-data';
import { fetchAgenda } from '@/features/agenda/api';
import {
  createResource,
  createResourceTimeslot,
  createResourceClaim,
} from '@/features/resources/api';
import { joinCommunity } from '@/features/communities/api';
import { signIn, signOut } from '@/features/auth/api';
import type { Agenda } from '@/features/agenda/types';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';
import type { Resource, ResourceTimeslot } from '@/features/resources/types';
import {
  createFakeResourceInput,
  createFakeResourceTimeslotInput,
  createFakeResourceClaimInput,
} from '@/features/resources/__fakes__';

describe('Agenda Integration Tests - Resource Offers Core Aggregation', () => {
  let supabase: SupabaseClient<Database>;

  // Two users can cover all scenarios
  let providerUser: User; // User with resource offers and requests
  let claimantUser: User; // User who claims resource offers

  // Provider user's entities
  let community: Community;
  let upcomingOffer1: Resource;
  let upcomingOffer1Timeslot: ResourceTimeslot;
  let upcomingOffer2: Resource;
  let upcomingOffer2Timeslot: ResourceTimeslot;
  let finishedOffer1: Resource;
  let finishedOffer1Timeslot: ResourceTimeslot;
  let finishedOffer2: Resource;
  let finishedOffer2Timeslot: ResourceTimeslot;

  beforeAll(async () => {
    supabase = createTestClient();

    // 1. Create provider user with community, resource offers, and requests
    providerUser = await createTestUser(supabase);
    community = await createTestCommunity(supabase);

    [upcomingOffer1, upcomingOffer2, finishedOffer1, finishedOffer2] =
      await Promise.all([
        createResource(
          supabase,
          createFakeResourceInput({
            title: `${TEST_PREFIX}Resource_${Date.now()}`,
            description: `${TEST_PREFIX} test resource offer`,
            type: 'offer',
            communityIds: [community.id],
            status: 'open',
          }),
        ),
        createResource(
          supabase,
          createFakeResourceInput({
            title: `${TEST_PREFIX}Resource_${Date.now()}`,
            description: `${TEST_PREFIX} test resource offer`,
            type: 'offer',
            communityIds: [community.id],
            status: 'open',
          }),
        ),
        createResource(
          supabase,
          createFakeResourceInput({
            title: `${TEST_PREFIX}Resource_${Date.now()}`,
            description: `${TEST_PREFIX} test resource offer`,
            type: 'offer',
            communityIds: [community.id],
            status: 'completed',
          }),
        ),
        createResource(
          supabase,
          createFakeResourceInput({
            title: `${TEST_PREFIX}Resource_${Date.now()}`,
            description: `${TEST_PREFIX} test resource offer`,
            type: 'offer',
            communityIds: [community.id],
            status: 'completed',
          }),
        ),
      ]);

    [
      upcomingOffer1Timeslot,
      upcomingOffer2Timeslot,
      finishedOffer1Timeslot,
      finishedOffer2Timeslot,
    ] = await Promise.all([
      createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: upcomingOffer1.id,
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
        }),
      ),
      createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: upcomingOffer2.id,
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
        }),
      ),
      createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: finishedOffer1.id,
          startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          endTime: new Date(Date.now() - 23 * 60 * 60 * 1000), // Yesterday + 1 hour
        }),
      ),
      createResourceTimeslot(
        supabase,
        createFakeResourceTimeslotInput({
          resourceId: finishedOffer2.id,
          startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          endTime: new Date(Date.now() - 23 * 60 * 60 * 1000), // Yesterday + 1 hour
        }),
      ),
    ]);

    // 2. Create claimant user and claim resource offers
    claimantUser = await createTestUser(supabase);
    await signIn(supabase, claimantUser.email, 'TestPass123!');
    await joinCommunity(supabase, community.id);

    await Promise.all([
      createApprovedClaim(upcomingOffer1.id, upcomingOffer1Timeslot.id),
      createApprovedClaim(upcomingOffer2.id, upcomingOffer2Timeslot.id),
      createApprovedClaim(finishedOffer1.id, finishedOffer1Timeslot.id),
      createApprovedClaim(finishedOffer2.id, finishedOffer2Timeslot.id),
    ]);

    // Send a shoutout for finishedOffer1 but not finishedOffer2
    await createTestShoutout({
      supabase,
      toUserId: providerUser.id,
      communityId: community.id,
      resourceId: finishedOffer1.id,
    });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Provider Agenda Tests', () => {
    beforeAll(async () => {
      // Ensure provider is signed in for all provider tests
      await signIn(supabase, providerUser.email, 'TestPass123!');
    });

    afterAll(async () => {
      await signOut(supabase);
    });

    it('returns proper Agenda interface structure', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - Verify interface structure
      expect(agenda).toBeDefined();
      expect(agenda).toHaveProperty('items');
      expect(agenda).toHaveProperty('hasMore');
      expect(Array.isArray(agenda.items)).toBe(true);
      expect(typeof agenda.hasMore).toBe('boolean');

      // Should have at least one item (resource offers as provider)
      expect(agenda.items.length).toBeGreaterThan(0);
    });

    it('includes upcoming resource offers I am providing', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - should include upcomingOffer1
      expect(agenda.items).toContainEqual(
        expect.objectContaining({
          id: upcomingOffer1.id,
        }),
      );
      expect(agenda.items).toContainEqual(
        expect.objectContaining({
          id: upcomingOffer2.id,
        }),
      );

      // An agenda item as a provider
      expect(agenda.items).toContainEqual(
        expect.objectContaining({
          id: upcomingOffer1.id,
          type: 'resource-provider',
        }),
      );
      // And an agenda item I am confirmed for
      expect(agenda.items).toContainEqual(
        expect.objectContaining({
          id: upcomingOffer1.id,
          type: 'resource-confirmed',
        }),
      );
    });

    it('does not include completed resource offers I am providing', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - should not include finishedOffer1
      expect(agenda.items).not.toContainEqual(
        expect.objectContaining({
          id: finishedOffer1.id,
        }),
      );
      expect(agenda.items).not.toContainEqual(
        expect.objectContaining({
          id: finishedOffer2.id,
        }),
      );
    });
  });

  describe('Claimant Agenda Tests', () => {
    beforeAll(async () => {
      // Ensure claimant is signed in for all claimant tests
      await signIn(supabase, claimantUser.email, 'TestPass123!');
    });

    afterAll(async () => {
      await signOut(supabase);
    });

    it('includes confirmed resource offers in claimant agenda', async () => {
      // Act
      const agenda = await fetchAgenda(supabase);

      // Assert - should include upcomingOffer1
      expect(agenda.items).toContainEqual(
        expect.objectContaining({
          id: upcomingOffer1.id,
        }),
      );
      const resourceOffer = agenda.items.find(
        (item) => item.id === upcomingOffer1.id,
      );
      expect(resourceOffer).toMatchObject({
        type: 'resource-confirmed',
      });
    });

    it('includes maybe resource offers in claimant agenda', async () => {
      // Create a "maybe" claim for upcomingOffer2
      const maybeClaimInput = createFakeResourceClaimInput({
        resourceId: upcomingOffer2.id,
        timeslotId: upcomingOffer2Timeslot.id,
        status: 'pending', // "maybe" equivalent
      });

      await createResourceClaim(supabase, maybeClaimInput);

      // Act
      const agenda = await fetchAgenda(supabase);

      // Assert - should include upcomingOffer2
      expect(agenda.items).toContainEqual(
        expect.objectContaining({
          id: upcomingOffer2.id,
        }),
      );
      const resourceOffer = agenda.items.find(
        (item) => item.id === upcomingOffer2.id,
      );
      expect(resourceOffer).toMatchObject({
        type: 'resource-maybe',
      });
    });

    it('includes finished resource offers that I have not sent a shoutout for', async () => {
      // Act
      const agenda = await fetchAgenda(supabase);

      // Assert - should include finishedOffer2
      expect(agenda.items).toContainEqual(
        expect.objectContaining({
          id: finishedOffer2.id,
        }),
      );
      const resourceOffer = agenda.items.find(
        (item) => item.id === finishedOffer2.id,
      );
      expect(resourceOffer).toMatchObject({
        type: 'shoutout-offer',
      });
    });

    it('excludes resource offers that I sent a shoutout for', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - should not include finishedOffer1
      expect(agenda.items).not.toContainEqual(
        expect.objectContaining({
          id: finishedOffer1.id,
        }),
      );
    });
  });

  // Helper function to create approved resource claims
  const createApprovedClaim = async (
    resourceId: string,
    timeslotId: string,
  ) => {
    const claim = await createResourceClaim(
      supabase,
      createFakeResourceClaimInput({
        resourceId,
        timeslotId,
        status: 'pending',
      }),
    );

    // set to approved in database
    await supabase
      .from('resource_claims')
      .update({ status: 'approved' })
      .eq('id', claim.id);
  };
});

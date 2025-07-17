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
  let request1: Resource;
  let request2: Resource;
  let request3: Resource;

  beforeAll(async () => {
    supabase = createTestClient();

    // 1. Create provider user with community, resource offers, and requests
    providerUser = await createTestUser(supabase);
    await signIn(supabase, providerUser.email, 'TestPass123!');
    community = await createTestCommunity(supabase);

    // Create provider resource offers
    const upcomingOfferInput1 = createFakeResourceInput({
      title: `${TEST_PREFIX}Resource_${Date.now()}`,
      description: `${TEST_PREFIX} test resource offer`,
      type: 'offer',
      communityIds: [community.id],
    });
    upcomingOffer1 = await createResource(supabase, upcomingOfferInput1);
    console.log('upcomingOffer1', upcomingOffer1);

    upcomingOffer1Timeslot = await createResourceTimeslot(
      supabase,
      createFakeResourceTimeslotInput({
        resourceId: upcomingOffer1.id,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
        maxClaims: 5,
      }),
    );

    const upcomingOfferInput2 = createFakeResourceInput({
      title: `${TEST_PREFIX}Resource_${Date.now()}`,
      description: `${TEST_PREFIX} test resource offer`,
      type: 'offer',
      communityIds: [community.id],
    });
    upcomingOffer2 = await createResource(supabase, upcomingOfferInput2);
    console.log('upcomingOffer2', upcomingOffer2);

    upcomingOffer2Timeslot = await createResourceTimeslot(
      supabase,
      createFakeResourceTimeslotInput({
        resourceId: upcomingOffer2.id,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
        maxClaims: 3,
      }),
    );

    // Create finished resource offers
    const finishedOfferInput1 = createFakeResourceInput({
      title: `${TEST_PREFIX}Resource_${Date.now()}`,
      description: `${TEST_PREFIX} test resource offer`,
      type: 'offer',
      communityIds: [community.id],
    });
    finishedOffer1 = await createResource(supabase, finishedOfferInput1);
    console.log('finishedOffer1', finishedOffer1);

    finishedOffer1Timeslot = await createResourceTimeslot(
      supabase,
      createFakeResourceTimeslotInput({
        resourceId: finishedOffer1.id,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        endTime: new Date(Date.now() - 23 * 60 * 60 * 1000), // Yesterday + 1 hour
        maxClaims: 4,
      }),
    );

    const finishedOfferInput2 = createFakeResourceInput({
      title: `${TEST_PREFIX}Resource_${Date.now()}`,
      description: `${TEST_PREFIX} test resource offer`,
      type: 'offer',
      communityIds: [community.id],
    });
    finishedOffer2 = await createResource(supabase, finishedOfferInput2);
    console.log('finishedOffer2', finishedOffer2);

    finishedOffer2Timeslot = await createResourceTimeslot(
      supabase,
      createFakeResourceTimeslotInput({
        resourceId: finishedOffer2.id,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        endTime: new Date(Date.now() - 23 * 60 * 60 * 1000), // Yesterday + 1 hour
        maxClaims: 2,
      }),
    );

    // Create resource requests
    const requestInput1 = createFakeResourceInput({
      title: `${TEST_PREFIX}Resource_${Date.now()}`,
      type: 'request',
      description: `${TEST_PREFIX} test resource request`,
      communityIds: [community.id],
    });
    request1 = await createResource(supabase, requestInput1);
    console.log('request1', request1);

    const requestInput2 = createFakeResourceInput({
      title: `${TEST_PREFIX}Resource_${Date.now()}`,
      type: 'request',
      description: `${TEST_PREFIX} test resource request`,
      communityIds: [community.id],
    });
    request2 = await createResource(supabase, requestInput2);
    console.log('request2', request2);

    const requestInput3 = createFakeResourceInput({
      title: `${TEST_PREFIX}Resource_${Date.now()}`,
      type: 'request',
      description: `${TEST_PREFIX} test resource request`,
      communityIds: [community.id],
    });
    request3 = await createResource(supabase, requestInput3);
    console.log('request3', request3);

    // 2. Create claimant user and claim resource offers
    claimantUser = await createTestUser(supabase);
    await signIn(supabase, claimantUser.email, 'TestPass123!');

    await joinCommunity(supabase, community.id);

    // Helper function to create approved resource claims
    const createApprovedClaim = async (
      resourceId: string,
      timeslotId?: string,
    ) => {
      const claimInput = createFakeResourceClaimInput({
        resourceId,
        timeslotId,
        status: 'approved',
      });
      return await createResourceClaim(supabase, claimInput);
    };

    await Promise.all([
      createApprovedClaim(upcomingOffer1.id, upcomingOffer1Timeslot.id),
      createApprovedClaim(upcomingOffer2.id, upcomingOffer2Timeslot.id),
      createApprovedClaim(finishedOffer1.id, finishedOffer1Timeslot.id),
      createApprovedClaim(finishedOffer2.id, finishedOffer2Timeslot.id),
      createApprovedClaim(request1.id),
      createApprovedClaim(request2.id),
    ]);

    // Send a shoutout for finishedOffer1 but not finishedOffer2
    await Promise.all([
      createTestShoutout({
        supabase,
        toUserId: providerUser.id,
        communityIds: [community.id],
        resourceId: finishedOffer1.id,
      }),
      createTestShoutout({
        supabase,
        toUserId: providerUser.id,
        communityIds: [community.id],
        resourceId: request1.id,
      }),
    ]);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Provider Agenda Tests', () => {
    beforeAll(async () => {
      // Ensure provider is signed in for all provider tests
      await signIn(supabase, providerUser.email, 'TestPass123!');

      await createTestShoutout({
        supabase,
        toUserId: claimantUser.id,
        communityIds: [community.id],
        resourceId: request1.id,
      });
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

    it('includes requests that someone accepted', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - should include request2
      expect(agenda.items).toContainEqual(
        expect.objectContaining({
          id: request2.id,
        }),
      );

      // An agenda item as a provider
      expect(agenda.items).toContainEqual(
        expect.objectContaining({
          id: request2.id,
          type: 'shoutout-request',
        }),
      );
    });

    it('excludes requests that I already thanked', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - should not include request1
      expect(agenda.items).not.toContainEqual(
        expect.objectContaining({
          id: request1.id,
        }),
      );
    });

    it('excludes requests that no one accepted', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - should not include request3
      expect(agenda.items).not.toContainEqual(
        expect.objectContaining({
          id: request3.id,
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

    it('includes requests that I have not sent a shoutout for', async () => {
      // Act
      const agenda = await fetchAgenda(supabase);

      // Assert - should include request2
      expect(agenda.items).toContainEqual(
        expect.objectContaining({
          id: request2.id,
        }),
      );
      const request = agenda.items.find((item) => item.id === request2.id);
      expect(request).toMatchObject({
        type: 'shoutout-request',
      });
    });

    it('excludes requests that I sent a shoutout for', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - should not include request1
      expect(agenda.items).not.toContainEqual(
        expect.objectContaining({
          id: request1.id,
        }),
      );
    });
  });
});

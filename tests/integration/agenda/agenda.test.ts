import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { TEST_PREFIX } from '../helpers/test-data';

import {
  createTestUser,
  createTestCommunity,
  createTestGatheringShoutout,
  createTestResourceShoutout,
} from '../helpers/test-data';
import { fetchAgenda } from '@/features/agenda/api';
import { createGathering, joinGathering } from '@/features/gatherings/api';
import { joinCommunity } from '@/features/communities/api';
import { signIn, signOut } from '@/features/auth/api';
import type { Agenda } from '@/features/agenda/types';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';
import type { Gathering } from '@/features/gatherings/types';
import type { Resource } from '@/features/resources/types';
import { acceptResource, createResource } from '@/features/resources/api';
import { createFakeGatheringInput } from '@/features/gatherings/__fakes__';
import { createFakeResourceInput } from '@/features/resources/__fakes__';

describe('Agenda Integration Tests - Core Aggregation', () => {
  let supabase: SupabaseClient<Database>;

  // Two users can cover all scenarios
  let organizerUser: User; // User with organizer gatherings and resources
  let attendeeUser: User; // User who joins gatherings as attendee

  // Organizer user's entities
  let community: Community;
  let upcomingGathering1: Gathering;
  let upcomingGathering2: Gathering;
  let finishedGathering1: Gathering;
  let finishedGathering2: Gathering;
  let offer1: Resource;
  let offer2: Resource;
  let favor1: Resource;
  let favor2: Resource;
  let favor3: Resource;

  beforeAll(async () => {
    supabase = createTestClient();

    // 1. Create organizer user with community, gatherings, and resources
    organizerUser = await createTestUser(supabase);
    await signIn(supabase, organizerUser.email, 'TestPass123!');
    community = await createTestCommunity(supabase);

    // Create organizer gatherings
    const upcomingGatheringInput1 = await createFakeGatheringInput({
      title: `${TEST_PREFIX}Resource_${Date.now()}`,
      description: `${TEST_PREFIX} test resource`,
      communityId: community.id,
      startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    });
    upcomingGathering1 = await createGathering(
      supabase,
      upcomingGatheringInput1,
    );
    console.log('upcomingGathering1', upcomingGathering1);
    // Create organizer gatherings
    const upcomingGatheringInput2 = await createFakeGatheringInput({
      title: `${TEST_PREFIX}Resource_${Date.now()}`,
      description: `${TEST_PREFIX} test resource`,
      communityId: community.id,
      startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    });
    upcomingGathering2 = await createGathering(
      supabase,
      upcomingGatheringInput2,
    );
    console.log('upcomingGathering2', upcomingGathering2);

    // Create organizer gatherings
    const finishedGatheringInput1 = await createFakeGatheringInput({
      title: `${TEST_PREFIX}Resource_${Date.now()}`,
      description: `${TEST_PREFIX} test resource`,
      communityId: community.id,
      startDateTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      endDateTime: new Date(Date.now() - 23 * 60 * 60 * 1000), // Yesterday + 1 hour
    });
    finishedGathering1 = await createGathering(
      supabase,
      finishedGatheringInput1,
    );
    console.log('finishedGathering1', finishedGathering1);

    const finishedGatheringInput2 = await createFakeGatheringInput({
      title: `${TEST_PREFIX}Resource_${Date.now()}`,
      description: `${TEST_PREFIX} test resource`,
      communityId: community.id,
      startDateTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      endDateTime: new Date(Date.now() - 23 * 60 * 60 * 1000), // Yesterday + 1 hour
    });
    finishedGathering2 = await createGathering(
      supabase,
      finishedGatheringInput2,
    );
    console.log('finishedGathering2', finishedGathering2);

    // Create resource and accept it (shoutout scenario)
    const offerInput1 = await createFakeResourceInput({
      title: `${TEST_PREFIX}Resource_${Date.now()}`,
      type: 'offer',
      description: `${TEST_PREFIX} test resource`,
      communityId: community.id,
    });
    offer1 = await createResource(supabase, offerInput1);
    console.log('offer1', offer1);
    const offerInput2 = await createFakeResourceInput({
      title: `${TEST_PREFIX}Resource_${Date.now()}`,
      type: 'offer',
      description: `${TEST_PREFIX} test resource`,
      communityId: community.id,
    });
    offer2 = await createResource(supabase, offerInput2);
    console.log('offer2', offer2);

    // Create resource and accept it (shoutout scenario)
    const favorInput1 = await createFakeResourceInput({
      title: `${TEST_PREFIX}Resource_${Date.now()}`,
      type: 'request',
      description: `${TEST_PREFIX} test resource`,
      communityId: community.id,
    });
    favor1 = await createResource(supabase, favorInput1);
    console.log('favor1', favor1);
    const favorInput2 = await createFakeResourceInput({
      title: `${TEST_PREFIX}Resource_${Date.now()}`,
      type: 'request',
      description: `${TEST_PREFIX} test resource`,
      communityId: community.id,
    });
    favor2 = await createResource(supabase, favorInput2);
    console.log('favor2', favor2);
    const favorInput3 = await createFakeResourceInput({
      title: `${TEST_PREFIX}Resource_${Date.now()}`,
      type: 'request',
      description: `${TEST_PREFIX} test resource`,
      communityId: community.id,
    });
    favor3 = await createResource(supabase, favorInput3);
    console.log('favor3', favor3);

    // 2. Create attendee user and join gathering
    attendeeUser = await createTestUser(supabase);
    await signIn(supabase, attendeeUser.email, 'TestPass123!');

    await joinCommunity(supabase, community.id);
    await Promise.all([
      joinGathering(supabase, upcomingGathering1.id),
      joinGathering(supabase, upcomingGathering2.id, 'maybe'),
      joinGathering(supabase, finishedGathering1.id),
      joinGathering(supabase, finishedGathering2.id),
      acceptResource(supabase, offer1.id),
      acceptResource(supabase, offer2.id),
      acceptResource(supabase, favor1.id),
      acceptResource(supabase, favor2.id),
    ]);

    // Send a shoutout for gathering1 but not gathering2
    await Promise.all([
      createTestGatheringShoutout({
        supabase,
        toUserId: organizerUser.id,
        communityId: community.id,
        gatheringId: finishedGathering1.id,
      }),
      createTestResourceShoutout({
        supabase,
        toUserId: organizerUser.id,
        communityId: community.id,
        resourceId: offer1.id,
      }),
    ]);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Organizer Agenda Tests', () => {
    beforeAll(async () => {
      // Ensure organizer is signed in for all organizer tests
      await signIn(supabase, organizerUser.email, 'TestPass123!');

      await createTestResourceShoutout({
        supabase,
        toUserId: attendeeUser.id,
        communityId: community.id,
        resourceId: favor1.id,
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

      // Should have at least one item (gatherings as organizer)
      expect(agenda.items.length).toBeGreaterThan(0);
    });

    it('includes upcoming gatherings I am organizing', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - should include upcomingGathering1
      expect(agenda.items).toContainEqual(
        expect.objectContaining({
          id: upcomingGathering1.id,
        }),
      );
      expect(agenda.items).toContainEqual(
        expect.objectContaining({
          id: upcomingGathering2.id,
        }),
      );

      // An agenda item as an organizer
      expect(agenda.items).toContainEqual(
        expect.objectContaining({
          id: upcomingGathering1.id,
          type: 'gathering-organizer',
        }),
      );
      // And an agenda item I am confirmed
      expect(agenda.items).toContainEqual(
        expect.objectContaining({
          id: upcomingGathering1.id,
          type: 'gathering-confirmed',
        }),
      );
    });

    it('does not include completed gatherings I am organizing', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - should not include finishedGathering1
      expect(agenda.items).not.toContainEqual(
        expect.objectContaining({
          id: finishedGathering1.id,
        }),
      );
      expect(agenda.items).not.toContainEqual(
        expect.objectContaining({
          id: finishedGathering2.id,
        }),
      );
    });

    it('includes favors that someone accepted', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - should include favor1
      expect(agenda.items).toContainEqual(
        expect.objectContaining({
          id: favor2.id,
        }),
      );

      // An agenda item as an organizer
      expect(agenda.items).toContainEqual(
        expect.objectContaining({
          id: favor2.id,
          type: 'shoutout-favor',
        }),
      );
    });

    it('excludes favors that I already thanked', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - should not include favor2
      expect(agenda.items).not.toContainEqual(
        expect.objectContaining({
          id: favor1.id,
        }),
      );
    });

    it('excludes favors that no one accepted', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - should not include favor3
      expect(agenda.items).not.toContainEqual(
        expect.objectContaining({
          id: favor3.id,
        }),
      );
    });
  });

  describe('Attendee Agenda Tests', () => {
    beforeAll(async () => {
      // Ensure attendee is signed in for all attendee tests
      await signIn(supabase, attendeeUser.email, 'TestPass123!');
    });

    afterAll(async () => {
      await signOut(supabase);
    });

    it('includes confirmed gatherings in attendee agenda', async () => {
      // Act
      const agenda = await fetchAgenda(supabase);

      // Assert - should include upcomingGathering1
      expect(agenda.items).toContainEqual(
        expect.objectContaining({
          id: upcomingGathering1.id,
        }),
      );
      const gathering = agenda.items.find(
        (item) => item.id === upcomingGathering1.id,
      );
      expect(gathering).toMatchObject({
        type: 'gathering-confirmed',
      });
    });

    it('includes maybe gatherings in attendee agenda', async () => {
      // Act
      const agenda = await fetchAgenda(supabase);

      // Assert - should include upcomingGathering1
      expect(agenda.items).toContainEqual(
        expect.objectContaining({
          id: upcomingGathering2.id,
        }),
      );
      const gathering = agenda.items.find(
        (item) => item.id === upcomingGathering2.id,
      );
      expect(gathering).toMatchObject({
        type: 'gathering-maybe',
      });
    });

    it('includes finished gatherings that I have not sent a shoutout for', async () => {
      // Act
      const agenda = await fetchAgenda(supabase);

      // Assert - should include finishedGathering2
      expect(agenda.items).toContainEqual(
        expect.objectContaining({
          id: finishedGathering2.id,
        }),
      );
      const gathering = agenda.items.find(
        (item) => item.id === finishedGathering2.id,
      );
      expect(gathering).toMatchObject({
        type: 'shoutout-gathering',
      });
    });

    it('excludes gatherings that I sent a shoutout for', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - should not include gathering1
      expect(agenda.items).not.toContainEqual(
        expect.objectContaining({
          id: finishedGathering1.id,
        }),
      );
    });

    it('includes resources that I have not sent a shoutout for', async () => {
      // Act
      const agenda = await fetchAgenda(supabase);

      // Assert - should include resource1
      expect(agenda.items).toContainEqual(
        expect.objectContaining({
          id: offer2.id,
        }),
      );
      const resource = agenda.items.find((item) => item.id === offer2.id);
      expect(resource).toMatchObject({
        type: 'shoutout-offer',
      });
    });

    it('excludes offers that I sent a shoutout for', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - should not include resource2
      expect(agenda.items).not.toContainEqual(
        expect.objectContaining({
          id: offer1.id,
        }),
      );
    });
  });
});

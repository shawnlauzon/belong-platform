import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestGathering,
  createTestResource,
  createTestShoutout,
  createTestGatheringShoutout,
} from '../helpers/test-data';
import { fetchAgenda } from '@/features/agenda/api';
import { joinGathering } from '@/features/gatherings/api';
import { acceptResource } from '@/features/resources/api';
import { joinCommunity } from '@/features/communities/api';
import { signIn, signOut } from '@/features/auth/api';
import type { Agenda } from '@/features/agenda/types';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';
import type { Gathering } from '@/features/gatherings/types';
import type { Resource } from '@/features/resources/types';

describe('Agenda Integration Tests - Core Aggregation', () => {
  let supabase: SupabaseClient<Database>;

  // Two users can cover all scenarios
  let organizerUser: User; // User with organizer gatherings and resources
  let attendeeUser: User; // User who joins gatherings as attendee

  // Organizer user's entities
  let organizerCommunity: Community;
  let organizerGathering1: Gathering;
  let organizerResource: Resource;
  let attendeeGathering: Gathering; // Gathering for attendeeUser to join

  beforeAll(async () => {
    supabase = createTestClient();

    // 1. Create organizer user with community, gatherings, and resources
    organizerUser = await createTestUser(supabase);
    await signIn(supabase, organizerUser.email, 'TestPass123!');
    organizerCommunity = await createTestCommunity(supabase);

    // Create organizer gatherings
    organizerGathering1 = await createTestGathering({
      supabase,
      organizerId: organizerUser.id,
      communityId: organizerCommunity.id,
    });

    await createTestGathering({
      supabase,
      organizerId: organizerUser.id,
      communityId: organizerCommunity.id,
    });

    // Create resource and accept it (shoutout scenario)
    organizerResource = await createTestResource(
      supabase,
      organizerCommunity.id,
    );
    await acceptResource(supabase, organizerResource.id, 'accepted');

    // Create gathering for attendee scenario
    attendeeGathering = await createTestGathering({
      supabase,
      organizerId: organizerUser.id,
      communityId: organizerCommunity.id,
    });

    // 2. Create attendee user and join gathering
    attendeeUser = await createTestUser(supabase);
    await signIn(supabase, attendeeUser.email, 'TestPass123!');
    await joinCommunity(supabase, organizerCommunity.id);
    await joinGathering(supabase, attendeeGathering.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Organizer Agenda Tests', () => {
    beforeAll(async () => {
      // Ensure organizer is signed in for all organizer tests
      await signIn(supabase, organizerUser.email, 'TestPass123!');
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

    it('aggregates data from gatherings correctly', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - Should have agenda items from gathering aggregation
      expect(agenda.items.length).toBeGreaterThan(0);
      const organizerItems = agenda.items.filter(
        (item) => item.type === 'gathering-organizer',
      );
      expect(organizerItems.length).toBeGreaterThan(0);

      // Verify the aggregation includes specific gathering data
      const gatheringItem = organizerItems.find(
        (item) => item.gathering?.id === organizerGathering1.id,
      );
      expect(gatheringItem).toBeDefined();
      expect(gatheringItem!.gathering).toBeDefined();
      expect(gatheringItem!.gathering!.id).toBe(organizerGathering1.id);
    });

    it('correctly represents organizer TodoType', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - Should have organizer todo type
      expect(agenda.items.length).toBeGreaterThan(0);
      const organizerTodos = agenda.items.filter(
        (item) => item.type === 'gathering-organizer',
      );
      expect(organizerTodos.length).toBeGreaterThan(0);

      // Verify todo structure for specific gathering
      const organizerTodo = organizerTodos.find(
        (item) => item.gathering?.id === organizerGathering1.id,
      );
      expect(organizerTodo).toBeDefined();
      expect(organizerTodo!.type).toBe('gathering-organizer');
      expect(organizerTodo!.gathering).toBeDefined();
      expect(organizerTodo!.gathering!.id).toBe(organizerGathering1.id);
    });

    it('correctly transforms gathering data to Todo format', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - Find the gathering todo
      const gatheringTodo = agenda.items.find(
        (item) =>
          item.type === 'gathering-organizer' &&
          item.gathering?.id === organizerGathering1.id,
      );

      expect(gatheringTodo).toBeDefined();
      expect(gatheringTodo!.title).toBe(organizerGathering1.title);
      expect(gatheringTodo!.description).toBe(
        "You're organizing this gathering",
      );
      expect(gatheringTodo!.dueDate).toBeDefined();
      expect(gatheringTodo!.gathering).toBeDefined();
      expect(gatheringTodo!.gathering!.id).toBe(organizerGathering1.id);
    });

    it('correctly populates optional fields (gathering/resource)', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - Gathering todos should have gathering field populated
      const gatheringTodos = agenda.items.filter((item) =>
        item.type.startsWith('gathering-'),
      );

      for (const todo of gatheringTodos) {
        expect(todo.gathering).toBeDefined();
        expect(todo.gathering!.id).toBeDefined();
        expect(todo.resource).toBeUndefined(); // Should not have resource field
      }

      // Assert - Shoutout todos should have resource field populated (if any)
      const shoutoutTodos = agenda.items.filter((item) =>
        item.type.startsWith('shoutout-'),
      );

      for (const todo of shoutoutTodos) {
        if (todo.type === 'shoutout-offer') {
          expect(todo.resource).toBeDefined();
          expect(todo.resource!.id).toBeDefined();
          expect(todo.gathering).toBeUndefined(); // Should not have gathering field
        }
      }
    });

    it('places shoutouts before gatherings in agenda', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - If we have both types, shoutouts should come first
      const shoutoutIndices = agenda.items
        .map((item, index) => (item.type.startsWith('shoutout-') ? index : -1))
        .filter((index) => index >= 0);

      const gatheringIndices = agenda.items
        .map((item, index) => (item.type.startsWith('gathering-') ? index : -1))
        .filter((index) => index >= 0);

      if (shoutoutIndices.length > 0 && gatheringIndices.length > 0) {
        const lastShoutoutIndex = Math.max(...shoutoutIndices);
        const firstGatheringIndex = Math.min(...gatheringIndices);
        expect(lastShoutoutIndex).toBeLessThan(firstGatheringIndex);
      }
    });

    it('sorts gatherings by due date (earliest first)', async () => {
      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - Gathering todos should be sorted by due date
      const gatheringTodos = agenda.items.filter(
        (item) => item.type.startsWith('gathering-') && item.dueDate,
      );

      if (gatheringTodos.length > 1) {
        for (let i = 1; i < gatheringTodos.length; i++) {
          const prevDate = new Date(gatheringTodos[i - 1].dueDate!);
          const currentDate = new Date(gatheringTodos[i].dueDate!);
          expect(prevDate.getTime()).toBeLessThanOrEqual(currentDate.getTime());
        }
      }
    });

    it('excludes gatherings with shoutouts from agenda', async () => {
      // Arrange - Create a gathering and then create a shoutout for it
      const gatheringWithShoutout = await createTestGathering({
        supabase,
        organizerId: organizerUser.id,
        communityId: organizerCommunity.id,
      });

      // Create a second user to send shoutout from
      const shoutoutSender = await createTestUser(supabase);
      await signIn(supabase, shoutoutSender.email, 'TestPass123!');
      await joinCommunity(supabase, organizerCommunity.id);

      // Create a shoutout for this gathering
      await createTestGatheringShoutout({
        supabase,
        toUserId: organizerUser.id, // Shoutout to the organizer
        gatheringId: gatheringWithShoutout.id,
        communityId: organizerCommunity.id,
      });

      // Switch back to organizer user to check their agenda
      await signIn(supabase, organizerUser.email, 'TestPass123!');

      // Act
      const agenda: Agenda = await fetchAgenda(supabase);

      // Assert - The gathering with shoutout should NOT appear in agenda
      const gatheringTodos = agenda.items.filter(
        (item) => item.type.startsWith('gathering-') && 
        item.gathering?.id === gatheringWithShoutout.id,
      );

      expect(gatheringTodos).toHaveLength(0);

      // Verify that other gatherings without shoutouts still appear
      const allGatheringTodos = agenda.items.filter(
        (item) => item.type.startsWith('gathering-'),
      );
      expect(allGatheringTodos.length).toBeGreaterThan(0);

      // Verify the gathering still exists but just isn't in agenda
      expect(gatheringWithShoutout.id).toBeDefined();
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

    it('includes accepted gatherings in attendee agenda', async () => {
      // Act
      const agenda = await fetchAgenda(supabase);

      console.log('🐛 DEBUG: Attendee agenda', {
        totalItems: agenda.items.length,
        itemTypes: agenda.items.map((item) => item.type),
        gatheringAttendeeItems: agenda.items.filter(
          (item) => item.type === 'gathering-confirmed',
        ),
        allGatheringItems: agenda.items.filter((item) =>
          item.type.startsWith('gathering-'),
        ),
        targetGatheringId: attendeeGathering.id,
      });

      // Assert - attendeeUser should see gathering they joined as attendee
      const attendeeTodos = agenda.items.filter(
        (item) =>
          item.type === 'gathering-confirmed' &&
          item.gathering?.id === attendeeGathering.id,
      );

      expect(attendeeTodos.length).toBe(1);
      expect(attendeeTodos[0].title).toBe(attendeeGathering.title);
      expect(attendeeTodos[0].gathering?.id).toBe(attendeeGathering.id);
    });
  });
});

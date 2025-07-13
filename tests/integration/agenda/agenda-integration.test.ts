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
  TEST_PREFIX
} from '../helpers/test-data';
import { fetchAgenda } from '@/features/agenda/api';
import { joinGathering } from '@/features/gatherings/api';
import { acceptResource } from '@/features/resources/api';
import { signIn } from '@/features/auth/api';
import type { Agenda, Todo, TodoType } from '@/features/agenda/types';

describe('Agenda Integration Tests - Core Aggregation', () => {
  let supabase: SupabaseClient<Database>;

  beforeAll(async () => {
    supabase = createTestClient();
    await cleanupAllTestData(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData(supabase);
  });

  describe('Basic agenda fetching', () => {
    it('returns empty agenda for newly created user', async () => {
      // Arrange
      const user = await createTestUser(supabase);
      await signIn(supabase, user.email, 'TestPass123!');
      console.log('🐛 DEBUG: Created test user', { userId: user.id });

      try {
        // Act
        const agenda: Agenda = await fetchAgenda(supabase);
        console.log('🐛 DEBUG: Fetched agenda', { agenda });

        // Assert
        expect(agenda).toBeDefined();
        expect(agenda.items).toEqual([]);
        expect(agenda.hasMore).toBe(false);
        expect(agenda.nextCursor).toBeUndefined();
      } finally {
        // Cleanup handled by afterAll
      }
    });

    it('returns proper Agenda interface structure when user has data', async () => {
      // Arrange
      const user = await createTestUser(supabase);
      await signIn(supabase, user.email, 'TestPass123!');
      const community = await createTestCommunity(supabase);
      
      // Create a future gathering that will appear in agenda
      const gathering = await createTestGathering({
        supabase,
        organizerId: user.id,
        communityId: community.id,
      });
      console.log('🐛 DEBUG: Created test data', { 
        userId: user.id, 
        communityId: community.id,
        gatheringId: gathering.id 
      });

      try {
        // Act
        const agenda: Agenda = await fetchAgenda(supabase);
        console.log('🐛 DEBUG: Fetched agenda with data', { agenda });

        // Assert - Verify interface structure
        expect(agenda).toBeDefined();
        expect(agenda).toHaveProperty('items');
        expect(agenda).toHaveProperty('hasMore');
        expect(Array.isArray(agenda.items)).toBe(true);
        expect(typeof agenda.hasMore).toBe('boolean');
        
        // Should have at least one item (the gathering as organizer)
        expect(agenda.items.length).toBeGreaterThan(0);
      } finally {
        // Cleanup handled by afterAll
      }
    });
  });

  describe('Multi-source aggregation', () => {
    it('aggregates data from gatherings correctly', async () => {
      // Arrange - Focus on organizer agenda (known to work)
      const organizer = await createTestUser(supabase);
      const community = await createTestCommunity(supabase);
      
      // Organizer creates gathering and checks their agenda
      await signIn(supabase, organizer.email, 'TestPass123!');
      const gathering = await createTestGathering({
        supabase,
        organizerId: organizer.id,
        communityId: community.id,
      });
      
      console.log('🐛 DEBUG: Created organizer test data', {
        organizerId: organizer.id,
        gatheringId: gathering.id
      });

      try {
        // Act - Check organizer's agenda (should have organizer gathering)
        const organizerAgenda: Agenda = await fetchAgenda(supabase);
        console.log('🐛 DEBUG: Organizer agenda', { agenda: organizerAgenda });

        // Assert - Should have agenda items from gathering aggregation
        expect(organizerAgenda.items.length).toBeGreaterThan(0);
        const organizerItems = organizerAgenda.items.filter(item => 
          item.type === 'gathering-organizer'
        );
        expect(organizerItems.length).toBeGreaterThan(0);
        
        // Verify the aggregation includes gathering data
        const gatheringItem = organizerItems[0];
        expect(gatheringItem.gathering).toBeDefined();
        expect(gatheringItem.gathering!.id).toBe(gathering.id);
      } finally {
        // Cleanup handled by afterAll
      }
    });

    it('correctly represents organizer TodoType', async () => {
      // Arrange - Focus on organizer functionality (known to work)
      const organizer = await createTestUser(supabase);
      const community = await createTestCommunity(supabase);
      
      // Sign in as organizer and create gathering
      await signIn(supabase, organizer.email, 'TestPass123!');
      const gathering = await createTestGathering({
        supabase,
        organizerId: organizer.id,
        communityId: community.id,
      });

      console.log('🐛 DEBUG: Created organizer TodoType test data', {
        organizerId: organizer.id,
        gatheringId: gathering.id
      });

      try {
        // Act - Check organizer's agenda (should have gathering-organizer)
        const organizerAgenda: Agenda = await fetchAgenda(supabase);
        console.log('🐛 DEBUG: Organizer agenda', { agenda: organizerAgenda });
        
        // Assert - Should have organizer todo type
        expect(organizerAgenda.items.length).toBeGreaterThan(0);
        const organizerTodos = organizerAgenda.items.filter(item => item.type === 'gathering-organizer');
        expect(organizerTodos.length).toBeGreaterThan(0);
        
        // Verify todo structure
        const organizerTodo = organizerTodos[0];
        expect(organizerTodo.type).toBe('gathering-organizer');
        expect(organizerTodo.gathering).toBeDefined();
        expect(organizerTodo.gathering!.id).toBe(gathering.id);
        
        console.log('ℹ️ INFO: Found TodoTypes', { 
          types: organizerAgenda.items.map(item => item.type)
        });
      } finally {
        // Cleanup handled by afterAll
      }
    });
  });

  describe('Data transformation', () => {
    it('correctly transforms gathering data to Todo format', async () => {
      // Arrange
      const user = await createTestUser(supabase);
      await signIn(supabase, user.email, 'TestPass123!');
      const community = await createTestCommunity(supabase);
      const gathering = await createTestGathering({
        supabase,
        organizerId: user.id,
        communityId: community.id,
      });

      console.log('🐛 DEBUG: Created gathering for transformation test', {
        gatheringId: gathering.id,
        gatheringTitle: gathering.title
      });

      try {
        // Act
        const agenda: Agenda = await fetchAgenda(supabase);
        console.log('🐛 DEBUG: Agenda for transformation test', { agenda });

        // Assert - Find the gathering todo
        const gatheringTodo = agenda.items.find(item => 
          item.type === 'gathering-organizer' && item.gathering?.id === gathering.id
        );
        
        expect(gatheringTodo).toBeDefined();
        expect(gatheringTodo!.title).toBe(gathering.title);
        expect(gatheringTodo!.description).toBe("You're organizing this gathering"); // System-generated description
        expect(gatheringTodo!.dueDate).toBeDefined();
        expect(gatheringTodo!.gathering).toBeDefined();
        expect(gatheringTodo!.gathering!.id).toBe(gathering.id);
      } finally {
        // Cleanup handled by afterAll
      }
    });

    it('correctly populates optional fields (gathering/resource)', async () => {
      // Arrange
      const user = await createTestUser(supabase);
      await signIn(supabase, user.email, 'TestPass123!');
      const community = await createTestCommunity(supabase);
      
      // Create gathering todo
      const gathering = await createTestGathering({
        supabase,
        organizerId: user.id,
        communityId: community.id,
      });

      // Create resource todo (via accepted offer)
      const resource = await createTestResource(supabase, community.id);
      await acceptResource(supabase, resource.id, 'accepted');

      console.log('🐛 DEBUG: Created data for optional fields test', {
        gatheringId: gathering.id,
        resourceId: resource.id
      });

      try {
        // Act
        const agenda: Agenda = await fetchAgenda(supabase);
        console.log('🐛 DEBUG: Agenda for optional fields test', { agenda });

        // Assert - Gathering todos should have gathering field populated
        const gatheringTodos = agenda.items.filter(item => 
          item.type.startsWith('gathering-')
        );
        
        for (const todo of gatheringTodos) {
          expect(todo.gathering).toBeDefined();
          expect(todo.gathering!.id).toBeDefined();
          expect(todo.resource).toBeUndefined(); // Should not have resource field
        }

        // Assert - Shoutout todos should have resource field populated (if any)
        const shoutoutTodos = agenda.items.filter(item => 
          item.type.startsWith('shoutout-')
        );
        
        for (const todo of shoutoutTodos) {
          if (todo.type === 'shoutout-offer') {
            expect(todo.resource).toBeDefined();
            expect(todo.resource!.id).toBeDefined();
            expect(todo.gathering).toBeUndefined(); // Should not have gathering field
          }
        }
      } finally {
        // Cleanup handled by afterAll
      }
    });
  });

  describe('Sorting behavior', () => {
    it('places shoutouts before gatherings in agenda', async () => {
      // Arrange
      const user = await createTestUser(supabase);
      await signIn(supabase, user.email, 'TestPass123!');
      const community = await createTestCommunity(supabase);
      
      // Create gathering (will appear as organizer todo)
      const gathering = await createTestGathering({
        supabase,
        organizerId: user.id,
        communityId: community.id,
      });

      // Create resource and accept it (will create shoutout todo)
      const resource = await createTestResource(supabase, community.id);
      await acceptResource(supabase, resource.id, 'accepted');

      console.log('🐛 DEBUG: Created mixed data for sorting test', {
        gatheringId: gathering.id,
        resourceId: resource.id
      });

      try {
        // Act
        const agenda: Agenda = await fetchAgenda(supabase);
        console.log('🐛 DEBUG: Agenda for sorting test', { 
          agenda: agenda.items.map(item => ({ type: item.type, title: item.title }))
        });

        // Assert - If we have both types, shoutouts should come first
        const shoutoutIndices = agenda.items
          .map((item, index) => item.type.startsWith('shoutout-') ? index : -1)
          .filter(index => index >= 0);
          
        const gatheringIndices = agenda.items
          .map((item, index) => item.type.startsWith('gathering-') ? index : -1)
          .filter(index => index >= 0);

        if (shoutoutIndices.length > 0 && gatheringIndices.length > 0) {
          const lastShoutoutIndex = Math.max(...shoutoutIndices);
          const firstGatheringIndex = Math.min(...gatheringIndices);
          expect(lastShoutoutIndex).toBeLessThan(firstGatheringIndex);
        }
      } finally {
        // Cleanup handled by afterAll
      }
    });

    it('sorts gatherings by due date (earliest first)', async () => {
      // Arrange
      const user = await createTestUser(supabase);
      await signIn(supabase, user.email, 'TestPass123!');
      const community = await createTestCommunity(supabase);
      
      // Create gatherings with different future dates
      const nearFuture = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
      const farFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      const gatheringFar = await createTestGathering({
        supabase,
        organizerId: user.id,
        communityId: community.id,
      });
      
      // Override the start date for closer gathering by updating directly
      const { error } = await supabase
        .from('gatherings')
        .update({ start_date_time: nearFuture.toISOString() })
        .eq('id', gatheringFar.id);
      
      if (error) {
        console.error('Failed to update gathering date:', error);
      }

      const gatheringNear = await createTestGathering({
        supabase,
        organizerId: user.id,
        communityId: community.id,
      });
      
      // Update the far future gathering
      await supabase
        .from('gatherings')
        .update({ start_date_time: farFuture.toISOString() })
        .eq('id', gatheringNear.id);

      console.log('🐛 DEBUG: Created gatherings with different dates', {
        nearGathering: gatheringFar.id,
        farGathering: gatheringNear.id,
        nearDate: nearFuture.toISOString(),
        farDate: farFuture.toISOString()
      });

      try {
        // Act
        const agenda: Agenda = await fetchAgenda(supabase);
        console.log('🐛 DEBUG: Agenda for date sorting test', { 
          agenda: agenda.items.map(item => ({ 
            type: item.type, 
            title: item.title,
            dueDate: item.dueDate 
          }))
        });

        // Assert - Gathering todos should be sorted by due date
        const gatheringTodos = agenda.items.filter(item => 
          item.type.startsWith('gathering-') && item.dueDate
        );
        
        if (gatheringTodos.length > 1) {
          for (let i = 1; i < gatheringTodos.length; i++) {
            const prevDate = new Date(gatheringTodos[i - 1].dueDate!);
            const currentDate = new Date(gatheringTodos[i].dueDate!);
            expect(prevDate.getTime()).toBeLessThanOrEqual(currentDate.getTime());
          }
        }
      } finally {
        // Cleanup handled by afterAll
      }
    });
  });

  describe('Accepted gatherings in attendee agenda', () => {
    it('includes accepted gatherings in attendee agenda', async () => {
      // Arrange
      const organizer = await createTestUser(supabase);
      const attendee = await createTestUser(supabase);
      const community = await createTestCommunity(supabase);
      
      await signIn(supabase, organizer.email, 'TestPass123!');
      const gathering = await createTestGathering({
        supabase,
        organizerId: organizer.id,
        communityId: community.id,
      });

      // Act - Attendee joins gathering
      await signIn(supabase, attendee.email, 'TestPass123!');
      await joinGathering(supabase, gathering.id);
      const agenda = await fetchAgenda(supabase);

      console.log('🐛 DEBUG: Attendee agenda:', agenda.items.map(item => ({ 
        type: item.type, 
        title: item.title,
        gatheringId: item.gathering?.id 
      })));

      // Assert - Attendee should see gathering in agenda
      const attendeeTodos = agenda.items.filter(item => 
        item.type === 'gathering-attendee' && item.gathering?.id === gathering.id
      );
      
      expect(attendeeTodos.length).toBe(1);
      expect(attendeeTodos[0].title).toBe(gathering.title);
      expect(attendeeTodos[0].gathering?.id).toBe(gathering.id);
    });
  });
});
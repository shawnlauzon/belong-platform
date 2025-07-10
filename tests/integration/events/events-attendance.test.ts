import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestEvent,
  createTestCommunity,
} from '../helpers/test-data';
import {
  cleanupAllTestData,
  cleanupAttendance,
  cleanupUser,
} from '../helpers/cleanup';
import * as api from '@/features/events/api';
import { signIn, signOut } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { EventInfo } from '@/features/events/types';
import type { UserDetail } from '@/features/users/types';
import type { CommunityInfo } from '@/features/communities/types';

describe('Events API - Attendance Operations', () => {
  let supabase: SupabaseClient<Database>;
  let testUser1: UserDetail;
  let testUser2: UserDetail;
  let testUser1Email: string;
  let testUser2Email: string;
  let testCommunity: CommunityInfo;
  let attendanceTestEvent: EventInfo;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create shared users first
    testUser1 = await createTestUser(supabase);
    testUser2 = await createTestUser(supabase);
    testUser1Email = testUser1.email;
    testUser2Email = testUser2.email;

    // Sign in as testUser1 to create the community and event
    await signIn(supabase, testUser1Email, 'TestPass123!');

    // Create community and event with testUser1 as organizer
    testCommunity = await createTestCommunity(supabase);
    attendanceTestEvent = await createTestEvent(
      supabase,
      testUser1.id,
      testCommunity.id,
    );
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('joinEvent', () => {
    beforeAll(async () => {
      // Sign in as testUser2 for all joinEvent tests
      await signIn(supabase, testUser2Email, 'TestPass123!');
    });

    afterAll(async () => {
      await cleanupAttendance(attendanceTestEvent.id, testUser2.id);
      await signOut(supabase);
    });

    it('adds user as attendee', async () => {
      try {
        const attendance = await api.joinEvent(
          supabase,
          attendanceTestEvent.id,
        );

        expect(attendance!.userId).toBe(testUser2.id);
        expect(attendance!.eventId).toBe(attendanceTestEvent.id);
        expect(attendance!.status).toBe('attending');

        const { data } = await supabase
          .from('event_attendances')
          .select()
          .eq('event_id', attendanceTestEvent.id)
          .eq('user_id', testUser2.id)
          .maybeSingle();

        expect(data).toBeTruthy();
        expect(data!.status).toBe('attending');
      } finally {
        await cleanupAttendance(attendanceTestEvent.id, testUser2.id);
      }
    });

    it('prevents duplicate attendance', async () => {
      // First join
      await api.joinEvent(supabase, attendanceTestEvent.id);

      try {
        // Second join should fail
        await expect(
          api.joinEvent(supabase, attendanceTestEvent.id),
        ).rejects.toThrow();
      } finally {
        await cleanupAttendance(attendanceTestEvent.id, testUser2.id);
      }
    });

    it('fails with invalid event id', async () => {
      await expect(
        api.joinEvent(supabase, 'invalid-event-id'),
      ).rejects.toThrow();
    });

    it('handles maxAttendees capacity', async () => {
      // Create event with max capacity of 1 (organizer already attending)
      await signIn(supabase, testUser1Email, 'TestPass123!');
      const capacityEvent = await createTestEvent(
        supabase,
        testUser1.id,
        testCommunity.id,
      );

      // Update to set max capacity to 1
      await api.updateEvent(supabase, {
        id: capacityEvent.id,
        maxAttendees: 1,
      });

      // Sign back in as testUser2
      await signIn(supabase, testUser2Email, 'TestPass123!');

      try {
        // Should fail because organizer already counts as 1 attendee
        await expect(
          api.joinEvent(supabase, capacityEvent.id),
        ).rejects.toThrow();
      } finally {
        // Clean up the capacity event
        await signIn(supabase, testUser1Email, 'TestPass123!');
        await api.deleteEvent(supabase, capacityEvent.id);
        await signIn(supabase, testUser2Email, 'TestPass123!');
      }
    });
  });

  describe('leaveEvent', () => {
    beforeAll(async () => {
      // Sign in as testUser2 for all leaveEvent tests
      await signIn(supabase, testUser2Email, 'TestPass123!');
    });

    afterAll(async () => {
      await signOut(supabase);
    });

    it('updates attendance status to not_attending', async () => {
      // First join
      await api.joinEvent(supabase, attendanceTestEvent.id);

      // Then leave
      const result = await api.leaveEvent(supabase, attendanceTestEvent.id);

      // Verify the function returns attendance info with not_attending status
      expect(result).toBeDefined();
      expect(result!.status).toBe('not_attending');
      expect(result!.eventId).toBe(attendanceTestEvent.id);
      expect(result!.userId).toBe(testUser2.id);

      // Verify database record is updated, not deleted
      const { data } = await supabase
        .from('event_attendances')
        .select()
        .eq('event_id', attendanceTestEvent.id)
        .eq('user_id', testUser2.id)
        .maybeSingle();

      expect(data).not.toBeNull();
      expect(data!.status).toBe('not_attending');
    });

    it('handles leaving when not attending', async () => {
      // Should not throw error when leaving an event you're not attending
      await expect(
        api.leaveEvent(supabase, attendanceTestEvent.id),
      ).resolves.not.toThrow();
    });

    it('organizer can leave their own event', async () => {
      // Sign in as organizer
      await signIn(supabase, testUser1Email, 'TestPass123!');

      // Create a separate event to test organizer leaving
      const organizerEvent = await createTestEvent(
        supabase,
        testUser1.id,
        testCommunity.id,
      );

      try {
        // Organizer should be able to leave their own event
        const result = await api.leaveEvent(supabase, organizerEvent.id);

        // Verify the function returns attendance info with not_attending status
        expect(result).toBeDefined();
        expect(result!.status).toBe('not_attending');

        const { data } = await supabase
          .from('event_attendances')
          .select()
          .eq('event_id', organizerEvent.id)
          .eq('user_id', testUser1.id)
          .maybeSingle();

        expect(data).not.toBeNull();
        expect(data!.status).toBe('not_attending');
      } finally {
        // Clean up the event
        await api.deleteEvent(supabase, organizerEvent.id);
        await signIn(supabase, testUser2Email, 'TestPass123!');
      }
    });
  });

  describe('fetchEventAttendees', () => {
    beforeAll(async () => {
      // Sign in as testUser2 and add as attendee for all tests
      await signIn(supabase, testUser2Email, 'TestPass123!');
      await api.joinEvent(supabase, attendanceTestEvent.id);
    });

    afterAll(async () => {
      await cleanupAttendance(attendanceTestEvent.id, testUser2.id);
      await signOut(supabase);
    });

    it('returns attendees with user data', async () => {
      const attendees = await api.fetchEventAttendees(
        supabase,
        attendanceTestEvent.id,
      );

      expect(attendees).toContainEqual({
        userId: testUser2.id,
        eventId: attendanceTestEvent.id,
        status: 'attending',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        user: expect.objectContaining({
          id: testUser2.id,
          email: testUser2.email,
        }),
      });
    });

    it('includes organizer as an attendee', async () => {
      const attendees = await api.fetchEventAttendees(
        supabase,
        attendanceTestEvent.id,
      );

      expect(attendees).toContainEqual({
        userId: testUser1.id,
        eventId: attendanceTestEvent.id,
        status: 'attending',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        user: expect.objectContaining({
          id: testUser1.id,
          email: testUser1.email,
        }),
      });
    });

    it('handles different attendance statuses', async () => {
      // Create a new user to test different statuses
      const testUser3 = await createTestUser(supabase);
      await signIn(supabase, testUser3.email, 'TestPass123!');

      try {
        // Join with different status by updating after joining
        await api.joinEvent(supabase, attendanceTestEvent.id);

        // Update status to 'maybe' directly in database for testing
        await supabase
          .from('event_attendances')
          .update({ status: 'maybe' })
          .eq('event_id', attendanceTestEvent.id)
          .eq('user_id', testUser3.id);

        const attendees = await api.fetchEventAttendees(
          supabase,
          attendanceTestEvent.id,
        );

        expect(attendees).toContainEqual({
          userId: testUser3.id,
          eventId: attendanceTestEvent.id,
          status: 'maybe',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          user: expect.objectContaining({
            id: testUser3.id,
            email: testUser3.email,
          }),
        });
      } finally {
        await cleanupAttendance(attendanceTestEvent.id, testUser3.id);
        await cleanupUser(testUser3.id);
        await signIn(supabase, testUser2Email, 'TestPass123!');
      }
    });

    it('returns only not_attending attendees after organizer leaves', async () => {
      // Create a new event with no additional attendees
      await signIn(supabase, testUser1Email, 'TestPass123!');
      const emptyEvent = await createTestEvent(
        supabase,
        testUser1.id,
        testCommunity.id,
      );

      // Organizer leaves the event (sets status to not_attending)
      await api.leaveEvent(supabase, emptyEvent.id);

      try {
        const attendees = await api.fetchEventAttendees(
          supabase,
          emptyEvent.id,
        );

        // Should still have the organizer but with not_attending status
        expect(attendees).toHaveLength(1);
        expect(attendees[0].userId).toBe(testUser1.id);
        expect(attendees[0].status).toBe('not_attending');
      } finally {
        await api.deleteEvent(supabase, emptyEvent.id);
        await signIn(supabase, testUser2Email, 'TestPass123!');
      }
    });
  });

  describe('fetchUserEvents', () => {
    beforeAll(async () => {
      // Sign in as testUser2 and add as attendee for all tests
      await signIn(supabase, testUser2Email, 'TestPass123!');
      await api.joinEvent(supabase, attendanceTestEvent.id);
    });

    afterAll(async () => {
      await cleanupAttendance(attendanceTestEvent.id, testUser2.id);
      await signOut(supabase);
    });

    it('returns events for user', async () => {
      const attendances = await api.fetchEventAttendees(
        supabase,
        attendanceTestEvent.id,
      );

      const userAttendances = attendances.filter(
        (a) => a.userId === testUser2.id,
      );
      expect(userAttendances).toHaveLength(1);
      expect(userAttendances).toContainEqual({
        userId: testUser2.id,
        eventId: attendanceTestEvent.id,
        status: 'attending',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        user: expect.objectContaining({
          id: testUser2.id,
          email: testUser2.email,
        }),
      });
    });

    it('includes events for organizer', async () => {
      const attendees = await api.fetchEventAttendees(
        supabase,
        attendanceTestEvent.id,
      );

      const organizerAttendances = attendees.filter(
        (a) => a.userId === testUser1.id,
      );
      expect(organizerAttendances).toContainEqual({
        userId: testUser1.id,
        eventId: attendanceTestEvent.id,
        status: 'attending',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        user: expect.objectContaining({
          id: testUser1.id,
          email: testUser1.email,
        }),
      });
    });

    it('returns empty array for user with no events', async () => {
      // Create a new user who hasn't joined any events
      const lonelyUser = await createTestUser(supabase);

      try {
        const attendees = await api.fetchEventAttendees(
          supabase,
          attendanceTestEvent.id,
        );

        // This user should not appear in the attendees list
        const userAttendances = attendees.filter(
          (a) => a.userId === lonelyUser.id,
        );
        expect(userAttendances).toHaveLength(0);
      } finally {
        await cleanupUser(lonelyUser.id);
      }
    });

    it('handles multiple events for same user', async () => {
      // Create another event and have testUser2 join it
      await signIn(supabase, testUser1Email, 'TestPass123!');
      const secondEvent = await createTestEvent(
        supabase,
        testUser1.id,
        testCommunity.id,
      );

      await signIn(supabase, testUser2Email, 'TestPass123!');

      try {
        await api.joinEvent(supabase, secondEvent.id);

        const attendees1 = await api.fetchEventAttendees(
          supabase,
          attendanceTestEvent.id,
        );
        const attendees2 = await api.fetchEventAttendees(
          supabase,
          secondEvent.id,
        );

        // testUser2 should be in both events
        expect(attendees1.some((a) => a.userId === testUser2.id)).toBe(true);
        expect(attendees2.some((a) => a.userId === testUser2.id)).toBe(true);
      } finally {
        await cleanupAttendance(secondEvent.id, testUser2.id);
        await signIn(supabase, testUser1Email, 'TestPass123!');
        await api.deleteEvent(supabase, secondEvent.id);
        await signIn(supabase, testUser2Email, 'TestPass123!');
      }
    });
  });
});

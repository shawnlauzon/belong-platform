import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestEvent,
  createTestCommunity,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import * as api from '@/features/events/api';
import { signIn, signOut } from '@/features/auth/api';
import { createFakeEventData } from '@/features/events/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { EventInfo } from '@/features/events/types';
import type { UserDetail } from '@/features/users/types';
import type { CommunityInfo } from '@/features/communities/types';

describe('Events API - Authentication Requirements', () => {
  let authenticatedClient: SupabaseClient<Database>;
  let unauthenticatedClient: SupabaseClient<Database>;
  let testUser: UserDetail;
  let testCommunity: CommunityInfo;
  let testEvent: EventInfo;

  beforeAll(async () => {
    // Set up authenticated client and test data
    authenticatedClient = createTestClient();

    // Create test data with authenticated client
    testUser = await createTestUser(authenticatedClient);
    await signIn(authenticatedClient, testUser.email, 'TestPass123!');

    testCommunity = await createTestCommunity(authenticatedClient);
    testEvent = await createTestEvent(
      authenticatedClient,
      testUser.id,
      testCommunity.id,
    );

    // Set up unauthenticated client
    unauthenticatedClient = createTestClient();
    await signOut(unauthenticatedClient);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Unauthenticated Read Operations', () => {
    describe('fetchEvents', () => {
      it('allows unauthenticated access', async () => {
        const events = await api.fetchEvents(unauthenticatedClient);

        expect(Array.isArray(events)).toBe(true);
        expect(events.some((e) => e.id === testEvent.id)).toBe(true);
      });

      it('allows unauthenticated access with filters', async () => {
        const events = await api.fetchEvents(unauthenticatedClient, {
          title: 'test',
          organizerId: testUser.id,
          communityId: testCommunity.id,
        });

        expect(Array.isArray(events)).toBe(true);
      });

      it('allows unauthenticated access with date filters', async () => {
        const events = await api.fetchEvents(unauthenticatedClient, {
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          endDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
        });

        expect(Array.isArray(events)).toBe(true);
      });
    });

    describe('fetchEventInfoById', () => {
      it('allows unauthenticated access to existing event', async () => {
        const result = await api.fetchEventInfoById(
          unauthenticatedClient,
          testEvent.id,
        );

        expect(result).toBeTruthy();
        expect(result!.id).toBe(testEvent.id);
        expect(result!.title).toBe(testEvent.title);
      });

      it('returns null for non-existent event without authentication', async () => {
        const result = await api.fetchEventInfoById(
          unauthenticatedClient,
          '00000000-0000-0000-0000-000000000000',
        );

        expect(result).toBeNull();
      });
    });

    describe('fetchEventAttendees', () => {
      it('allows unauthenticated access to event attendees', async () => {
        const attendees = await api.fetchEventAttendees(
          unauthenticatedClient,
          testEvent.id,
        );

        expect(Array.isArray(attendees)).toBe(true);
        expect(attendees.some((a) => a.userId === testUser.id)).toBe(true);
      });
    });
  });

  describe('Unauthenticated Write Operations', () => {
    describe('createEvent', () => {
      it('requires authentication', async () => {
        const data = createFakeEventData({
          title: `${TEST_PREFIX}Unauth_Create_Test`,
          organizerId: testUser.id,
          communityId: testCommunity.id,
          startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          imageUrls: undefined,
        });

        await expect(
          api.createEvent(unauthenticatedClient, data),
        ).rejects.toThrow();
      });
    });

    describe('updateEvent', () => {
      it('requires authentication', async () => {
        await expect(
          api.updateEvent(unauthenticatedClient, {
            id: testEvent.id,
            title: 'Unauthorized Update Attempt',
          }),
        ).rejects.toThrow();
      });

      it('requires authentication even for non-existent event', async () => {
        await expect(
          api.updateEvent(unauthenticatedClient, {
            id: '00000000-0000-0000-0000-000000000000',
            title: 'Test',
          }),
        ).rejects.toThrow();
      });
    });

    describe('deleteEvent', () => {
      it('requires authentication', async () => {
        await expect(
          api.deleteEvent(unauthenticatedClient, testEvent.id),
        ).rejects.toThrow();
      });

      it('requires authentication even for non-existent event', async () => {
        await expect(
          api.deleteEvent(
            unauthenticatedClient,
            '00000000-0000-0000-0000-000000000000',
          ),
        ).rejects.toThrow();
      });
    });

    describe('joinEvent', () => {
      it('requires authentication', async () => {
        await expect(
          api.joinEvent(unauthenticatedClient, testEvent.id),
        ).rejects.toThrow();
      });
    });

    describe('leaveEvent', () => {
      it('requires authentication', async () => {
        await expect(
          api.leaveEvent(unauthenticatedClient, testEvent.id),
        ).rejects.toThrow();
      });
    });
  });

  describe('Security Boundary Verification', () => {
    it('authenticated client can create events', async () => {
      const data = createFakeEventData({
        title: `${TEST_PREFIX}Auth_Create_Test_${Date.now()}`,
        organizerId: testUser.id,
        communityId: testCommunity.id,
        startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        imageUrls: undefined,
      });

      const event = await api.createEvent(authenticatedClient, data);
      expect(event).toBeTruthy();
      expect(event!.title).toBe(data.title);
    });

    it('authenticated client can update own events', async () => {
      const newTitle = `${TEST_PREFIX}Auth_Update_Test_${Date.now()}`;

      const updated = await api.updateEvent(authenticatedClient, {
        id: testEvent.id,
        title: newTitle,
      });

      expect(updated).toBeTruthy();
      expect(updated!.title).toBe(newTitle);
    });

    it('authenticated client can join and leave events', async () => {
      // Create a second user and event
      const secondUser = await createTestUser(authenticatedClient);
      await signIn(authenticatedClient, secondUser.email, 'TestPass123!');

      // Join the existing test event
      const attendance = await api.joinEvent(authenticatedClient, testEvent.id);

      expect(attendance).toBeTruthy();
      expect(attendance!.eventId).toBe(testEvent.id);
      expect(attendance!.userId).toBe(secondUser.id);

      // Leave the event
      const leaveResult = await api.leaveEvent(authenticatedClient, testEvent.id);

      // Verify leave operation returned attendance info with not_attending status
      expect(leaveResult).toBeDefined();
      expect(leaveResult!.status).toBe('not_attending');
      expect(leaveResult!.eventId).toBe(testEvent.id);
      expect(leaveResult!.userId).toBe(secondUser.id);

      // Verify attendance record still exists but with not_attending status
      const attendees = await api.fetchEventAttendees(
        authenticatedClient,
        testEvent.id,
      );
      const userAttendance = attendees.find((a) => a.userId === secondUser.id);
      expect(userAttendance).toBeDefined();
      expect(userAttendance!.status).toBe('not_attending');
    });

    it('authenticated client can delete own events', async () => {
      // Create a new event to delete
      const deleteData = createFakeEventData({
        title: `${TEST_PREFIX}Auth_Delete_Test_${Date.now()}`,
        organizerId: testUser.id,
        communityId: testCommunity.id,
        startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        imageUrls: undefined,
      });

      // Sign back in as original user
      await signIn(authenticatedClient, testUser.email, 'TestPass123!');
      const eventToDelete = await api.createEvent(
        authenticatedClient,
        deleteData,
      );

      // Delete the event
      await api.deleteEvent(authenticatedClient, eventToDelete!.id);

      // Verify event is deleted
      const result = await api.fetchEventInfoById(
        authenticatedClient,
        eventToDelete!.id,
      );
      expect(result).toBeNull();
    });

    it('unauthenticated fetch still works after authenticated operations', async () => {
      // Verify that unauthenticated read access still works after auth operations
      const events = await api.fetchEvents(unauthenticatedClient);
      expect(Array.isArray(events)).toBe(true);

      const event = await api.fetchEventInfoById(
        unauthenticatedClient,
        testEvent.id,
      );
      expect(event).toBeTruthy();
    });

    it('handles datetime fields in unauthenticated access', async () => {
      const event = await api.fetchEventInfoById(
        unauthenticatedClient,
        testEvent.id,
      );

      expect(event).toBeTruthy();
      expect(event!.startDateTime).toBeInstanceOf(Date);
      expect(event!.createdAt).toBeInstanceOf(Date);
      expect(event!.updatedAt).toBeInstanceOf(Date);

      if (event!.endDateTime) {
        expect(event!.endDateTime).toBeInstanceOf(Date);
      }
    });

    it('handles coordinates in unauthenticated access', async () => {
      const event = await api.fetchEventInfoById(
        unauthenticatedClient,
        testEvent.id,
      );

      expect(event).toBeTruthy();
      if (event!.coordinates) {
        expect(event!.coordinates).toHaveProperty('lat');
        expect(event!.coordinates).toHaveProperty('lng');
        expect(typeof event!.coordinates.lat).toBe('number');
        expect(typeof event!.coordinates.lng).toBe('number');
      }
    });

    it('handles capacity and attendance count in unauthenticated access', async () => {
      const event = await api.fetchEventInfoById(
        unauthenticatedClient,
        testEvent.id,
      );

      expect(event).toBeTruthy();
      expect(typeof event!.attendeeCount).toBe('number');
      expect(event!.attendeeCount).toBeGreaterThanOrEqual(1); // At least organizer

      if (event!.maxAttendees !== null && event!.maxAttendees !== undefined) {
        expect(typeof event!.maxAttendees).toBe('number');
        expect(event!.maxAttendees).toBeGreaterThan(0);
      }
    });
  });

  describe('Authorization Edge Cases', () => {
    it('prevents users from updating events they do not own', async () => {
      // Create a second user
      const otherUser = await createTestUser(authenticatedClient);
      await signIn(authenticatedClient, otherUser.email, 'TestPass123!');

      // Try to update the original test event (owned by testUser)
      await expect(
        api.updateEvent(authenticatedClient, {
          id: testEvent.id,
          title: 'Unauthorized Update by Other User',
        }),
      ).rejects.toThrow();
    });

    it('prevents users from deleting events they do not own', async () => {
      // Still signed in as otherUser from previous test
      // Try to delete the original test event (owned by testUser)
      await expect(
        api.deleteEvent(authenticatedClient, testEvent.id),
      ).rejects.toThrow();

      // Sign back in as original user for cleanup
      await signIn(authenticatedClient, testUser.email, 'TestPass123!');
    });

    it('allows organizer full control over their events', async () => {
      // Already signed in as testUser (original organizer)

      // Should be able to update
      const updateResult = await api.updateEvent(authenticatedClient, {
        id: testEvent.id,
        description: 'Updated by organizer',
      });
      expect(updateResult).toBeTruthy();
      expect(updateResult!.description).toBe('Updated by organizer');

      // Should be able to see full event details
      const fetchResult = await api.fetchEventInfoById(
        authenticatedClient,
        testEvent.id,
      );
      expect(fetchResult).toBeTruthy();
      expect(fetchResult!.description).toBe('Updated by organizer');
    });
  });
});

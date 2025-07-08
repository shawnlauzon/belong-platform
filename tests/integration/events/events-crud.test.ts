import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestEvent,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData, cleanupEvent } from '../helpers/cleanup';
import * as api from '@/features/events/api';
import { signIn } from '@/features/auth/api';
import { createFakeEventData } from '@/features/events/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { EventInfo } from '@/features/events/types';
import type { User } from '@/features/users/types';
import type { CommunityInfo } from '@/features/communities/types';
import { parsePostGisPoint } from '@/shared';

describe('Events API - CRUD Operations', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: User;
  let testCommunity: CommunityInfo;
  let readOnlyEvent1: EventInfo;
  let readOnlyEvent2: EventInfo;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create shared resources for read-only tests
    testUser = await createTestUser(supabase);

    // Sign in as testUser to ensure proper context for event creation
    await signIn(supabase, testUser.email, 'TestPass123!');

    testCommunity = await createTestCommunity(supabase);
    readOnlyEvent1 = await createTestEvent(
      supabase,
      testUser.id,
      testCommunity.id,
    );
    readOnlyEvent2 = await createTestEvent(
      supabase,
      testUser.id,
      testCommunity.id,
    );
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('createEvent', () => {
    it('creates event with valid data', async () => {
      const data = createFakeEventData({
        title: `${TEST_PREFIX}Create_Test_${Date.now()}`,
        organizerId: testUser.id,
        communityId: testCommunity.id,
        startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endDateTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
        imageUrls: undefined, // Don't generate random images
      });

      let event;
      try {
        event = await api.createEvent(supabase, data);

        expect(event).toBeTruthy();
        expect(event!.id).toBeTruthy();
        expect(event!.title).toBe(data.title);
        expect(event!.organizerId).toBe(testUser.id);
        expect(event!.communityId).toBe(testCommunity.id);

        // Verify database record exists with all expected fields
        const { data: dbRecord } = await supabase
          .from('events')
          .select('*')
          .eq('id', event!.id)
          .single();

        console.log('*** dbRecord', JSON.stringify(dbRecord, null, 2));

        expect(dbRecord).toMatchObject({
          id: event!.id,
          title: data.title,
          description: data.description,
          organizer_id: testUser.id,
          community_id: testCommunity.id,
          is_all_day: data.isAllDay,
          location: data.location,
          max_attendees: data.maxAttendees ?? null,
          attendee_count: 1, // Organizer is auto-attendee
        });

        // Check datetime fields separately to handle timezone format differences
        expect(new Date(dbRecord!.start_date_time)).toEqual(data.startDateTime);
        if (data.endDateTime) {
          expect(new Date(dbRecord!.end_date_time)).toEqual(data.endDateTime);
        }
        expect(parsePostGisPoint(dbRecord!.coordinates)).toEqual(
          data.coordinates,
        );
        expect(dbRecord!.created_at).toBeTruthy();
        expect(dbRecord!.updated_at).toBeTruthy();
      } finally {
        await cleanupEvent(event);
      }
    });

    it('auto-creates organizer attendance', async () => {
      const data = createFakeEventData({
        title: `${TEST_PREFIX}Attendance_Test_${Date.now()}`,
        organizerId: testUser.id,
        communityId: testCommunity.id,
        startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        imageUrls: undefined,
      });

      let event;
      try {
        event = await api.createEvent(supabase, data);

        const { data: attendance } = await supabase
          .from('event_attendances')
          .select()
          .eq('event_id', event!.id)
          .eq('user_id', testUser.id)
          .single();

        expect(attendance).toBeTruthy();
        expect(attendance!.status).toBe('attending');
      } finally {
        await cleanupEvent(event);
      }
    });

    it('handles image auto-commit workflow', async () => {
      const { uploadImage } = await import('@/features/images/api');
      
      // Create a test image file
      const testImageContent = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header
      const testFile = new File([testImageContent], 'test-image.png', { type: 'image/png' });
      
      let tempImageResult: { url: string; tempPath: string } | null = null;
      let event;
      
      try {
        // First upload a temporary image
        tempImageResult = await uploadImage({ 
          supabase, 
          file: testFile, 
          folder: 'temp-uploads' 
        });
        
        expect(tempImageResult).toBeTruthy();
        expect(tempImageResult.url).toContain('temp-uploads-');
        expect(tempImageResult.tempPath).toBeTruthy();
        
        // Create event with the temporary image URL
        const data = createFakeEventData({
          title: `${TEST_PREFIX}Image_Test_${Date.now()}`,
          organizerId: testUser.id,
          communityId: testCommunity.id,
          startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          imageUrls: [tempImageResult.url],
        });

        event = await api.createEvent(supabase, data);

        // If images are auto-committed, temp URLs should be converted to permanent URLs
        if (event!.imageUrls && event!.imageUrls.length > 0) {
          expect(event!.imageUrls[0]).not.toContain('temp-uploads-');
          expect(event!.imageUrls[0]).toContain(`event-${event!.id}`);
          
          // Verify the permanent image actually exists by checking storage
          const permanentUrl = event!.imageUrls[0];
          const pathMatch = permanentUrl.match(/\/images\/(.+)$/);
          if (pathMatch) {
            const imagePath = pathMatch[1];
            const { data: fileData } = await supabase.storage
              .from('images')
              .download(imagePath);
            expect(fileData).toBeTruthy();
          }
        }
      } finally {
        // Cleanup: Delete temporary file if it still exists
        if (tempImageResult) {
          await supabase.storage.from('images').remove([tempImageResult.tempPath]);
        }
        
        // Cleanup event (which should also cleanup permanent images)
        await cleanupEvent(event);
      }
    });
  });

  describe('fetchEvents', () => {
    it('fetches all events', async () => {
      const events = await api.fetchEvents(supabase);

      expect(Array.isArray(events)).toBe(true);
      expect(events.some((e) => e.id === readOnlyEvent1.id)).toBe(true);
      expect(events.some((e) => e.id === readOnlyEvent2.id)).toBe(true);
    });

    it('filters by title', async () => {
      const uniqueTitle = `${TEST_PREFIX}UniqueFilter_${Date.now()}`;
      let filteredEvent;

      try {
        filteredEvent = await api.createEvent(
          supabase,
          createFakeEventData({
            title: uniqueTitle,
            organizerId: testUser.id,
            communityId: testCommunity.id,
            startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
            imageUrls: undefined,
          }),
        );

        const filtered = await api.fetchEvents(supabase, {
          title: 'UniqueFilter',
        });

        expect(filtered.some((e) => e.title === uniqueTitle)).toBe(true);
      } finally {
        await cleanupEvent(filteredEvent);
      }
    });

    it('filters by organizerId', async () => {
      const filtered = await api.fetchEvents(supabase, {
        organizerId: testUser.id,
      });

      expect(filtered.length).toBeGreaterThanOrEqual(2);
      expect(filtered.every((e) => e.organizerId === testUser.id)).toBe(true);
    });

    it('filters by communityId', async () => {
      const filtered = await api.fetchEvents(supabase, {
        communityId: testCommunity.id,
      });

      expect(filtered.length).toBeGreaterThanOrEqual(2);
      expect(filtered.every((e) => e.communityId === testCommunity.id)).toBe(
        true,
      );
    });

    it('filters by date range', async () => {
      const now = Date.now();
      const futureDate = new Date(now + 48 * 60 * 60 * 1000); // Day after tomorrow
      const filterStartDate = new Date(now + 36 * 60 * 60 * 1000); // 36 hours from now

      let futureEvent;

      try {
        futureEvent = await api.createEvent(
          supabase,
          createFakeEventData({
            title: `${TEST_PREFIX}Future_Event_${Date.now()}`,
            organizerId: testUser.id,
            communityId: testCommunity.id,
            startDateTime: futureDate,
            imageUrls: undefined,
          }),
        );

        const filtered = await api.fetchEvents(supabase, {
          startAfter: filterStartDate,
        });

        // The future event should be included since it falls within the date range
        expect(filtered.some((e) => e.id === futureEvent!.id)).toBe(true);

        // All events should have start times within or after the filter range
        const eventsOutsideRange = filtered.filter(
          (e) => e.startDateTime < filterStartDate,
        );
        expect(eventsOutsideRange).toEqual([]);
      } finally {
        await cleanupEvent(futureEvent);
      }
    });
  });

  describe('fetchEventInfoById', () => {
    it('returns event by id', async () => {
      const fetched = await api.fetchEventInfoById(supabase, readOnlyEvent1.id);

      expect(fetched).toBeTruthy();
      expect(fetched!.id).toBe(readOnlyEvent1.id);
      expect(fetched!.title).toBe(readOnlyEvent1.title);
    });

    it('returns null for non-existent id', async () => {
      // Use a valid UUID format that doesn't exist
      const result = await api.fetchEventInfoById(
        supabase,
        '00000000-0000-0000-0000-000000000000',
      );
      expect(result).toBeNull();
    });
  });

  describe('updateEvent', () => {
    it('updates event fields', async () => {
      // Create own event to modify
      let event;
      try {
        event = await createTestEvent(supabase, testUser.id, testCommunity.id);

        const newTitle = `${TEST_PREFIX}Updated_${Date.now()}`;
        const newDescription = 'Updated description for test';
        const newLocation = 'Updated Location';

        const updated = await api.updateEvent(supabase, {
          id: event.id,
          title: newTitle,
          description: newDescription,
          location: newLocation,
        });

        expect(updated!.title).toBe(newTitle);
        expect(updated!.description).toBe(newDescription);
        expect(updated!.location).toBe(newLocation);
        expect(updated!.id).toBe(event.id);

        // Verify database record has been updated with all expected fields
        const { data: dbRecord } = await supabase
          .from('events')
          .select('*')
          .eq('id', event.id)
          .single();

        expect(dbRecord).toMatchObject({
          id: event.id,
          title: newTitle,
          description: newDescription,
          location: newLocation,
          organizer_id: event.organizerId,
          community_id: event.communityId,
        });
      } finally {
        await cleanupEvent(event);
      }
    });

    it('preserves unchanged fields', async () => {
      let event;
      try {
        event = await createTestEvent(supabase, testUser.id, testCommunity.id);
        const newTitle = `${TEST_PREFIX}PartialUpdate_${Date.now()}`;
        const originalDescription = event.description;
        const originalLocation = event.location;

        const updated = await api.updateEvent(supabase, {
          id: event.id,
          title: newTitle,
        });

        expect(updated!.title).toBe(newTitle);
        expect(updated!.description).toBe(originalDescription);
        expect(updated!.location).toBe(originalLocation);
        expect(updated!.organizerId).toBe(event.organizerId);

        // Verify database record preserves unchanged fields
        const { data: dbRecord } = await supabase
          .from('events')
          .select('*')
          .eq('id', event.id)
          .single();

        expect(dbRecord).toMatchObject({
          id: event.id,
          title: newTitle,
          description: originalDescription,
          location: originalLocation,
          organizer_id: event.organizerId,
          community_id: event.communityId,
        });
      } finally {
        await cleanupEvent(event);
      }
    });

    it('handles datetime updates', async () => {
      let event;
      try {
        event = await createTestEvent(supabase, testUser.id, testCommunity.id);
        const newStartTime = new Date(Date.now() + 48 * 60 * 60 * 1000); // Day after tomorrow
        const newEndTime = new Date(Date.now() + 50 * 60 * 60 * 1000); // 2 hours later

        const updated = await api.updateEvent(supabase, {
          id: event.id,
          startDateTime: newStartTime,
          endDateTime: newEndTime,
          isAllDay: true,
        });

        expect(updated!.startDateTime).toEqual(newStartTime);
        expect(updated!.endDateTime).toEqual(newEndTime);
        expect(updated!.isAllDay).toBe(true);

        // Verify database record
        const { data: dbRecord } = await supabase
          .from('events')
          .select('*')
          .eq('id', event.id)
          .single();

        expect(new Date(dbRecord!.start_date_time)).toEqual(newStartTime);
        expect(new Date(dbRecord!.end_date_time)).toEqual(newEndTime);
        expect(dbRecord!.is_all_day).toBe(true);
      } finally {
        await cleanupEvent(event);
      }
    });

    it('handles coordinates updates', async () => {
      let event;
      try {
        event = await createTestEvent(supabase, testUser.id, testCommunity.id);
        const newCoordinates = { lat: 40.7128, lng: -74.006 }; // NYC

        const updated = await api.updateEvent(supabase, {
          id: event.id,
          coordinates: newCoordinates,
        });

        expect(updated!.coordinates).toEqual(newCoordinates);

        // Verify database record
        const { data: dbRecord } = await supabase
          .from('events')
          .select('*')
          .eq('id', event.id)
          .single();

        expect(parsePostGisPoint(dbRecord!.coordinates)).toEqual(
          newCoordinates,
        );
      } finally {
        await cleanupEvent(event);
      }
    });

    it('handles maxAttendees updates', async () => {
      let event;
      try {
        event = await createTestEvent(supabase, testUser.id, testCommunity.id);
        const newMaxAttendees = 50;

        const updated = await api.updateEvent(supabase, {
          id: event.id,
          maxAttendees: newMaxAttendees,
        });

        expect(updated!.maxAttendees).toBe(newMaxAttendees);

        // Verify database record
        const { data: dbRecord } = await supabase
          .from('events')
          .select('*')
          .eq('id', event.id)
          .single();

        expect(dbRecord!.max_attendees).toBe(newMaxAttendees);
      } finally {
        await cleanupEvent(event);
      }
    });
  });

  describe('deleteEvent', () => {
    it('deletes event and cascades to attendances', async () => {
      // Create an event specifically for deletion
      const event = await createTestEvent(
        supabase,
        testUser.id,
        testCommunity.id,
      );
      const eventId = event.id;

      // Join another user to test cascade
      const user2 = await createTestUser(supabase);
      const user2Email = user2.email;

      // Sign in as user2 and join the event
      await signIn(supabase, user2Email, 'TestPass123!');
      await api.joinEvent(supabase, eventId);

      // Sign back in as the organizer to delete
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Delete event
      await api.deleteEvent(supabase, eventId);

      // Wait a bit for the delete to propagate
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify event deleted
      const { data, error } = await supabase
        .from('events')
        .select()
        .eq('id', eventId);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      // Verify attendances deleted
      const { data: attendances } = await supabase
        .from('event_attendances')
        .select()
        .eq('event_id', eventId);

      expect(attendances).toHaveLength(0);

      // Note: event already deleted, user2 will be cleaned in afterAll
    });
  });
});

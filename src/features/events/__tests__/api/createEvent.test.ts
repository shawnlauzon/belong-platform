import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { createMockSupabase } from '@/test-utils';
import { createEvent } from '../../api/createEvent';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { EventData } from '@/features/events/types/domain';

describe('createEvent', () => {
  let mockSupabase: SupabaseClient<Database>;
  let eventData: EventData;
  let organizerId: string;
  let communityId: string;

  beforeEach(() => {
    vi.clearAllMocks();

    organizerId = faker.string.uuid();
    communityId = faker.string.uuid();

    eventData = {
      title: faker.lorem.words(3),
      description: faker.lorem.paragraph(),
      startDateTime: faker.date.future(),
      endDateTime: faker.date.future(),
      location: faker.location.streetAddress(),
      communityId,
      organizerId,
      coordinates: {
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      },
      isAllDay: false,
      imageUrls: [],
      maxAttendees: faker.number.int({ min: 5, max: 100 }),
    };

    // Create mock Supabase client
    mockSupabase = createMockSupabase({});
  });

  describe('successful creation scenarios', () => {
    it('should create event and return EventInfo', async () => {
      const mockEventRow = {
        id: faker.string.uuid(),
        title: eventData.title,
        description: eventData.description,
        start_date_time: eventData.startDateTime.toISOString(),
        end_date_time: eventData.endDateTime?.toISOString() || null,
        location: eventData.location,
        community_id: eventData.communityId,
        organizer_id: eventData.organizerId,
        coordinates: {
          type: 'Point',
          coordinates: [eventData.coordinates.lng, eventData.coordinates.lat],
        },
        is_all_day: eventData.isAllDay,
        image_urls: eventData.imageUrls,
        max_attendees: eventData.maxAttendees,
        attendee_count: 1, // Should be 1 because organizer is automatically added
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      // Mock successful database insert
      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockEventRow,
          error: null,
        }),
      };

      // @ts-expect-error Mock implementation doesn't need full QueryBuilder interface
      vi.mocked(mockSupabase.from).mockReturnValue(mockQueryBuilder);

      const result = await createEvent(mockSupabase, eventData);

      expect(result).toEqual({
        id: mockEventRow.id,
        title: eventData.title,
        description: eventData.description,
        startDateTime: new Date(mockEventRow.start_date_time),
        endDateTime: mockEventRow.end_date_time ? new Date(mockEventRow.end_date_time) : undefined,
        location: eventData.location,
        communityId: eventData.communityId,
        organizerId: eventData.organizerId,
        coordinates: eventData.coordinates,
        isAllDay: eventData.isAllDay,
        imageUrls: eventData.imageUrls,
        maxAttendees: eventData.maxAttendees,
        attendeeCount: 1, // Organizer automatically added by trigger
        createdAt: new Date(mockEventRow.created_at),
        updatedAt: new Date(mockEventRow.updated_at),
      });

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        title: eventData.title,
        description: eventData.description,
        start_date_time: eventData.startDateTime.toISOString(),
        end_date_time: eventData.endDateTime?.toISOString() || null,
        location: eventData.location,
        community_id: eventData.communityId,
        organizer_id: eventData.organizerId,
        coordinates: `POINT(${eventData.coordinates.lng} ${eventData.coordinates.lat})`,
        is_all_day: eventData.isAllDay,
        image_urls: eventData.imageUrls,
        max_attendees: eventData.maxAttendees,
      });
    });

    it('should create all-day event with null end_date_time', async () => {
      const allDayEventData = {
        ...eventData,
        endDateTime: null,
        isAllDay: true,
      };

      const mockEventRow = {
        id: faker.string.uuid(),
        title: allDayEventData.title,
        description: allDayEventData.description,
        start_date_time: allDayEventData.startDateTime.toISOString(),
        end_date_time: null,
        location: allDayEventData.location,
        community_id: allDayEventData.communityId,
        organizer_id: allDayEventData.organizerId,
        coordinates: {
          type: 'Point',
          coordinates: [allDayEventData.coordinates.lng, allDayEventData.coordinates.lat],
        },
        is_all_day: true,
        image_urls: allDayEventData.imageUrls,
        max_attendees: allDayEventData.maxAttendees,
        attendee_count: 1, // Organizer automatically added by trigger
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockEventRow,
          error: null,
        }),
      };

      // @ts-expect-error Mock implementation doesn't need full QueryBuilder interface
      vi.mocked(mockSupabase.from).mockReturnValue(mockQueryBuilder);

      const result = await createEvent(mockSupabase, allDayEventData);

      expect(result).toEqual({
        id: mockEventRow.id,
        title: allDayEventData.title,
        description: allDayEventData.description,
        startDateTime: new Date(mockEventRow.start_date_time),
        endDateTime: undefined,
        location: allDayEventData.location,
        communityId: allDayEventData.communityId,
        organizerId: allDayEventData.organizerId,
        coordinates: allDayEventData.coordinates,
        isAllDay: true,
        imageUrls: allDayEventData.imageUrls,
        maxAttendees: allDayEventData.maxAttendees,
        attendeeCount: 1, // Organizer automatically added by trigger
        createdAt: new Date(mockEventRow.created_at),
        updatedAt: new Date(mockEventRow.updated_at),
      });
    });
  });

  describe('error scenarios', () => {
    it('should throw error when database insert fails', async () => {
      const dbError = new Error('Database error');

      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      };

      // @ts-expect-error Mock implementation doesn't need full QueryBuilder interface
      vi.mocked(mockSupabase.from).mockReturnValue(mockQueryBuilder);

      await expect(createEvent(mockSupabase, eventData)).rejects.toThrow(
        dbError.message,
      );
    });

    it('should throw error when no data is returned after insert', async () => {
      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      // @ts-expect-error Mock implementation doesn't need full QueryBuilder interface
      vi.mocked(mockSupabase.from).mockReturnValue(mockQueryBuilder);

      await expect(createEvent(mockSupabase, eventData)).rejects.toThrow(
        'Failed to create event',
      );
    });
  });

  describe('business logic validation', () => {
    it('should create event with correct data transformation', async () => {
      const mockEventRow = {
        id: faker.string.uuid(),
        title: eventData.title,
        description: eventData.description,
        start_date_time: eventData.startDateTime.toISOString(),
        end_date_time: eventData.endDateTime?.toISOString() || null,
        location: eventData.location,
        community_id: eventData.communityId,
        organizer_id: eventData.organizerId,
        coordinates: {
          type: 'Point',
          coordinates: [eventData.coordinates.lng, eventData.coordinates.lat],
        },
        is_all_day: eventData.isAllDay,
        image_urls: eventData.imageUrls,
        max_attendees: eventData.maxAttendees,
        attendee_count: 1, // Organizer automatically added by trigger
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockEventRow,
          error: null,
        }),
      };

      // @ts-expect-error Mock implementation doesn't need full QueryBuilder interface
      vi.mocked(mockSupabase.from).mockReturnValue(mockQueryBuilder);

      await createEvent(mockSupabase, eventData);

      // Verify the data transformation for database insert
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        title: eventData.title,
        description: eventData.description,
        start_date_time: eventData.startDateTime.toISOString(),
        end_date_time: eventData.endDateTime?.toISOString() || null,
        location: eventData.location,
        community_id: eventData.communityId,
        organizer_id: eventData.organizerId,
        coordinates: `POINT(${eventData.coordinates.lng} ${eventData.coordinates.lat})`,
        is_all_day: eventData.isAllDay,
        image_urls: eventData.imageUrls,
        max_attendees: eventData.maxAttendees,
      });
    });

    it('should handle events with no maximum attendees', async () => {
      const eventWithNoMax = {
        ...eventData,
        maxAttendees: null,
      };

      const mockEventRow = {
        id: faker.string.uuid(),
        title: eventWithNoMax.title,
        description: eventWithNoMax.description,
        start_date_time: eventWithNoMax.startDateTime.toISOString(),
        end_date_time: eventWithNoMax.endDateTime?.toISOString() || null,
        location: eventWithNoMax.location,
        community_id: eventWithNoMax.communityId,
        organizer_id: eventWithNoMax.organizerId,
        coordinates: {
          type: 'Point',
          coordinates: [eventWithNoMax.coordinates.longitude, eventWithNoMax.coordinates.latitude],
        },
        is_all_day: eventWithNoMax.isAllDay,
        image_urls: eventWithNoMax.imageUrls,
        max_attendees: null,
        attendee_count: 1, // Organizer automatically added by trigger
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockEventRow,
          error: null,
        }),
      };

      // @ts-expect-error Mock implementation doesn't need full QueryBuilder interface
      vi.mocked(mockSupabase.from).mockReturnValue(mockQueryBuilder);

      const result = await createEvent(mockSupabase, eventWithNoMax);

      expect(result?.maxAttendees).toBeUndefined();
    });
  });

  describe('trigger validation', () => {
    it('should expect organizer to be automatically added as attendee', async () => {
      // This test validates the expected behavior after the trigger is implemented
      // The trigger should automatically add the organizer to event_attendances
      // and increment the attendee_count in the events table
      
      const mockEventRow = {
        id: faker.string.uuid(),
        title: eventData.title,
        description: eventData.description,
        start_date_time: eventData.startDateTime.toISOString(),
        end_date_time: eventData.endDateTime?.toISOString() || null,
        location: eventData.location,
        community_id: eventData.communityId,
        organizer_id: eventData.organizerId,
        coordinates: {
          type: 'Point',
          coordinates: [eventData.coordinates.lng, eventData.coordinates.lat],
        },
        is_all_day: eventData.isAllDay,
        image_urls: eventData.imageUrls,
        max_attendees: eventData.maxAttendees,
        attendee_count: 1, // This should be 1 after the trigger adds the organizer
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockEventRow,
          error: null,
        }),
      };

      // @ts-expect-error Mock implementation doesn't need full QueryBuilder interface
      vi.mocked(mockSupabase.from).mockReturnValue(mockQueryBuilder);

      const result = await createEvent(mockSupabase, eventData);

      // The trigger should ensure the organizer is automatically added as an attendee
      expect(result?.attendeeCount).toBe(1);
      expect(result?.organizerId).toBe(eventData.organizerId);
    });
  });
});
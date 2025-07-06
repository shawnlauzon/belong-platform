import { describe, it, expect } from 'vitest';
import {
  toDomainEvent,
  toEventInfo,
  forDbInsert,
  forDbUpdate,
  toDomainEventAttendance,
  forDbInsertAttendance,
} from '../../transformers/eventTransformer';
import { createFakeEventRow, createFakeEventData, createFakeEventAttendanceRow, createFakeEventAttendanceData } from '../../__fakes__';
import { createFakeUser } from '../../../users/__fakes__';
import { createFakeCommunity } from '../../../communities/__fakes__';

describe('eventTransformer', () => {
  describe('toDomainEvent', () => {
    it('should transform database event row to domain event', () => {
      const fakeUser = createFakeUser();
      const fakeCommunity = createFakeCommunity();
      const fakeEventRow = createFakeEventRow({
        organizer_id: fakeUser.id,
        community_id: fakeCommunity.id,
      });

      const result = toDomainEvent(fakeEventRow, {
        organizer: fakeUser,
        community: fakeCommunity,
      });

      expect(result).toMatchObject({
        id: fakeEventRow.id,
        title: fakeEventRow.title,
        description: fakeEventRow.description,
        startDateTime: new Date(fakeEventRow.start_date_time),
        endDateTime: fakeEventRow.end_date_time ? new Date(fakeEventRow.end_date_time) : undefined,
        isAllDay: fakeEventRow.is_all_day,
        location: fakeEventRow.location,
        maxAttendees: fakeEventRow.max_attendees ?? undefined,
        imageUrls: fakeEventRow.image_urls,
        attendeeCount: fakeEventRow.attendee_count,
        organizer: fakeUser,
        community: fakeCommunity,
      });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error when organizer ID does not match', () => {
      const fakeUser = createFakeUser();
      const fakeCommunity = createFakeCommunity();
      const fakeEventRow = createFakeEventRow({
        organizer_id: 'different-organizer-id',
        community_id: fakeCommunity.id,
      });

      expect(() => {
        toDomainEvent(fakeEventRow, {
          organizer: fakeUser,
          community: fakeCommunity,
        });
      }).toThrow('Organizer ID does not match');
    });

    it('should throw error when community ID does not match', () => {
      const fakeUser = createFakeUser();
      const fakeCommunity = createFakeCommunity();
      const fakeEventRow = createFakeEventRow({
        organizer_id: fakeUser.id,
        community_id: 'different-community-id',
      });

      expect(() => {
        toDomainEvent(fakeEventRow, {
          organizer: fakeUser,
          community: fakeCommunity,
        });
      }).toThrow('Community ID does not match');
    });
  });

  describe('toEventInfo', () => {
    it('should transform database event row to event info', () => {
      const fakeEventRow = createFakeEventRow();

      const result = toEventInfo(fakeEventRow);

      expect(result).toMatchObject({
        id: fakeEventRow.id,
        title: fakeEventRow.title,
        description: fakeEventRow.description,
        startDateTime: new Date(fakeEventRow.start_date_time),
        endDateTime: fakeEventRow.end_date_time ? new Date(fakeEventRow.end_date_time) : undefined,
        isAllDay: fakeEventRow.is_all_day,
        location: fakeEventRow.location,
        maxAttendees: fakeEventRow.max_attendees ?? undefined,
        imageUrls: fakeEventRow.image_urls,
        attendeeCount: fakeEventRow.attendee_count,
        organizerId: fakeEventRow.organizer_id,
        communityId: fakeEventRow.community_id,
      });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('forDbInsert', () => {
    it('should transform event data to database insert format', () => {
      const fakeEventData = createFakeEventData();

      const result = forDbInsert(fakeEventData);

      expect(result).toMatchObject({
        title: fakeEventData.title,
        description: fakeEventData.description,
        community_id: fakeEventData.communityId,
        organizer_id: fakeEventData.organizerId,
        start_date_time: fakeEventData.startDateTime.toISOString(),
        end_date_time: fakeEventData.endDateTime?.toISOString() || null,
        is_all_day: fakeEventData.isAllDay,
        location: fakeEventData.location,
        max_attendees: fakeEventData.maxAttendees ?? null,
        image_urls: fakeEventData.imageUrls || [],
      });
      expect(result.coordinates).toMatch(/^POINT\(/);
    });
  });

  describe('forDbUpdate', () => {
    it('should transform partial event data to database update format', () => {
      const partialEventData = {
        title: 'Updated Title',
        description: 'Updated Description',
        startDateTime: new Date('2024-01-01T10:00:00Z'),
      };

      const result = forDbUpdate(partialEventData);

      expect(result).toMatchObject({
        title: partialEventData.title,
        description: partialEventData.description,
        start_date_time: partialEventData.startDateTime.toISOString(),
        end_date_time: null,
        is_all_day: undefined,
        location: undefined,
        coordinates: undefined,
        max_attendees: null,
        image_urls: [],
      });
    });
  });

  describe('toDomainEventAttendance', () => {
    it('should transform database attendance row to domain attendance', () => {
      const fakeAttendanceRow = createFakeEventAttendanceRow();

      const result = toDomainEventAttendance(fakeAttendanceRow);

      expect(result).toMatchObject({
        id: fakeAttendanceRow.id,
        eventId: fakeAttendanceRow.event_id,
        userId: fakeAttendanceRow.user_id,
        status: fakeAttendanceRow.status,
      });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('forDbInsertAttendance', () => {
    it('should transform attendance data to database insert format', () => {
      const fakeAttendanceData = createFakeEventAttendanceData();

      const result = forDbInsertAttendance(fakeAttendanceData);

      expect(result).toMatchObject({
        event_id: fakeAttendanceData.eventId,
        user_id: fakeAttendanceData.userId,
        status: fakeAttendanceData.status,
      });
    });
  });
});
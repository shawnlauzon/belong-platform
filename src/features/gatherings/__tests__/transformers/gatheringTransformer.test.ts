import { describe, it, expect } from 'vitest';
import {
  toGatheringWithJoinedRelations,
  toDomainGathering,
  toGatheringInsertRow,
  toGatheringUpdateRow,
  toGatheringResponseInsertRow,
  toDomainGatheringResponse,
} from '../../transformers/gatheringTransformer';
import {
  createFakeGatheringRow,
  createFakeGatheringInput,
  createFakeGatheringResponseRow,
  createFakeGatheringResponseData,
} from '../../__fakes__';
import { createFakeProfileRow, createFakeUser } from '../../../users/__fakes__';
import {
  createFakeCommunity,
  createFakeCommunityRow,
} from '../../../communities/__fakes__';

describe('gatheringTransformer', () => {
  describe('toGatheringWithJoinedRelations', () => {
    it('should transform database event row to domain event', () => {
      const fakeUser = createFakeProfileRow();
      const fakeCommunity = createFakeCommunityRow();
      const fakeGatheringRow = createFakeGatheringRow({
        organizer_id: fakeUser.id,
        community_id: fakeCommunity.id,
      });

      const result = toGatheringWithJoinedRelations({
        ...fakeGatheringRow,
        organizer: fakeUser,
        community: fakeCommunity,
      });

      expect(result).toMatchObject({
        id: fakeGatheringRow.id,
        title: fakeGatheringRow.title,
        description: fakeGatheringRow.description,
        startDateTime: new Date(fakeGatheringRow.start_date_time),
        endDateTime: fakeGatheringRow.end_date_time
          ? new Date(fakeGatheringRow.end_date_time)
          : undefined,
        isAllDay: fakeGatheringRow.is_all_day,
        locationName: fakeGatheringRow.location_name,
        maxAttendees: fakeGatheringRow.max_attendees ?? undefined,
        imageUrls: fakeGatheringRow.image_urls,
        attendeeCount: fakeGatheringRow.attendee_count,
        organizer: expect.objectContaining({ id: fakeUser.id }),
        community: expect.objectContaining({ id: fakeCommunity.id }),
      });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error when organizer data is missing', () => {
      const fakeCommunity = createFakeCommunityRow();
      const fakeGatheringRow = createFakeGatheringRow({
        organizer_id: 'different-organizer-id',
        community_id: fakeCommunity.id,
      });

      expect(() => {
        toGatheringWithJoinedRelations({
          ...fakeGatheringRow,
          organizer: null,
          community: null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      }).toThrow('missing required organizer data');
    });

    it('should throw error when community data is missing', () => {
      const fakeUser = createFakeProfileRow();
      const fakeGatheringRow = createFakeGatheringRow({
        organizer_id: fakeUser.id,
        community_id: 'different-community-id',
      });

      expect(() => {
        toGatheringWithJoinedRelations({
          ...fakeGatheringRow,
          organizer: fakeUser,
          community: null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      }).toThrow('missing required community data');
    });
  });

  describe('toDomainGathering', () => {
    it('should transform database gathering row to gathering info', () => {
      const fakeUser = createFakeUser();
      const fakeCommunity = createFakeCommunity();
      const fakeGatheringRow = createFakeGatheringRow({
        organizer_id: fakeUser.id,
        community_id: fakeCommunity.id,
      });

      const result = toDomainGathering(fakeGatheringRow, {
        organizer: fakeUser,
        community: fakeCommunity,
      });

      expect(result).toMatchObject({
        id: fakeGatheringRow.id,
        title: fakeGatheringRow.title,
        description: fakeGatheringRow.description,
        startDateTime: new Date(fakeGatheringRow.start_date_time),
        endDateTime: fakeGatheringRow.end_date_time
          ? new Date(fakeGatheringRow.end_date_time)
          : undefined,
        isAllDay: fakeGatheringRow.is_all_day,
        locationName: fakeGatheringRow.location_name,
        maxAttendees: fakeGatheringRow.max_attendees ?? undefined,
        imageUrls: fakeGatheringRow.image_urls,
        attendeeCount: fakeGatheringRow.attendee_count,
        organizerId: fakeGatheringRow.organizer_id,
        organizer: fakeUser,
        communityId: fakeGatheringRow.community_id,
        community: fakeCommunity,
      });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('toGatheringInsertRow', () => {
    it('should transform event data to database insert format', () => {
      const fakeGatheringData = createFakeGatheringInput();

      const result = toGatheringInsertRow(fakeGatheringData);

      expect(result).toMatchObject({
        title: fakeGatheringData.title,
        description: fakeGatheringData.description,
        community_id: fakeGatheringData.communityId,
        organizer_id: fakeGatheringData.organizerId,
        start_date_time: fakeGatheringData.startDateTime.toISOString(),
        end_date_time: fakeGatheringData.endDateTime?.toISOString() || null,
        is_all_day: fakeGatheringData.isAllDay,
        location_name: fakeGatheringData.locationName,
        max_attendees: fakeGatheringData.maxAttendees ?? null,
        image_urls: fakeGatheringData.imageUrls || [],
      });
      expect(result.coordinates).toMatch(/^POINT\(/);
    });
  });

  describe('toGatheringUpdateRow', () => {
    it('should transform partial event data to database update format', () => {
      const partialEventData = {
        title: 'Updated Title',
        description: 'Updated Description',
        startDateTime: new Date('2024-01-01T10:00:00Z'),
      };

      const result = toGatheringUpdateRow(partialEventData);

      expect(result).toMatchObject({
        title: partialEventData.title,
        description: partialEventData.description,
        start_date_time: partialEventData.startDateTime.toISOString(),
        end_date_time: null,
        is_all_day: undefined,
        location_name: undefined,
        coordinates: undefined,
        max_attendees: null,
        image_urls: [],
      });
    });
  });

  describe('toDomainGatheringResponse', () => {
    it('should transform database response row to domain response', () => {
      const fakeResponseRow = createFakeGatheringResponseRow();

      const result = toDomainGatheringResponse(fakeResponseRow);

      expect(result).toMatchObject({
        gatheringId: fakeResponseRow.gathering_id,
        userId: fakeResponseRow.user_id,
        status: fakeResponseRow.status,
        createdAt: new Date(fakeResponseRow.created_at),
        updatedAt: new Date(fakeResponseRow.updated_at),
      });
    });
  });

  describe('toGatheringResponseInsertRow', () => {
    it('should transform response data to database insert format', () => {
      const fakeResponseData = createFakeGatheringResponseData();

      const result = toGatheringResponseInsertRow(fakeResponseData);

      expect(result).toMatchObject({
        gathering_id: fakeResponseData.gatheringId,
        user_id: fakeResponseData.userId,
        status: fakeResponseData.status,
      });
    });
  });
});

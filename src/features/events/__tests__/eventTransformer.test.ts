import { describe, it, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import {
  toDomainEvent,
  forDbInsert,
  forDbUpdate,
} from '../transformers/eventTransformer';
import { createMockDbEvent } from '../__mocks__';
import { createMockUser } from '../../users/__mocks__';
import { createMockEventData } from '../__mocks__';
import { createMockCommunity } from '../../communities/__mocks__';

describe('Event Transformer', () => {
  describe('toDomainEvent', () => {
    it('should transform a database event to a domain event', () => {
      const mockOrganizer = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbEvent = createMockDbEvent({
        organizer_id: mockOrganizer.id,
        community_id: mockCommunity.id,
      });

      const event = toDomainEvent(dbEvent, {
        organizer: mockOrganizer,
        community: mockCommunity,
      });

      expect(event).toMatchObject({
        id: dbEvent.id,
        title: dbEvent.title,
        description: dbEvent.description,
        location: dbEvent.location,
        organizer: mockOrganizer,
        community: mockCommunity,
      });
    });

    it('should handle dates correctly', () => {
      const mockOrganizer = createMockUser();
      const mockCommunity = createMockCommunity();
      const startDateTime = faker.date.future();
      const endDateTime = faker.date.soon({ refDate: startDateTime });

      const dbEvent = createMockDbEvent({
        organizer_id: mockOrganizer.id,
        community_id: mockCommunity.id,
        start_date_time: startDateTime.toISOString(),
        end_date_time: endDateTime.toISOString(),
      });

      const event = toDomainEvent(dbEvent, {
        organizer: mockOrganizer,
        community: mockCommunity,
      });

      expect(event).toMatchObject({
        startDateTime,
        endDateTime,
      });
    });

    it('should handle arrays with proper defaults', () => {
      const mockOrganizer = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbEvent = createMockDbEvent({
        organizer_id: mockOrganizer.id,
        community_id: mockCommunity.id,
        tags: [],
        image_urls: [],
      });

      const event = toDomainEvent(dbEvent, {
        organizer: mockOrganizer,
        community: mockCommunity,
      });

      expect(event).toMatchObject({
        tags: [],
        imageUrls: [],
      });
    });

    it('should handle boolean defaults correctly', () => {
      const mockOrganizer = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbEvent = createMockDbEvent({
        organizer_id: mockOrganizer.id,
        community_id: mockCommunity.id,
        registration_required: undefined,
      });

      const event = toDomainEvent(dbEvent, {
        organizer: mockOrganizer,
        community: mockCommunity,
      });

      expect(event).toMatchObject({
        registrationRequired: false,
        deletedAt: undefined,
      });
    });

    it('should handle non-deleted events correctly', () => {
      const mockOrganizer = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbEvent = createMockDbEvent({
        organizer_id: mockOrganizer.id,
        community_id: mockCommunity.id,
      });

      const event = toDomainEvent(dbEvent, {
        organizer: mockOrganizer,
        community: mockCommunity,
      });

      expect(event.deletedAt).toBe(undefined);
      expect(event.deletedBy).toBe(undefined);
    });

    it('should handle soft-deleted events correctly', () => {
      const mockOrganizer = createMockUser();
      const mockCommunity = createMockCommunity();
      const deleteDate = new Date('2024-01-01T00:00:00Z');
      const dbEvent = createMockDbEvent({
        organizer_id: mockOrganizer.id,
        community_id: mockCommunity.id,
        deleted_at: deleteDate.toISOString(),
        deleted_by: 'admin-123',
      });

      const event = toDomainEvent(dbEvent, {
        organizer: mockOrganizer,
        community: mockCommunity,
      });

      expect(event.deletedAt).toEqual(deleteDate); // should parse deleted_at to Date
      expect(event.deletedBy).toBe('admin-123'); // should preserve deleted_by
    });

    it('should throw an error if organizer ID does not match', () => {
      const mockOrganizer = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbEvent = createMockDbEvent({
        organizer_id: 'different-id',
        community_id: mockCommunity.id,
      });

      expect(() => {
        toDomainEvent(dbEvent, {
          organizer: mockOrganizer,
          community: mockCommunity,
        });
      }).toThrow('Organizer ID does not match');
    });

    it('should throw an error if community ID does not match', () => {
      const mockOrganizer = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbEvent = createMockDbEvent({
        organizer_id: mockOrganizer.id,
        community_id: 'different-id',
      });

      expect(() => {
        toDomainEvent(dbEvent, {
          organizer: mockOrganizer,
          community: mockCommunity,
        });
      }).toThrow('Community ID does not match');
    });

    it('should not return any underscore field names', () => {
      const mockOrganizer = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbEvent = createMockDbEvent({
        organizer_id: mockOrganizer.id,
        community_id: mockCommunity.id,
      });

      const event = toDomainEvent(dbEvent, {
        organizer: mockOrganizer,
        community: mockCommunity,
      });

      // Check that no keys contain underscores
      const eventKeys = Object.keys(event);
      const underscoreKeys = eventKeys.filter((key) => key.includes('_'));
      expect(underscoreKeys).toEqual([]);
    });

    it('should handle all-day events correctly', () => {
      const mockOrganizer = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbEvent = createMockDbEvent({
        organizer_id: mockOrganizer.id,
        community_id: mockCommunity.id,
        is_all_day: true,
      });

      const event = toDomainEvent(dbEvent, {
        organizer: mockOrganizer,
        community: mockCommunity,
      });

      expect(event.isAllDay).toBe(true);
    });

    it('should default is_all_day to false when not provided', () => {
      const mockOrganizer = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbEvent = createMockDbEvent({
        organizer_id: mockOrganizer.id,
        community_id: mockCommunity.id,
        is_all_day: undefined,
      });

      const event = toDomainEvent(dbEvent, {
        organizer: mockOrganizer,
        community: mockCommunity,
      });

      expect(event.isAllDay).toBe(false);
    });

    it('should handle is_all_day null as false', () => {
      const mockOrganizer = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbEvent = createMockDbEvent({
        organizer_id: mockOrganizer.id,
        community_id: mockCommunity.id,
        is_all_day: undefined,
      });

      const event = toDomainEvent(dbEvent, {
        organizer: mockOrganizer,
        community: mockCommunity,
      });

      expect(event.isAllDay).toBe(false);
    });
  });

  describe('forDbInsert', () => {
    it('should transform event data for database insertion', () => {
      const eventData = createMockEventData();
      const organizerId = 'test-organizer-id';

      const dbEvent = forDbInsert(eventData, organizerId);

      expect(dbEvent).toMatchObject({
        title: eventData.title,
        description: eventData.description,
        organizer_id: organizerId,
        community_id: eventData.communityId,
        location: eventData.location,
        start_date_time: eventData.startDateTime.toISOString(),
      });
    });

    it('should handle optional fields correctly', () => {
      const eventData = createMockEventData({
        endDateTime: undefined,
        maxAttendees: undefined,
        tags: undefined,
        imageUrls: undefined,
      });
      const organizerId = 'test-organizer-id';

      const dbEvent = forDbInsert(eventData, organizerId);

      expect(dbEvent.end_date_time).toBe(null);
      expect(dbEvent.max_attendees).toBe(null);
      expect(dbEvent.tags).toEqual([]);
      expect(dbEvent.image_urls).toEqual([]);
    });

    it('should handle boolean defaults correctly', () => {
      const eventData = createMockEventData({
        registrationRequired: undefined,
      });
      const organizerId = 'test-organizer-id';

      const dbEvent = forDbInsert(eventData, organizerId);

      expect(dbEvent.registration_required).toBe(false);
      // No longer expecting is_active - soft deletion doesn't set this on insert
    });

    it('should map isAllDay to is_all_day for database insertion', () => {
      const eventData = createMockEventData({
        isAllDay: true,
      });
      const organizerId = 'test-organizer-id';

      const dbEvent = forDbInsert(eventData, organizerId);

      expect(dbEvent.is_all_day).toBe(true);
    });

    it('should handle isAllDay false correctly', () => {
      const eventData = createMockEventData({
        isAllDay: false,
      });
      const organizerId = 'test-organizer-id';

      const dbEvent = forDbInsert(eventData, organizerId);

      expect(dbEvent.is_all_day).toBe(false);
    });
  });

  describe('forDbUpdate', () => {
    it('should transform partial event data for database update', () => {
      const eventData = {
        title: faker.lorem.words(3),
        description: faker.lorem.paragraph(),
        communityId: faker.string.uuid(),
      };
      const organizerId = faker.string.uuid();

      const dbEvent = forDbUpdate(eventData, organizerId);

      expect(dbEvent).toMatchObject({
        title: eventData.title,
        description: eventData.description,
        organizer_id: organizerId,
        community_id: eventData.communityId,
      });
    });

    it('should handle empty partial data without destructuring errors', () => {
      const eventData = {};
      const organizerId = faker.string.uuid();

      const dbEvent = forDbUpdate(eventData, organizerId);

      expect(dbEvent).toMatchObject({
        organizer_id: organizerId,
      });
    });

    it('should handle date transformations correctly', () => {
      const startDateTime = faker.date.future();
      const endDateTime = faker.date.soon({ refDate: startDateTime });

      const eventData = {
        startDateTime,
        endDateTime,
      };
      const organizerId = faker.string.uuid();

      const dbEvent = forDbUpdate(eventData, organizerId);

      expect(dbEvent.start_date_time).toBe(startDateTime.toISOString());
      expect(dbEvent.end_date_time).toBe(endDateTime.toISOString());
    });

    it('should handle optional fields correctly', () => {
      const eventData = {
        maxAttendees: undefined,
        registrationRequired: undefined,
        tags: undefined,
        imageUrls: undefined,
      };
      const organizerId = faker.string.uuid();

      const dbEvent = forDbUpdate(eventData, organizerId);

      expect(dbEvent.max_attendees).toBeUndefined();
      expect(dbEvent.registration_required).toBeUndefined();
      // No longer expecting is_active - soft deletion doesn't use this field
      expect(dbEvent.tags).toBeUndefined();
      expect(dbEvent.image_urls).toBeUndefined();
    });

    it('should map isAllDay to is_all_day for database update', () => {
      const eventData = {
        isAllDay: true,
      };
      const organizerId = faker.string.uuid();

      const dbEvent = forDbUpdate(eventData, organizerId);

      expect(dbEvent.is_all_day).toBe(true);
    });

    it('should handle undefined isAllDay in update', () => {
      const eventData = {
        isAllDay: undefined,
      };
      const organizerId = faker.string.uuid();

      const dbEvent = forDbUpdate(eventData, organizerId);

      expect(dbEvent.is_all_day).toBeUndefined();
    });
  });
});

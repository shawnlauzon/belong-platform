import { describe, it, expect } from "vitest";
import { faker } from "@faker-js/faker";
import {
  toDomainEvent,
  forDbInsert,
  forDbUpdate,
} from "../transformers/eventTransformer";
import { createMockDbEvent } from "./test-utils";
import {
  createMockEventData,
  createMockUser,
  createMockCommunity,
} from "../../test-utils/mocks";

describe("Event Transformer", () => {
  describe("toDomainEvent", () => {
    it("should transform a database event to a domain event", () => {
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

    it("should handle dates correctly", () => {
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

      expect(event.startDateTime).toEqual(startDateTime);
      expect(event.endDateTime).toEqual(endDateTime);
    });

    it("should handle arrays with proper defaults", () => {
      const mockOrganizer = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbEvent = createMockDbEvent({
        organizer_id: mockOrganizer.id,
        community_id: mockCommunity.id,
        tags: null,
        image_urls: null,
      });

      const event = toDomainEvent(dbEvent, {
        organizer: mockOrganizer,
        community: mockCommunity,
      });

      expect(event.tags).toEqual([]);
      expect(event.imageUrls).toEqual([]);
    });

    it("should handle boolean defaults correctly", () => {
      const mockOrganizer = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbEvent = createMockDbEvent({
        organizer_id: mockOrganizer.id,
        community_id: mockCommunity.id,
        registration_required: null,
        is_active: null,
      });

      const event = toDomainEvent(dbEvent, {
        organizer: mockOrganizer,
        community: mockCommunity,
      });

      expect(event.registrationRequired).toBe(false);
      expect(event.isActive).toBe(false); // null is_active should be false
    });

    it("should handle explicitly true is_active", () => {
      const mockOrganizer = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbEvent = createMockDbEvent({
        organizer_id: mockOrganizer.id,
        community_id: mockCommunity.id,
        is_active: true,
      });

      const event = toDomainEvent(dbEvent, {
        organizer: mockOrganizer,
        community: mockCommunity,
      });

      expect(event.isActive).toBe(true); // explicitly true is_active should be true
    });

    it("should handle explicitly false is_active", () => {
      const mockOrganizer = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbEvent = createMockDbEvent({
        organizer_id: mockOrganizer.id,
        community_id: mockCommunity.id,
        is_active: false,
      });

      const event = toDomainEvent(dbEvent, {
        organizer: mockOrganizer,
        community: mockCommunity,
      });

      expect(event.isActive).toBe(false); // explicitly false is_active should be false
    });

    it("should throw an error if organizer ID does not match", () => {
      const mockOrganizer = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbEvent = createMockDbEvent({
        organizer_id: "different-id",
        community_id: mockCommunity.id,
      });

      expect(() => {
        toDomainEvent(dbEvent, {
          organizer: mockOrganizer,
          community: mockCommunity,
        });
      }).toThrow("Organizer ID does not match");
    });

    it("should throw an error if community ID does not match", () => {
      const mockOrganizer = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbEvent = createMockDbEvent({
        organizer_id: mockOrganizer.id,
        community_id: "different-id",
      });

      expect(() => {
        toDomainEvent(dbEvent, {
          organizer: mockOrganizer,
          community: mockCommunity,
        });
      }).toThrow("Community ID does not match");
    });

    it("should not return any underscore field names", () => {
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
      const underscoreKeys = eventKeys.filter((key) => key.includes("_"));
      expect(underscoreKeys).toEqual([]);
    });

    it("should handle all-day events correctly", () => {
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

    it("should default is_all_day to false when not provided", () => {
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

    it("should handle is_all_day null as false", () => {
      const mockOrganizer = createMockUser();
      const mockCommunity = createMockCommunity();
      const dbEvent = createMockDbEvent({
        organizer_id: mockOrganizer.id,
        community_id: mockCommunity.id,
        is_all_day: null,
      });

      const event = toDomainEvent(dbEvent, {
        organizer: mockOrganizer,
        community: mockCommunity,
      });

      expect(event.isAllDay).toBe(false);
    });
  });

  describe("forDbInsert", () => {
    it("should transform event data for database insertion", () => {
      const eventData = createMockEventData();
      const organizerId = "test-organizer-id";

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

    it("should handle optional fields correctly", () => {
      const eventData = createMockEventData({
        endDateTime: undefined,
        parkingInfo: undefined,
        maxAttendees: undefined,
        tags: undefined,
        imageUrls: undefined,
      });
      const organizerId = "test-organizer-id";

      const dbEvent = forDbInsert(eventData, organizerId);

      expect(dbEvent.end_date_time).toBe(null);
      expect(dbEvent.parking_info).toBe(null);
      expect(dbEvent.max_attendees).toBe(null);
      expect(dbEvent.tags).toEqual([]);
      expect(dbEvent.image_urls).toEqual([]);
    });

    it("should handle boolean defaults correctly", () => {
      const eventData = createMockEventData({
        registrationRequired: undefined,
        isActive: undefined,
      });
      const organizerId = "test-organizer-id";

      const dbEvent = forDbInsert(eventData, organizerId);

      expect(dbEvent.registration_required).toBe(false);
      expect(dbEvent.is_active).toBe(true);
    });

    it("should map isAllDay to is_all_day for database insertion", () => {
      const eventData = createMockEventData({
        isAllDay: true,
      });
      const organizerId = "test-organizer-id";

      const dbEvent = forDbInsert(eventData, organizerId);

      expect(dbEvent.is_all_day).toBe(true);
    });

    it("should handle isAllDay false correctly", () => {
      const eventData = createMockEventData({
        isAllDay: false,
      });
      const organizerId = "test-organizer-id";

      const dbEvent = forDbInsert(eventData, organizerId);

      expect(dbEvent.is_all_day).toBe(false);
    });
  });

  describe("forDbUpdate", () => {
    it("should transform partial event data for database update", () => {
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

    it("should handle empty partial data without destructuring errors", () => {
      const eventData = {};
      const organizerId = faker.string.uuid();

      const dbEvent = forDbUpdate(eventData, organizerId);

      expect(dbEvent).toMatchObject({
        organizer_id: organizerId,
      });
    });


    it("should handle date transformations correctly", () => {
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

    it("should handle optional fields correctly", () => {
      const eventData = {
        parkingInfo: undefined,
        maxAttendees: undefined,
        registrationRequired: undefined,
        isActive: undefined,
        tags: undefined,
        imageUrls: undefined,
      };
      const organizerId = faker.string.uuid();

      const dbEvent = forDbUpdate(eventData, organizerId);

      expect(dbEvent.parking_info).toBeUndefined();
      expect(dbEvent.max_attendees).toBeUndefined();
      expect(dbEvent.registration_required).toBeUndefined();
      expect(dbEvent.is_active).toBeUndefined();
      expect(dbEvent.tags).toBeUndefined();
      expect(dbEvent.image_urls).toBeUndefined();
    });

    it("should map isAllDay to is_all_day for database update", () => {
      const eventData = {
        isAllDay: true,
      };
      const organizerId = faker.string.uuid();

      const dbEvent = forDbUpdate(eventData, organizerId);

      expect(dbEvent.is_all_day).toBe(true);
    });

    it("should handle undefined isAllDay in update", () => {
      const eventData = {
        isAllDay: undefined,
      };
      const organizerId = faker.string.uuid();

      const dbEvent = forDbUpdate(eventData, organizerId);

      expect(dbEvent.is_all_day).toBeUndefined();
    });
  });
});

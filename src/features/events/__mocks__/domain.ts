import { faker } from '@faker-js/faker';
import { createMockUser } from '../../users/__mocks__';
import {
  EventAttendance,
  EventAttendanceData,
  EventAttendanceStatus,
  EventData,
  Event,
} from '../types';
import { User } from '../../users';
import { createMockCommunity } from '../../communities/__mocks__';

/**
 * Creates a mock domain Event object
 */
export function createMockEvent(overrides: Partial<Event> = {}): Event {
  const now = new Date();
  const isAllDay = overrides.isAllDay ?? faker.datatype.boolean();
  const startDateTime = faker.date.future();
  const endDateTime = faker.datatype.boolean()
    ? new Date(
        startDateTime.getTime() +
          faker.number.int({ min: 1, max: 8 }) * 60 * 60 * 1000
      )
    : undefined;

  const organizer = createMockUser();
  const community = createMockCommunity();

  return {
    id: faker.string.uuid(),
    title: faker.lorem.words({ min: 2, max: 6 }),
    description: faker.lorem.paragraphs(2),
    startDateTime,
    endDateTime,
    isAllDay,
    location: faker.location.streetAddress(),
    coordinates: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    parkingInfo: faker.lorem.sentence(),
    maxAttendees: faker.datatype.boolean()
      ? faker.number.int({ min: 5, max: 100 })
      : undefined,
    registrationRequired: false, // Default to false
    tags: Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () =>
      faker.lorem.word()
    ),
    imageUrls: Array.from(
      { length: faker.number.int({ min: 0, max: 3 }) },
      () => faker.image.urlLoremFlickr({ category: 'event' })
    ),
    attendeeCount: faker.number.int({ min: 0, max: 50 }),
    deletedAt: undefined,
    deletedBy: undefined,
    createdAt: now,
    updatedAt: now,
    organizer,
    community,
    ...overrides,
  };
}

/**
 * Creates a mock domain Event with a custom organizer
 */
export function createMockEventWithOrganizer(
  organizer: User,
  overrides: Partial<Event> = {}
): Event {
  const event = createMockEvent(overrides);
  return {
    ...event,
    organizer,
  };
}

/**
 * Creates a mock domain EventAttendance object
 */
export function createMockEventAttendance(
  overrides: Partial<EventAttendance> = {}
): EventAttendance {
  const now = new Date();
  const user = createMockUser();
  const event = createMockEvent();

  return {
    id: faker.string.uuid(),
    eventId: event.id,
    userId: user.id,
    status: faker.helpers.arrayElement([
      'attending',
      'not_attending',
      'maybe',
    ]) as EventAttendanceStatus,
    createdAt: now,
    updatedAt: now,
    user,
    event,
    ...overrides,
  };
}

export function createMockEventData(
  overrides: Partial<EventData> = {}
): EventData {
  const isAllDay = overrides.isAllDay ?? faker.datatype.boolean();
  const startDateTime = faker.date.future();
  const endDateTime = faker.datatype.boolean()
    ? new Date(
        startDateTime.getTime() +
          faker.number.int({ min: 1, max: 8 }) * 60 * 60 * 1000
      )
    : undefined;

  return {
    title: faker.lorem.words({ min: 2, max: 6 }),
    description: faker.lorem.paragraphs(2),
    communityId: faker.string.uuid(),
    organizerId: faker.string.uuid(),
    startDateTime,
    endDateTime,
    isAllDay,
    location: faker.location.streetAddress(),
    coordinates: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    parkingInfo: faker.lorem.sentence(),
    maxAttendees: faker.datatype.boolean()
      ? faker.number.int({ min: 5, max: 100 })
      : undefined,
    registrationRequired: faker.datatype.boolean(),
    tags: Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () =>
      faker.lorem.word()
    ),
    imageUrls: Array.from(
      { length: faker.number.int({ min: 0, max: 3 }) },
      () => faker.image.urlLoremFlickr({ category: 'event' })
    ),
    ...overrides,
  };
}

export function createMockEventAttendanceData(
  overrides: Partial<EventAttendanceData> = {}
): EventAttendanceData {
  return {
    eventId: faker.string.uuid(),
    userId: faker.string.uuid(),
    status: faker.helpers.arrayElement([
      'attending',
      'not_attending',
      'maybe',
    ]) as EventAttendanceStatus,
    ...overrides,
  };
}

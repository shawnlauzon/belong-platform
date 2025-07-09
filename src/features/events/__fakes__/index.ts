import { faker } from '@faker-js/faker';
import {
  EventDetail,
  EventData,
  EventInfo,
  EventAttendanceData,
} from '../types';
import { EventRow, EventAttendanceRow } from '../types/database';
import { UserDetail } from '../../users';
import { createFakeUser } from '../../users/__fakes__';
import { createFakeCommunity } from '../../communities/__fakes__';
import { toEventInfo } from '../transformers/eventTransformer';
import { EventAttendanceInfo } from '../types/domain';

/**
 * Creates a fake domain Event object with organizer and community
 */
export function createFakeEvent(
  overrides: Partial<EventDetail> = {},
): EventDetail {
  const startDateTime = faker.date.future();
  const endDateTime = faker.date.future({ refDate: startDateTime });

  const organizer = createFakeUser();
  const community = createFakeCommunity();

  return {
    id: faker.string.uuid(),
    title: faker.lorem.words(3),
    description: faker.lorem.paragraph(),
    startDateTime,
    endDateTime: faker.datatype.boolean() ? endDateTime : undefined,
    isAllDay: faker.datatype.boolean(),
    location: faker.location.streetAddress(),
    coordinates: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    maxAttendees: faker.datatype.boolean()
      ? faker.number.int({ min: 5, max: 100 })
      : undefined,
    imageUrls: Array.from(
      { length: faker.number.int({ min: 0, max: 3 }) },
      () => faker.image.urlLoremFlickr({ category: 'event' }),
    ),
    attendeeCount: faker.number.int({ min: 0, max: 50 }),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    organizer,
    community,
    ...overrides,
  };
}

/**
 * Creates a fake domain Event with a custom organizer
 */
export function createFakeEventWithOrganizer(
  organizer: UserDetail,
  overrides: Partial<EventDetail> = {},
): EventDetail {
  const event = createFakeEvent(overrides);
  return {
    ...event,
    organizer,
  };
}

export function createFakeEventRow(overrides?: Partial<EventRow>): EventRow {
  const startDateTime = faker.date.future();
  const endDateTime = faker.date.future({ refDate: startDateTime });

  return {
    id: faker.string.uuid(),
    title: faker.lorem.words(3),
    description: faker.lorem.paragraph(),
    community_id: faker.string.uuid(),
    organizer_id: faker.string.uuid(),
    start_date_time: startDateTime.toISOString(),
    end_date_time: faker.datatype.boolean() ? endDateTime.toISOString() : null,
    is_all_day: faker.datatype.boolean(),
    location: faker.location.streetAddress(),
    coordinates: `POINT(${faker.location.longitude()} ${faker.location.latitude()})`,
    max_attendees: faker.datatype.boolean()
      ? faker.number.int({ min: 5, max: 100 })
      : null,
    image_urls: Array.from(
      { length: faker.number.int({ min: 0, max: 3 }) },
      () => faker.image.urlLoremFlickr({ category: 'event' }),
    ),
    attendee_count: faker.number.int({ min: 0, max: 50 }),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createFakeEventInfo(overrides?: Partial<EventInfo>): EventInfo {
  const row = createFakeEventRow();
  const baseEventInfo = toEventInfo(row);
  return { ...baseEventInfo, ...overrides };
}

export function createFakeEventData(overrides?: Partial<EventData>): EventData {
  const startDateTime = faker.date.future();

  return {
    title: faker.lorem.words(3),
    description: faker.lorem.paragraph(),
    communityId: faker.string.uuid(),
    organizerId: faker.string.uuid(),
    startDateTime,
    endDateTime: faker.datatype.boolean()
      ? faker.date.future({ refDate: startDateTime })
      : undefined,
    isAllDay: faker.datatype.boolean(),
    location: faker.location.streetAddress(),
    coordinates: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    maxAttendees: faker.datatype.boolean()
      ? faker.number.int({ min: 5, max: 100 })
      : undefined,
    imageUrls: Array.from(
      { length: faker.number.int({ min: 0, max: 3 }) },
      () => faker.image.url(),
    ),
    ...overrides,
  };
}

export function createFakeEventAttendanceInfo(
  overrides?: Partial<EventAttendanceInfo>,
): EventAttendanceInfo {
  return {
    eventId: faker.string.uuid(),
    userId: faker.string.uuid(),
    status: faker.helpers.arrayElement([
      'attending',
      'not_attending',
      'maybe',
    ] as const),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

export function createFakeEventAttendanceRow(
  overrides?: Partial<EventAttendanceRow>,
): EventAttendanceRow {
  return {
    event_id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    status: faker.helpers.arrayElement([
      'attending',
      'not_attending',
      'maybe',
    ] as const),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createFakeEventAttendanceData(
  overrides?: Partial<EventAttendanceData>,
): EventAttendanceData {
  return {
    eventId: faker.string.uuid(),
    userId: faker.string.uuid(),
    status: faker.helpers.arrayElement([
      'attending',
      'not_attending',
      'maybe',
    ] as const),
    ...overrides,
  };
}

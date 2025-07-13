import { faker } from '@faker-js/faker';
import {
  Gathering,
  GatheringInput,
  GatheringResponse,
  GatheringResponseInput,
} from '../types';
import { GatheringResponseRow, GatheringRow } from '../types/gatheringRow';
import { User } from '../../users';
import { createFakeUser } from '../../users/__fakes__';
import { createFakeCommunity } from '../../communities/__fakes__';

/**
 * Creates a fake domain Gathering object with organizer and community
 */
export function createFakeGathering(
  overrides: Partial<Gathering> = {},
): Gathering {
  const startDateTime = faker.date.future();
  const endDateTime = faker.date.future({ refDate: startDateTime });

  const organizer = createFakeUser();
  const community = createFakeCommunity();

  return {
    id: faker.string.uuid(),
    title: faker.lorem.words(3),
    description: faker.lorem.paragraph(),
    startDateTime,
    endDateTime: faker.datatype.boolean() ? endDateTime : null,
    isAllDay: faker.datatype.boolean(),
    locationName: faker.location.streetAddress(),
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
    organizerId: organizer.id,
    organizer,
    communityId: community.id,
    community,
    ...overrides,
  };
}

/**
 * Creates a fake domain Gathering with a custom organizer
 */
export function createFakeGatheringWithOrganizer(
  organizer: User,
  overrides: Partial<Gathering> = {},
): Gathering {
  const gathering = createFakeGathering(overrides);
  return {
    ...gathering,
    organizer,
  };
}

export function createFakeGatheringRow(
  overrides?: Partial<GatheringRow>,
): GatheringRow {
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
    location_name: faker.location.streetAddress(),
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

export function createFakeGatheringWithoutRelations(
  overrides?: Partial<Gathering>,
): Gathering {
  const row = createFakeGatheringRow();
  // Directly create the gathering without using transformer
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startDateTime: new Date(row.start_date_time),
    endDateTime: row.end_date_time ? new Date(row.end_date_time) : null,
    isAllDay: row.is_all_day,
    locationName: row.location_name,
    coordinates: { lat: 0, lng: 0 }, // simplified for fake
    maxAttendees: row.max_attendees ?? undefined,
    imageUrls: row.image_urls || [],
    attendeeCount: row.attendee_count,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    organizerId: row.organizer_id,
    organizer: {
      id: row.organizer_id,
      firstName: 'Fake',
      avatarUrl: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    communityId: row.community_id,
    community: {
      id: row.community_id,
      name: 'Fake Community',
      type: 'place',
      icon: undefined,
      memberCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  };
}

export function createFakeGatheringInput(
  overrides?: Partial<GatheringInput>,
): GatheringInput {
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
    locationName: faker.location.streetAddress(),
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

export function createFakeGatheringResponse(
  overrides?: Partial<GatheringResponse>,
): GatheringResponse {
  const gatheringId = overrides?.gatheringId || faker.string.uuid();
  const userId = overrides?.userId || faker.string.uuid();

  return {
    gatheringId,
    userId,
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

export function createFakeGatheringResponseRow(
  overrides?: Partial<GatheringResponseRow>,
): GatheringResponseRow {
  return {
    gathering_id: faker.string.uuid(),
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

export function createFakeGatheringResponseData(
  overrides?: Partial<GatheringResponseInput>,
): GatheringResponseInput {
  return {
    gatheringId: faker.string.uuid(),
    userId: faker.string.uuid(),
    status: faker.helpers.arrayElement([
      'attending',
      'not_attending',
      'maybe',
    ] as const),
    ...overrides,
  };
}

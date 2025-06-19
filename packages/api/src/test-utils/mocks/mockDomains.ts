import {
  Account,
  Community,
  Event,
  EventAttendance,
  EventAttendanceStatus,
  Resource,
  User,
  ResourceCategory,
  MeetupFlexibility,
} from '@belongnetwork/types';
import { faker } from '@faker-js/faker';

/**
 * Creates a mock domain Account object
 */
export function createMockAccount(overrides: Partial<Account> = {}): Account {
  const now = faker.date.recent();
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    avatarUrl: faker.image.avatar(),
    location: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Creates a mock domain User object
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  const now = faker.date.recent();
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName,
    lastName,
    avatarUrl: faker.image.avatar(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Creates a mock domain Resource object with an owner
 */
export function createMockResource(
  overrides: Partial<Resource> = {}
): Resource {
  const now = new Date();

  const owner = createMockUser();

  const community = createMockCommunity();

  return {
    id: faker.string.uuid(),
    type: faker.helpers.arrayElement(['offer', 'request'] as const),
    category: faker.helpers.enumValue(ResourceCategory),
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    imageUrls: Array.from(
      { length: faker.number.int({ min: 1, max: 5 }) },
      () => faker.image.urlLoremFlickr({ category: 'object' })
    ),
    location: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    pickupInstructions: faker.lorem.sentence(),
    parkingInfo: faker.lorem.sentence(),
    meetupFlexibility: faker.helpers.enumValue(MeetupFlexibility),
    availability: faker.lorem.word(),
    isActive: true,
    createdAt: now,
    updatedAt: now,
    owner,
    community,
    ...overrides,
  };
}

/**
 * Creates a mock domain Resource with a custom owner
 */
export function createMockResourceWithOwner(
  owner: User,
  overrides: Partial<Resource> = {}
): Resource {
  const resource = createMockResource(overrides);
  return {
    ...resource,
    owner,
  };
}

export function createMockCommunity(
  overrides: Partial<Community> = {}
): Community {
  return {
    id: faker.string.uuid(),
    name: faker.location.city(),
    description: faker.lorem.sentence(),
    hierarchyPath: [],
    level: faker.helpers.arrayElement(['state', 'city', 'neighborhood']),
    timeZone: faker.location.timeZone(),
    memberCount: faker.number.int({ min: 10, max: 140 }),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    isActive: true,
    deletedAt: undefined,
    deletedBy: undefined,
    parentId: faker.string.uuid(),
    organizer: createMockUser(),
    radiusKm: faker.number.int({ min: 1, max: 100 }),
    center: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    ...overrides,
  };
}

/**
 * Creates a mock domain Event object
 */
export function createMockEvent(overrides: Partial<Event> = {}): Event {
  const now = new Date();
  const startDateTime = faker.date.future();
  const endDateTime = faker.datatype.boolean() 
    ? new Date(startDateTime.getTime() + faker.number.int({ min: 1, max: 8 }) * 60 * 60 * 1000)
    : undefined;

  const organizer = createMockUser();
  const community = createMockCommunity();

  return {
    id: faker.string.uuid(),
    title: faker.lorem.words({ min: 2, max: 6 }),
    description: faker.lorem.paragraphs(2),
    startDateTime,
    endDateTime,
    location: faker.location.streetAddress(),
    coordinates: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    parkingInfo: faker.lorem.sentence(),
    maxAttendees: faker.datatype.boolean() ? faker.number.int({ min: 5, max: 100 }) : undefined,
    registrationRequired: false, // Default to false
    isActive: true, // Default to true
    tags: Array.from(
      { length: faker.number.int({ min: 0, max: 5 }) },
      () => faker.lorem.word()
    ),
    imageUrls: Array.from(
      { length: faker.number.int({ min: 0, max: 3 }) },
      () => faker.image.urlLoremFlickr({ category: 'event' })
    ),
    attendeeCount: faker.number.int({ min: 0, max: 50 }),
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
export function createMockEventAttendance(overrides: Partial<EventAttendance> = {}): EventAttendance {
  const now = new Date();
  const user = createMockUser();
  const event = createMockEvent();

  return {
    id: faker.string.uuid(),
    eventId: event.id,
    userId: user.id,
    status: faker.helpers.arrayElement(['attending', 'not_attending', 'maybe']) as EventAttendanceStatus,
    createdAt: now,
    updatedAt: now,
    user,
    event,
    ...overrides,
  };
}

import {
  EventData,
  EventAttendanceData,
  EventAttendanceStatus,
  MeetupFlexibility,
  ResourceCategory,
  ResourceData,
  CommunityData,
  UserData,
  MessageData,
  ConversationData,
} from '@belongnetwork/types';
import { faker } from '@faker-js/faker';

export function createMockUserData(
  overrides: Partial<UserData> = {}
): UserData {
  return {
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    fullName: faker.person.fullName(),
    avatarUrl: faker.image.avatar(),
    location: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    ...overrides,
  };
}

export function createMockCommunityData(
  overrides: Partial<CommunityData> = {}
): CommunityData {
  const level = faker.helpers.arrayElement(['city', 'neighborhood']);
  const hierarchyPath = [
    {
      level: 'country',
      name: faker.location.country(),
    },
    {
      level: 'state',
      name: faker.location.state(),
    },
    {
      level: 'city',
      name: faker.location.city(),
    },
  ];

  return {
    name: level === 'city' ? faker.location.city() : faker.location.street(),
    level,
    hierarchyPath: hierarchyPath.slice(0, level === 'city' ? 2 : 3),
    description: faker.lorem.sentence(),
    organizerId: faker.string.uuid(),
    parentId: faker.string.uuid(),
    center: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    radiusKm: faker.number.int({ min: 1, max: 140 }),
    memberCount: faker.number.int({ min: 1, max: 10000 }),
    timeZone: faker.location.timeZone(),
    ...overrides,
  };
}

export function createMockResourceData(
  overrides: Partial<ResourceData> = {}
): ResourceData {
  const categories = ['tools', 'skills', 'food', 'supplies', 'other'];
  const types = ['offer', 'request'];
  return {
    type: faker.helpers.arrayElement(types) as 'offer' | 'request',
    category: faker.helpers.arrayElement(categories) as ResourceCategory,
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    communityId: faker.string.uuid(),
    imageUrls: Array.from(
      { length: faker.number.int({ min: 1, max: 5 }) },
      () => faker.image.urlLoremFlickr({ category: 'object' })
    ),
    location: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    pickupInstructions: faker.lorem.sentences(2),
    parkingInfo: faker.lorem.sentence(),
    meetupFlexibility: faker.helpers.arrayElement([
      'home_only',
      'public_meetup_ok',
      'delivery_possible',
    ]) as MeetupFlexibility,
    availability: faker.helpers.arrayElement([
      'weekdays',
      'weekends',
      'anytime',
      'mornings',
    ]),
    isActive: faker.datatype.boolean(),
    ...overrides,
  };
}

export function createMockEventData(
  overrides: Partial<EventData> = {}
): EventData {
  const startDateTime = faker.date.future();
  const endDateTime = faker.datatype.boolean() 
    ? new Date(startDateTime.getTime() + faker.number.int({ min: 1, max: 8 }) * 60 * 60 * 1000)
    : undefined;

  return {
    title: faker.lorem.words({ min: 2, max: 6 }),
    description: faker.lorem.paragraphs(2),
    communityId: faker.string.uuid(),
    organizerId: faker.string.uuid(),
    startDateTime,
    endDateTime,
    location: faker.location.streetAddress(),
    coordinates: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    parkingInfo: faker.lorem.sentence(),
    maxAttendees: faker.datatype.boolean() ? faker.number.int({ min: 5, max: 100 }) : undefined,
    registrationRequired: faker.datatype.boolean(),
    isActive: faker.datatype.boolean(),
    tags: Array.from(
      { length: faker.number.int({ min: 0, max: 5 }) },
      () => faker.lorem.word()
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
    status: faker.helpers.arrayElement(['attending', 'not_attending', 'maybe']) as EventAttendanceStatus,
    ...overrides,
  };
}

export function createMockMessageData(
  overrides: Partial<MessageData> = {}
): MessageData {
  return {
    conversationId: faker.string.uuid(),
    content: faker.lorem.paragraph(),
    ...overrides,
  };
}

export function createMockConversationData(
  overrides: Partial<ConversationData> = {}
): ConversationData {
  return {
    participant1Id: faker.string.uuid(),
    participant2Id: faker.string.uuid(),
    ...overrides,
  };
}

import { faker } from '@faker-js/faker';
import {
  Resource,
  ResourceData,
  ResourceRow,
  MeetupFlexibility,
  ResourceCategory,
} from '../types';
import { ProfileRow, User } from '../../users';
import { createMockUser } from '../../users/__mocks__';
import { createMockCommunity } from '../../communities/__mocks__';

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
    category: faker.helpers.arrayElement(['tools', 'skills', 'food', 'supplies', 'other']),
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

export function createMockDbResource(
  overrides: Partial<ResourceRow> = {}
): ResourceRow {
  const now = new Date().toISOString();
  const categories = ['tools', 'skills', 'food', 'supplies', 'other'];

  return {
    id: faker.string.uuid(),
    community_id: faker.string.uuid(),
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    category: faker.helpers.arrayElement(categories),
    type: faker.helpers.arrayElement(['offer', 'request']),
    image_urls: Array.from(
      { length: faker.number.int({ min: 1, max: 5 }) },
      () => faker.image.urlLoremFlickr({ category: 'object' })
    ),
    location: `POINT(${faker.location.longitude()} ${faker.location.latitude()})`,
    owner_id: faker.string.uuid(),
    created_at: now,
    updated_at: now,
    is_active: faker.datatype.boolean(),
    availability: faker.helpers.arrayElement([
      'weekdays',
      'weekends',
      'anytime',
      'mornings',
    ]),
    meetup_flexibility: faker.helpers.arrayElement([
      'home_only',
      'public_meetup_ok',
      'delivery_possible',
    ]),
    parking_info: faker.lorem.sentence(),
    pickup_instructions: faker.lorem.sentences(2),
    ...overrides,
  };
}

/**
 * Creates a mock database Resource with a custom owner
 */
export function createMockDbResourceWithOwner(
  owner: ProfileRow,
  overrides: Partial<ResourceRow> = {}
): ResourceRow & { owner: ProfileRow } {
  const resource = createMockDbResource({
    owner_id: owner.id,
    ...overrides,
  });
  return {
    ...resource,
    owner,
  };
}

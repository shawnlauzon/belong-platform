import { faker } from '@faker-js/faker';

import type { User, Resource, ResourceData, AuthUser } from '../';

/**
 * Creates a mock domain User object
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  const now = faker.date.recent();
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    id: faker.string.uuid(),
    first_name: firstName,
    last_name: lastName,
    full_name: `${firstName} ${lastName}`,
    avatar_url: faker.image.avatar(),
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Creates a mock AuthUser object (extends User with email)
 */
export function createMockAuthUser(
  overrides: Partial<AuthUser> = {}
): AuthUser {
  const user = createMockUser(overrides);
  return {
    ...user,
    email: faker.internet.email(),
    location: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
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
  const categories: Array<ResourceData['category']> = [
    'tools',
    'skills',
    'food',
    'supplies',
    'other',
  ];
  const owner = createMockUser();

  return {
    id: faker.string.uuid(),
    type: faker.helpers.arrayElement(['offer', 'request'] as const),
    category: faker.helpers.arrayElement(categories),
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    image_urls: Array.from(
      { length: faker.number.int({ min: 1, max: 5 }) },
      () => faker.image.urlLoremFlickr({ category: 'object' })
    ),
    location: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    pickup_instructions: faker.lorem.sentence(),
    parking_info: faker.lorem.sentence(),
    meetup_flexibility: faker.helpers.arrayElement([
      'home_only',
      'public_meetup_ok',
      'delivery_possible',
    ] as const),
    availability: faker.helpers.arrayElement([
      'weekdays',
      'weekends',
      'anytime',
      'mornings',
    ]),
    is_active: true,
    created_at: now,
    updated_at: now,
    owner,
    community: createMockCommunity(),
    distance_minutes: faker.number.int({ min: 1, max: 60 }),
    ...overrides,
  };
}

/**
 * Creates a mock domain Resource with a custom owner
 */
export function createMockResourceWithOwner(
  owner: User,
  overrides: Partial<ResourceData> = {}
): Resource {
  const resource = createMockResource(overrides);
  return {
    ...resource,
    owner,
  };
}

export function createMockCommunity() {
  return {
    id: faker.string.uuid(),
    name: faker.location.city(),
    description: faker.lorem.sentence(),
    member_count: faker.number.int({ min: 10, max: 140 }),
    country: faker.location.country(),
    city: faker.location.city(),
    created_at: faker.date.past(),
    updated_at: faker.date.past(),
    parent_id: faker.string.uuid(),
    creator_id: faker.string.uuid(),
  };
}

import { faker } from '@faker-js/faker';
import type {
  Community,
  NewResource,
  Resource,
  User,
} from '@belongnetwork/core';

export function createMockResource(
  overrides: Partial<Resource> = {}
): Resource {
  return {
    id: faker.string.uuid(),
    owner: createMockUser({ id: faker.string.uuid() }),
    community: createMockCommunity(),
    type: faker.helpers.arrayElement(['offer', 'request'] as const),
    category: faker.helpers.arrayElement([
      'tools',
      'skills',
      'food',
      'supplies',
      'other',
    ]),
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
    pickup_instructions: faker.lorem.sentences(2),
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
    ] as const),
    is_active: faker.datatype.boolean(),
    created_at: faker.date.recent(),
    updated_at: faker.date.recent(),
    ...overrides,
  };
}

/**
 * Creates a mock domain User object
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  const now = new Date();
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

export function createMockNewResource(
  overrides: Partial<NewResource> = {}
): NewResource {
  return {
    owner_id: faker.string.uuid(),
    community_id: faker.string.uuid(),
    type: faker.helpers.arrayElement(['offer', 'request'] as const),
    category: faker.helpers.arrayElement([
      'tools',
      'skills',
      'food',
      'supplies',
      'other',
    ]),
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
    pickup_instructions: faker.lorem.sentences(2),
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
    ] as const),
    is_active: faker.datatype.boolean(),
    ...overrides,
  };
}
function createMockCommunity(): Community {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    country: faker.location.country(),
    state: faker.location.state(),
    city: faker.location.city(),
    neighborhood: faker.location.city(),
    description: faker.lorem.paragraph(),
    center: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    created_at: faker.date.past(),
    updated_at: faker.date.past(),
    member_count: faker.number.int({ min: 1, max: 140 }),
  };
}

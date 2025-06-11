import { faker } from '@faker-js/faker';
import type { UserRow, ResourceRow } from '@belongnetwork/core/transformers';

export function createMockDbProfile(
  overrides: Partial<UserRow> = {}
): UserRow {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const now = new Date().toISOString();

  return {
    id: faker.string.uuid(),
    created_at: now,
    updated_at: now,
    email: faker.internet.email(),
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      avatar_url: faker.image.avatar(),
      location: {
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      },
    },
    ...overrides,
  };
}

export function createMockDbResource(
  overrides: Partial<ResourceRow> = {}
): ResourceRow {
  const now = new Date().toISOString();
  const categories = [
    'tools',
    'skills',
    'food',
    'supplies',
    'other',
  ];

  return {
    id: faker.string.uuid(),
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    category: faker.helpers.arrayElement(categories),
    type: faker.helpers.arrayElement(['offer', 'request']),
    image_urls: Array.from(
      { length: faker.number.int({ min: 1, max: 5 }) },
      () => faker.image.urlLoremFlickr({ category: 'object' })
    ),
    location: `POINT(${faker.location.longitude()} ${faker.location.latitude()})`,
    creator_id: faker.string.uuid(),
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
    times_helped: faker.number.int({ min: 0, max: 50 }),
    ...overrides,
  };
}

/**
 * Creates a mock database Resource with a custom owner
 */
export function createMockDbResourceWithOwner(
  owner: UserRow,
  overrides: Partial<ResourceRow> = {}
): ResourceRow & { owner: UserRow } {
  const resource = createMockDbResource(overrides);
  return {
    ...resource,
    creator_id: owner.id,
    owner,
  };
}
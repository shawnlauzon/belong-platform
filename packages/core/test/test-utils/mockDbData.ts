import { faker } from '@faker-js/faker';
import type { Database } from '../../src/types/database';

type ResourceRow = Database['public']['Tables']['resources']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export function createMockDbProfile(
  overrides: Partial<ProfileRow> = {}
): ProfileRow {
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
    'furniture',
    'clothing',
    'electronics',
    'books',
    'vehicles',
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
      'flexible',
      'semi-flexible',
      'strict',
    ]),
    parking_info: faker.lorem.sentence(),
    pickup_instructions: faker.lorem.sentences(2),
    ...overrides,
  };
}

/**
 * Creates a mock domain Resource with a custom owner
 */
export function createMockDbResourceWithOwner(
  owner: ProfileRow,
  overrides: Partial<ResourceRow> = {}
): ResourceRow {
  const resource = createMockDbResource(overrides);
  return {
    ...resource,
    creator_id: owner.id,
  };
}

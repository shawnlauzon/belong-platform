import { faker } from '@faker-js/faker';
import type { Database } from '@belongnetwork/core';

type ResourceRow = Database['public']['Tables']['resources']['Row'];

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
  const types = ['offer', 'request'] as const;
  const availabilities = [
    'weekdays',
    'weekends',
    'anytime',
    'mornings',
  ] as const;
  const flexibilities = ['flexible', 'semi-flexible', 'strict'] as const;

  return {
    id: faker.string.uuid(),
    creator_id: faker.string.uuid(),
    type: faker.helpers.arrayElement(types),
    category: faker.helpers.arrayElement(categories),
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    image_urls: Array.from(
      { length: faker.number.int({ min: 1, max: 5 }) },
      () => faker.image.urlLoremFlickr({ category: 'object' })
    ),
    location: `POINT(${faker.location.longitude()} ${faker.location.latitude()})`,
    pickup_instructions: faker.lorem.sentences(2),
    parking_info: faker.lorem.sentence(),
    meetup_flexibility: faker.helpers.arrayElement(flexibilities),
    availability: faker.helpers.arrayElement(availabilities),
    is_active: faker.datatype.boolean(),
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function createMockDbCommunity() {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    country: faker.location.country(),
    state: faker.location.state(),
    city: faker.location.city(),
    neighborhood: faker.location.city(),
    description: faker.lorem.paragraph(),
    center: `POINT(${faker.location.longitude()} ${faker.location.latitude()})`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

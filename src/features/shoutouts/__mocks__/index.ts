import { faker } from '@faker-js/faker';
import { ShoutoutRow } from '../types/database';

/**
 * Creates a mock database Shoutout row
 */
export function createMockDbShoutout(
  overrides: Partial<ShoutoutRow> = {}
): ShoutoutRow {
  const now = new Date().toISOString();

  return {
    id: faker.string.uuid(),
    message: faker.lorem.sentence(),
    from_user_id: faker.string.uuid(),
    to_user_id: faker.string.uuid(),
    resource_id: faker.string.uuid(),
    image_urls: Array.from(
      { length: faker.number.int({ min: 0, max: 3 }) },
      () => faker.image.urlLoremFlickr({ category: 'people' })
    ),
    impact_description: faker.datatype.boolean()
      ? faker.lorem.paragraph()
      : null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

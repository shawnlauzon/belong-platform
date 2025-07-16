import { faker } from '@faker-js/faker';
import { ShoutoutRow } from '../types/shoutoutRow';
import type { ShoutoutResourceInput } from '../types';

export function createFakeDbShoutout(
  overrides: Partial<ShoutoutRow> = {},
): ShoutoutRow {
  const now = new Date().toISOString();

  return {
    id: faker.string.uuid(),
    from_user_id: faker.string.uuid(),
    to_user_id: faker.string.uuid(),
    resource_id: faker.string.uuid(),
    community_id: faker.string.uuid(),
    gathering_id: null,
    message: faker.lorem.paragraph(),
    image_urls: Array.from(
      { length: faker.number.int({ min: 0, max: 3 }) },
      () => faker.image.url(),
    ),
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function createFakeShoutoutInput(
  overrides: Partial<ShoutoutResourceInput> = {},
): ShoutoutResourceInput {
  return {
    resourceId: faker.string.uuid(),
    message: faker.lorem.paragraph(),
    imageUrls: Array.from(
      { length: faker.number.int({ min: 0, max: 3 }) },
      () => faker.image.url(),
    ),
    ...overrides,
  };
}

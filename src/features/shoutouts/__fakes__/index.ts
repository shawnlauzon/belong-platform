import { faker } from '@faker-js/faker';
import { ShoutoutRow } from '../types/database';
import { ShoutoutInfo } from '../types/domain';

/**
 * Creates a fake database Shoutout row
 */
export function createFakeDbShoutout(
  overrides: Partial<ShoutoutRow> = {}
): ShoutoutRow {
  const now = new Date().toISOString();

  return {
    id: faker.string.uuid(),
    message: faker.lorem.sentence(),
    from_user_id: faker.string.uuid(),
    to_user_id: faker.string.uuid(),
    resource_id: faker.string.uuid(),
    community_id: faker.string.uuid(),
    image_urls: Array.from(
      { length: faker.number.int({ min: 0, max: 3 }) },
      () => faker.image.urlLoremFlickr({ category: 'people' })
    ),
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Creates a fake ShoutoutInfo for testing
 */
export function createFakeShoutoutInfo(
  overrides: Partial<ShoutoutInfo> = {}
): ShoutoutInfo {
  return {
    id: faker.string.uuid(),
    message: faker.lorem.sentence(),
    fromUserId: faker.string.uuid(),
    toUserId: faker.string.uuid(),
    resourceId: faker.string.uuid(),
    communityId: faker.string.uuid(),
    imageUrls: Array.from(
      { length: faker.number.int({ min: 0, max: 3 }) },
      () => faker.image.urlLoremFlickr({ category: 'people' })
    ),
    createdAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}
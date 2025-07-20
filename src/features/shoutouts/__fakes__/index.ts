import { faker } from '@faker-js/faker';
import { ShoutoutRow } from '../types/shoutoutRow';
import { Shoutout, ShoutoutInput } from '../types';
import { createFakeUser } from '@/features/users/__fakes__';
import { createFakeResource } from '@/features/resources/__fakes__';
import { createFakeCommunity } from '@/features/communities/__fakes__';

/**
 * Creates a fake database Shoutout row
 */
export function createFakeDbShoutout(
  overrides: Partial<ShoutoutRow> = {},
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
      () => faker.image.urlLoremFlickr({ category: 'people' }),
    ),
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Creates a fake Shoutout for testing (resource shoutout by default)
 */
export function createFakeShoutout(
  overrides: Partial<Shoutout> = {},
): Shoutout {
  const fromUser = createFakeUser();
  const toUser = createFakeUser();
  const resource = createFakeResource();
  const community = createFakeCommunity();

  return {
    id: faker.string.uuid(),
    message: faker.lorem.sentence(),
    fromUserId: fromUser.id,
    fromUser,
    toUserId: toUser.id,
    toUser,
    resourceId: resource.id,
    resource,
    communityId: community.id,
    community,
    imageUrls: Array.from(
      { length: faker.number.int({ min: 0, max: 3 }) },
      () => faker.image.urlLoremFlickr({ category: 'people' }),
    ),
    createdAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
    ...overrides,
  } as Shoutout;
}

/**
 * Creates a fake Shoutout without relations for testing
 */
export function createFakeShoutoutWithoutRelations(
  overrides: Partial<Shoutout> = {},
): Shoutout {
  return {
    id: faker.string.uuid(),
    message: faker.lorem.sentence(),
    fromUserId: faker.string.uuid(),
    toUserId: faker.string.uuid(),
    resourceId: faker.string.uuid(),
    communityId: faker.string.uuid(),
    imageUrls: Array.from(
      { length: faker.number.int({ min: 0, max: 3 }) },
      () => faker.image.urlLoremFlickr({ category: 'people' }),
    ),
    createdAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
    // Relations are not loaded in list views
    fromUser: null!,
    toUser: null!,
    resource: null!,
    community: null!,
    ...overrides,
  } as Shoutout;
}

/**
 * Creates a fake ShoutoutInput for testing
 */
export function createFakeShoutoutInput(
  overrides: Partial<ShoutoutInput> = {},
): ShoutoutInput {
  return {
    message: faker.lorem.sentence(),
    resourceId: faker.string.uuid(),
    imageUrls: [],
    fromUserId: faker.string.uuid(),
    toUserId: faker.string.uuid(),
    communityId: faker.string.uuid(),
    ...overrides,
  };
}

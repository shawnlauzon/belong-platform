import { faker } from '@faker-js/faker';
import {
  ResourceDetail,
  ResourceData,
  ResourceCategory,
  ResourceInfo,
} from '../types';
import { ResourceRow } from '../types/database';
import { UserDetail } from '../../users';
import { createFakeUser } from '../../users/__fakes__';
import { createFakeCommunity } from '../../communities/__fakes__';
import { toResourceInfo } from '../transformers/resourceTransformer';
import { ProfileRow } from '@/features/users/types/database';

/**
 * Creates a fake domain Resource object with an owner
 */
export function createFakeResource(
  overrides: Partial<ResourceDetail> = {},
): ResourceDetail {
  const now = new Date();

  const owner = createFakeUser();
  const community = createFakeCommunity();

  return {
    id: faker.string.uuid(),
    type: faker.helpers.arrayElement(['offer', 'request'] as const),
    category: faker.helpers.enumValue(ResourceCategory),
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    imageUrls: Array.from(
      { length: faker.number.int({ min: 1, max: 5 }) },
      () => faker.image.urlLoremFlickr({ category: 'object' }),
    ),
    location: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    createdAt: now,
    updatedAt: now,
    owner,
    community,
    ...overrides,
  };
}

/**
 * Creates a fake domain Resource with a custom owner
 */
export function createFakeResourceWithOwner(
  owner: UserDetail,
  overrides: Partial<ResourceDetail> = {},
): ResourceDetail {
  const resource = createFakeResource(overrides);
  return {
    ...resource,
    owner,
  };
}

export function createFakeResourceRow(
  overrides?: Partial<ResourceRow>,
): ResourceRow {
  return {
    id: faker.string.uuid(),
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    type: faker.helpers.arrayElement(['offer', 'request'] as const),
    category: faker.helpers.enumValue(ResourceCategory),
    owner_id: faker.string.uuid(),
    community_id: faker.string.uuid(),
    image_urls: [faker.image.urlLoremFlickr({ category: 'object' })],
    location: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createFakeResourceInfo(
  overrides?: Partial<ResourceInfo>,
): ResourceInfo {
  const row = createFakeResourceRow();
  const baseResourceInfo = toResourceInfo(row);
  return { ...baseResourceInfo, ...overrides };
}

export function createFakeResourceData(
  overrides?: Partial<ResourceData>,
): ResourceData {
  return {
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    type: faker.helpers.arrayElement(['offer', 'request'] as const),
    category: faker.helpers.enumValue(ResourceCategory),
    communityId: faker.string.uuid(),
    imageUrls: [faker.image.url(), faker.image.url()],
    location: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    ...overrides,
  };
}

export function createFakeDbResource(
  overrides: Partial<ResourceRow> = {},
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
      () => faker.image.urlLoremFlickr({ category: 'object' }),
    ),
    location: `POINT(${faker.location.longitude()} ${faker.location.latitude()})`,
    owner_id: faker.string.uuid(),
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Creates a fake database Resource with a custom owner
 */
export function createFakeDbResourceWithOwner(
  owner: ProfileRow,
  overrides: Partial<ResourceRow> = {},
): ResourceRow & { owner: ProfileRow } {
  const resource = createFakeDbResource({
    owner_id: owner.id,
    ...overrides,
  });
  return {
    ...resource,
    owner,
  };
}

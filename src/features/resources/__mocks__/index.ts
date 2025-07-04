import { faker } from '@faker-js/faker';
import {
  Resource,
  ResourceData,
  ResourceCategory,
  ResourceInfo,
} from '../types';
import { ResourceRow } from '../types/database';
import { User } from '../../users';
import { createMockUser } from '../../users/__mocks__';
import { createMockCommunity } from '../../communities/__mocks__';
import { toResourceInfo } from '../transformers/resourceTransformer';
import { ProfileRow } from '@/features/users/types/database';

/**
 * Creates a mock domain Resource object with an owner
 */
export function createMockResource(
  overrides: Partial<Resource> = {},
): Resource {
  const now = new Date();

  const owner = createMockUser();
  const community = createMockCommunity();

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
 * Creates a mock domain Resource with a custom owner
 */
export function createMockResourceWithOwner(
  owner: User,
  overrides: Partial<Resource> = {},
): Resource {
  const resource = createMockResource(overrides);
  return {
    ...resource,
    owner,
  };
}

export function createMockResourceRow(
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
    image_urls:
      faker.helpers.maybe(() => [faker.image.url(), faker.image.url()]) ?? [],
    location:
      faker.helpers.maybe(() => ({
        type: 'Coordinates' as const,
        coordinates: [faker.location.longitude(), faker.location.latitude()],
      })) ?? null,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createMockResourceInfo(
  overrides?: Partial<ResourceInfo>,
): ResourceInfo {
  const row = createMockResourceRow();
  const baseResourceInfo = toResourceInfo(row);
  return { ...baseResourceInfo, ...overrides };
}

export function createMockResourceData(
  overrides?: Partial<ResourceData>,
): ResourceData {
  return {
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    type: faker.helpers.arrayElement(['offer', 'request'] as const),
    category: faker.helpers.enumValue(ResourceCategory),
    ownerId: faker.string.uuid(),
    communityId: faker.string.uuid(),
    imageUrls: [faker.image.url(), faker.image.url()],
    location: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    ...overrides,
  };
}

export function createMockDbResource(
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
 * Creates a mock database Resource with a custom owner
 */
export function createMockDbResourceWithOwner(
  owner: ProfileRow,
  overrides: Partial<ResourceRow> = {},
): ResourceRow & { owner: ProfileRow } {
  const resource = createMockDbResource({
    owner_id: owner.id,
    ...overrides,
  });
  return {
    ...resource,
    owner,
  };
}

import { faker } from '@faker-js/faker';
import type { ResourceRow } from '@/features/resources/types/database';
import {
  ResourceCategory,
  ResourceData,
  ResourceInfo,
} from '@/features/resources';
import { toResourceInfo } from '../../transformers/resourceTransformer';

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

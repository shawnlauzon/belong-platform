import { faker } from '@faker-js/faker';
import type { ResourceRow } from '@/features/resources/types/database';
import type { ResourceInfo } from '@/features/resources';
import { toResourceInfo } from '../../transformers/resourceTransformer';

export function createMockResourceRow(
  overrides?: Partial<ResourceRow>,
): ResourceRow {
  return {
    id: faker.string.uuid(),
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    type: faker.helpers.arrayElement(['offer', 'request'] as const),
    category: faker.helpers.arrayElement([
      'tools',
      'skills',
      'food',
      'supplies',
      'other',
    ] as const),
    owner_id: faker.string.uuid(),
    community_id: faker.string.uuid(),
    image_urls:
      faker.helpers.maybe(() => [faker.image.url(), faker.image.url()]) ?? null,
    location:
      faker.helpers.maybe(() => ({
        type: 'Point' as const,
        coordinates: [faker.location.longitude(), faker.location.latitude()],
      })) ?? null,
    availability: faker.helpers.maybe(() => faker.lorem.sentence()) ?? null,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createMockResourceInfo(
  overrides?: Partial<ResourceInfo>,
): ResourceInfo {
  const row = createMockResourceRow();
  return toResourceInfo({ ...row, ...overrides });
}

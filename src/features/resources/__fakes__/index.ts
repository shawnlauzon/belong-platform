import { faker } from '@faker-js/faker';
import { Resource, ResourceInput, ResourceCategory } from '../types';
import { ResourceRow, ResourceRowWithRelations } from '../types/resourceRow';
import { User } from '../../users';
import { createFakeProfileRow, createFakeUser } from '../../users/__fakes__';
import { createFakeCommunityRow } from '../../communities/__fakes__';

/**
 * Creates a fake domain Resource object with an owner
 */
export function createFakeResource(
  overrides: Partial<Resource> = {},
): Resource {
  const now = new Date();

  const owner = createFakeUser();

  return {
    id: faker.string.uuid(),
    type: faker.helpers.arrayElement(['offer', 'request'] as const),
    category: faker.helpers.maybe(
      () => faker.helpers.enumValue(ResourceCategory),
      { probability: 0.8 },
    ) as ResourceCategory | undefined,
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    imageUrls: [],
    locationName: faker.location.city(),
    coordinates: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    createdAt: now,
    updatedAt: now,
    ownerId: owner.id,
    owner,
    communityId: faker.string.uuid(),
    ...overrides,
  };
}

/**
 * Creates a fake domain Resource with a custom owner
 */
export function createFakeResourceWithOwner(
  owner: User,
  overrides: Partial<Resource> = {},
): Resource {
  const resource = createFakeResource({ ...overrides, ownerId: owner.id });
  return {
    ...resource,
    owner,
  };
}

export function createFakeResourceRowWithoutRelations(
  overrides?: Partial<ResourceRow>,
): ResourceRow {
  return {
    id: faker.string.uuid(),
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    type: faker.helpers.arrayElement(['offer', 'request'] as const),
    category:
      faker.helpers.maybe(() => faker.helpers.enumValue(ResourceCategory), {
        probability: 0.8,
      }) ?? null,
    owner_id: faker.string.uuid(),
    community_id: faker.string.uuid(),
    image_urls: [],
    location_name: faker.location.city(),
    coordinates: `POINT(${faker.location.longitude()} ${faker.location.latitude()})`,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createFakeResourceInput(
  overrides?: Partial<ResourceInput>,
): ResourceInput {
  return {
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    type: faker.helpers.arrayElement(['offer', 'request'] as const),
    category: faker.helpers.enumValue(ResourceCategory),
    communityId: faker.string.uuid(),
    imageUrls: [],
    locationName: faker.location.city(),
    coordinates: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    ...overrides,
  };
}

export function createFakeResourceRow(
  overrides: Partial<ResourceRowWithRelations> = {},
): ResourceRowWithRelations {
  const now = new Date().toISOString();
  const categories = ['tools', 'skills', 'food', 'supplies', 'other'];

  return {
    id: faker.string.uuid(),
    owner: createFakeProfileRow(),
    community: createFakeCommunityRow(),
    community_id: faker.string.uuid(),
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    category:
      faker.helpers.maybe(() => faker.helpers.arrayElement(categories), {
        probability: 0.8,
      }) ?? null,
    type: faker.helpers.arrayElement(['offer', 'request']),
    image_urls: Array.from(
      { length: faker.number.int({ min: 1, max: 5 }) },
      () => faker.image.urlLoremFlickr({ category: 'object' }),
    ),
    location_name: faker.location.city(),
    coordinates: `POINT(${faker.location.longitude()} ${faker.location.latitude()})`,
    owner_id: faker.string.uuid(),
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

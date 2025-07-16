import { faker } from '@faker-js/faker';
import { Resource, ResourceInput, ResourceCategory, ResourceTimeslot, ResourceTimeslotInput, ResourceClaim, ResourceClaimInput } from '../types';
import { ResourceRow, ResourceRowWithRelations } from '../types/resourceRow';
import { ResourceTimeslotRow, ResourceTimeslotUpdateDbData, ResourceClaimRow } from '../types/resourceRow';
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
      () => faker.helpers.arrayElement(['tools', 'skills', 'food', 'supplies', 'other'] as const),
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
    status: faker.helpers.arrayElement(['open', 'completed', 'cancelled'] as const),
    maxClaims: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 10 })),
    requiresApproval: faker.datatype.boolean(),
    expiresAt: faker.helpers.maybe(() => faker.date.future()),
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
      faker.helpers.maybe(() => faker.helpers.arrayElement(['tools', 'skills', 'food', 'supplies', 'other'] as const), {
        probability: 0.8,
      }) ?? null,
    owner_id: faker.string.uuid(),
    community_id: faker.string.uuid(),
    image_urls: [],
    location_name: faker.location.city(),
    coordinates: `POINT(${faker.location.longitude()} ${faker.location.latitude()})`,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    status: faker.helpers.arrayElement(['open', 'completed', 'cancelled'] as const),
    max_claims: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 10 })) ?? null,
    requires_approval: faker.datatype.boolean(),
    expires_at: faker.helpers.maybe(() => faker.date.future().toISOString()) ?? null,
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
    category: faker.helpers.arrayElement(['tools', 'skills', 'food', 'supplies', 'other'] as const),
    communityId: faker.string.uuid(),
    imageUrls: [],
    locationName: faker.location.city(),
    coordinates: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    status: faker.helpers.arrayElement(['open', 'completed', 'cancelled'] as const),
    maxClaims: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 10 })),
    requiresApproval: faker.datatype.boolean(),
    expiresAt: faker.helpers.maybe(() => faker.date.future()),
    ...overrides,
  };
}

export function createFakeResourceRow(
  overrides: Partial<ResourceRowWithRelations> = {},
): ResourceRowWithRelations {
  const now = new Date().toISOString();

  return {
    id: faker.string.uuid(),
    owner: createFakeProfileRow(),
    community: createFakeCommunityRow(),
    community_id: faker.string.uuid(),
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    category:
      faker.helpers.maybe(() => faker.helpers.arrayElement(['tools', 'skills', 'food', 'supplies', 'other'] as const), {
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
    status: faker.helpers.arrayElement(['open', 'completed', 'cancelled'] as const),
    max_claims: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 10 })) ?? null,
    requires_approval: faker.datatype.boolean(),
    expires_at: faker.helpers.maybe(() => faker.date.future().toISOString()) ?? null,
    ...overrides,
  };
}

/**
 * Creates a fake ResourceTimeslot object
 */
export function createFakeResourceTimeslot(
  overrides: Partial<ResourceTimeslot> = {},
): ResourceTimeslot {
  const now = new Date();
  const startTime = faker.date.future();
  const endTime = new Date(startTime.getTime() + faker.number.int({ min: 30, max: 180 }) * 60 * 1000);

  return {
    id: faker.string.uuid(),
    resourceId: faker.string.uuid(),
    startTime,
    endTime,
    maxClaims: faker.number.int({ min: 1, max: 10 }),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Creates a fake ResourceTimeslotInput object
 */
export function createFakeResourceTimeslotInput(
  overrides: Partial<ResourceTimeslotInput> = {},
): ResourceTimeslotInput {
  const startTime = faker.date.future();
  const endTime = new Date(startTime.getTime() + faker.number.int({ min: 30, max: 180 }) * 60 * 1000);

  return {
    resourceId: faker.string.uuid(),
    startTime,
    endTime,
    maxClaims: faker.number.int({ min: 1, max: 10 }),
    ...overrides,
  };
}

/**
 * Creates a fake ResourceTimeslotUpdate object
 */
export function createFakeResourceTimeslotUpdate(
  overrides: Partial<ResourceTimeslotUpdateDbData> = {},
): ResourceTimeslotUpdateDbData {
  const startTime = faker.date.future();
  const endTime = new Date(startTime.getTime() + faker.number.int({ min: 30, max: 180 }) * 60 * 1000);

  return {
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    max_claims: faker.number.int({ min: 1, max: 10 }),
    ...overrides,
  };
}

/**
 * Creates a fake ResourceTimeslotRow object
 */
export function createFakeResourceTimeslotRow(
  overrides: Partial<ResourceTimeslotRow> = {},
): ResourceTimeslotRow {
  const now = new Date().toISOString();
  const startTime = faker.date.future();
  const endTime = new Date(startTime.getTime() + faker.number.int({ min: 30, max: 180 }) * 60 * 1000);

  return {
    id: faker.string.uuid(),
    resource_id: faker.string.uuid(),
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    max_claims: faker.number.int({ min: 1, max: 10 }),
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Creates a fake ResourceClaim object
 */
export function createFakeResourceClaim(
  overrides: Partial<ResourceClaim> = {},
): ResourceClaim {
  const now = new Date();

  return {
    id: faker.string.uuid(),
    resourceId: faker.string.uuid(),
    userId: faker.string.uuid(),
    timeslotId: faker.helpers.maybe(() => faker.string.uuid()),
    status: faker.helpers.arrayElement(['pending', 'approved', 'rejected', 'completed', 'cancelled'] as const),
    notes: faker.helpers.maybe(() => faker.lorem.sentence()),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Creates a fake ResourceClaimInput object
 */
export function createFakeResourceClaimInput(
  overrides: Partial<ResourceClaimInput> = {},
): ResourceClaimInput {
  return {
    resourceId: faker.string.uuid(),
    timeslotId: faker.helpers.maybe(() => faker.string.uuid()),
    status: faker.helpers.arrayElement(['pending', 'approved', 'rejected', 'completed', 'cancelled'] as const),
    notes: faker.helpers.maybe(() => faker.lorem.sentence()),
    ...overrides,
  };
}

/**
 * Creates a fake ResourceClaimRow object
 */
export function createFakeResourceClaimRow(
  overrides: Partial<ResourceClaimRow> = {},
): ResourceClaimRow {
  const now = new Date().toISOString();

  return {
    id: faker.string.uuid(),
    resource_id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    timeslot_id: faker.helpers.maybe(() => faker.string.uuid()) ?? null,
    status: faker.helpers.arrayElement(['pending', 'approved', 'rejected', 'completed', 'cancelled'] as const),
    notes: faker.helpers.maybe(() => faker.lorem.sentence()) ?? null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

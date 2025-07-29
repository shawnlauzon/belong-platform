import { faker } from '@faker-js/faker';
import {
  Resource,
  ResourceInput,
  type ResourceCategory,
  ResourceTimeslot,
  ResourceTimeslotInput,
  ResourceClaim,
  ResourceClaimInput,
  ResourceTypeEnum,
} from '../types';
import {
  ResourceTimeslotRow,
  ResourceTimeslotUpdateDbData,
  ResourceClaimRow,
  ResourceRow,
} from '../types/resourceRow';
import { User } from '../../users';
import { createFakeUser } from '../../users/__fakes__';

/**
 * Creates a fake domain Resource object with an owner
 */
export function createFakeResource(
  overrides: Partial<Resource> = {},
): Resource {
  const now = new Date();

  const owner = createFakeUser();

  const type = faker.helpers.arrayElement([
    ResourceTypeEnum.OFFER,
    ResourceTypeEnum.REQUEST,
    ResourceTypeEnum.EVENT,
  ]);

  const category =
    type === ResourceTypeEnum.EVENT
      ? ('drinks' as ResourceCategory)
      : (faker.helpers.maybe(
          () =>
            faker.helpers.arrayElement([
              'tools',
              'skills',
              'food',
              'supplies',
              'other',
              'drinks',
            ] as const),
          { probability: 0.8 },
        ) as ResourceCategory | undefined);

  return {
    id: faker.string.uuid(),
    type,
    areTimeslotsFlexible: true,
    category,
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
    communityIds: [faker.string.uuid()],
    status: faker.helpers.arrayElement([
      'open',
      'completed',
      'cancelled',
    ] as const),
    claimLimit: faker.helpers.maybe(() =>
      faker.number.int({ min: 1, max: 10 }),
    ),
    claimLimitPer: faker.helpers.maybe(() =>
      faker.helpers.arrayElement(['total', 'timeslot'] as const),
    ),
    requiresApproval: faker.datatype.boolean(),
    isRecurring: faker.datatype.boolean(),
    expiresAt: faker.helpers.maybe(() => faker.date.future()),
    timeslots: [],
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
    ownerId: owner.id,
  };
}

export function createFakeResourceInput(
  overrides?: Partial<ResourceInput>,
): ResourceInput {
  const type = faker.helpers.arrayElement([
    ResourceTypeEnum.OFFER,
    ResourceTypeEnum.REQUEST,
    ResourceTypeEnum.EVENT,
  ]);

  const category =
    type === ResourceTypeEnum.EVENT
      ? ('drinks' as ResourceCategory)
      : faker.helpers.arrayElement([
          'tools',
          'skills',
          'food',
          'supplies',
          'other',
          'drinks',
        ] as const);

  return {
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    type,
    category,
    communityIds: [faker.string.uuid()],
    imageUrls: [],
    locationName: faker.location.city(),
    coordinates: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    status: faker.helpers.arrayElement([
      'open',
      'completed',
      'cancelled',
    ] as const),
    claimLimit: faker.helpers.maybe(() =>
      faker.number.int({ min: 1, max: 10 }),
    ),
    claimLimitPer: faker.helpers.maybe(() =>
      faker.helpers.arrayElement(['total', 'timeslot'] as const),
    ),
    requiresApproval: faker.datatype.boolean(),
    isRecurring: faker.datatype.boolean(),
    expiresAt: faker.helpers.maybe(() => faker.date.future()),
    ...overrides,
  };
}

export function createFakeResourceRow(
  overrides: Partial<ResourceRow> = {},
): ResourceRow {
  const now = new Date().toISOString();

  const type = faker.helpers.arrayElement([
    ResourceTypeEnum.OFFER,
    ResourceTypeEnum.REQUEST,
    ResourceTypeEnum.EVENT,
  ]);

  const category =
    type === ResourceTypeEnum.EVENT
      ? 'drinks'
      : faker.helpers.arrayElement([
          'tools',
          'skills',
          'food',
          'supplies',
          'other',
          'rides',
          'housing',
          'drinks',
        ] as const);

  return {
    id: faker.string.uuid(),
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    category,
    type,
    image_urls: Array.from(
      { length: faker.number.int({ min: 1, max: 5 }) },
      () => faker.image.urlLoremFlickr({ category: 'object' }),
    ),
    location_name: faker.location.city(),
    coordinates: `POINT(${faker.location.longitude()} ${faker.location.latitude()})`,
    owner_id: faker.string.uuid(),
    created_at: now,
    updated_at: now,
    status: faker.helpers.arrayElement([
      'open',
      'completed',
      'cancelled',
    ] as const),
    claim_limit:
      faker.helpers.maybe(() => faker.number.int({ min: 1, max: 10 })) ?? null,
    claim_limit_per: faker.helpers.arrayElement(['total', 'timeslot'] as const),
    requires_approval: faker.datatype.boolean(),
    timeslots_flexible: true,
    is_recurring: faker.datatype.boolean(),
    expires_at:
      faker.helpers.maybe(() => faker.date.future().toISOString()) ?? null,
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
  const endTime = new Date(
    startTime.getTime() + faker.number.int({ min: 30, max: 180 }) * 60 * 1000,
  );

  return {
    id: faker.string.uuid(),
    resourceId: faker.string.uuid(),
    startTime,
    endTime,
    createdAt: now,
    updatedAt: now,
    status: faker.helpers.arrayElement(['available', 'unavailable'] as const),
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
  const endTime = new Date(
    startTime.getTime() + faker.number.int({ min: 30, max: 180 }) * 60 * 1000,
  );

  return {
    resourceId: faker.string.uuid(),
    startTime,
    endTime,
    status: faker.helpers.arrayElement(['available', 'unavailable'] as const),
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
  const endTime = new Date(
    startTime.getTime() + faker.number.int({ min: 30, max: 180 }) * 60 * 1000,
  );

  return {
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
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
  const endTime = new Date(
    startTime.getTime() + faker.number.int({ min: 30, max: 180 }) * 60 * 1000,
  );

  return {
    id: faker.string.uuid(),
    resource_id: faker.string.uuid(),
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
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
    claimantId: faker.string.uuid(),
    resourceOwnerId: faker.string.uuid(),
    timeslot: createFakeResourceTimeslot(),
    timeslotId: faker.string.uuid(),
    status: faker.helpers.arrayElement([
      'pending',
      'approved',
      'rejected',
      'completed',
      'cancelled',
      'interested',
      'given',
      'received',
    ] as const),
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
    timeslotId: faker.string.uuid(),
    status: 'pending',
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
    claimant_id: faker.string.uuid(),
    timeslot_id: faker.string.uuid(),
    status: faker.helpers.arrayElement([
      'pending',
      'approved',
      'rejected',
      'completed',
      'cancelled',
    ] as const),
    notes: faker.helpers.maybe(() => faker.lorem.sentence()) ?? null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

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
  CommitmentLevel,
} from '../types';
import {
  ResourceTimeslotRow,
  ResourceTimeslotUpdateDbData,
  ResourceClaimRow,
  ResourceRowJoinCommunitiesJoinTimeslots,
} from '../types/resourceRow';
import { CurrentUser } from '../../users';
import { createFakeCurrentUser } from '../../users/__fakes__';

/**
 * Creates a fake domain Resource object with an owner
 */
export function createFakeResource(
  overrides: Partial<Resource> = {},
): Resource {
  const now = new Date();

  const owner = createFakeCurrentUser();

  const type = faker.helpers.arrayElement([
    ResourceTypeEnum.OFFER,
    ResourceTypeEnum.REQUEST,
    ResourceTypeEnum.EVENT,
  ]);

  const category =
    type === ResourceTypeEnum.EVENT
      ? faker.helpers.arrayElement(['food', 'drinks'] as const)
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
    timeslots: [],
    commentCount: 0,
    expiresAt: faker.helpers.maybe(() => faker.date.future()),
    lastRenewedAt: faker.helpers.maybe(() => faker.date.recent()) ?? now,
    ...overrides,
  };
}

/**
 * Creates a fake domain Resource with a custom owner
 */
export function createFakeResourceWithOwner(
  owner: CurrentUser,
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
      ? faker.helpers.arrayElement(['food', 'drinks'] as const)
      : faker.helpers.arrayElement([
          'tools',
          'skills',
          'food',
          'supplies',
          'other',
          'drinks',
        ] as const);

  const baseInput = {
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
    ...overrides,
  };

  // Recalculate category if type was overridden to ensure consistency
  if (overrides?.type === ResourceTypeEnum.EVENT && !overrides.category) {
    baseInput.category = faker.helpers.arrayElement(['food', 'drinks'] as const);
  }

  return baseInput;
}

export function createFakeResourceRow(
  overrides: Partial<ResourceRowJoinCommunitiesJoinTimeslots> = {},
): ResourceRowJoinCommunitiesJoinTimeslots {
  const now = new Date().toISOString();

  const type = faker.helpers.arrayElement([
    ResourceTypeEnum.OFFER,
    ResourceTypeEnum.REQUEST,
    ResourceTypeEnum.EVENT,
  ]);

  const category =
    type === ResourceTypeEnum.EVENT
      ? faker.helpers.arrayElement(['food', 'drinks'] as const)
      : faker.helpers.arrayElement([
          'tools',
          'skills',
          'food',
          'supplies',
          'other',
          'rides',
          'housing',
          'drinks',
          'games',
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
    last_renewed_at: faker.helpers.maybe(() => faker.date.recent().toISOString()) ?? now,
    comment_count: 0,
    expires_at: faker.helpers.maybe(() => faker.date.future().toISOString()) ?? null,
    is_active: faker.datatype.boolean(),
    resource_communities: [],
    resource_timeslots: [],
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
    status: faker.helpers.arrayElement([
      'active',
      'completed',
      'cancelled',
    ] as const),
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
    status: faker.helpers.arrayElement([
      'active',
      'completed',
      'cancelled',
    ] as const),
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
    status: faker.helpers.arrayElement([
      'active',
      'completed',
      'cancelled',
    ] as const),
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
      'given',
      'going',
      'attended',
    ] as const),
    commitmentLevel: faker.helpers.arrayElement(['interested', 'committed'] as CommitmentLevel[]),
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
    notes: faker.helpers.maybe(() => faker.lorem.sentence()),
    commitmentLevel: faker.helpers.arrayElement(['interested', 'committed'] as CommitmentLevel[]),
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
      'given',
      'going',
      'attended',
    ] as const),
    commitment_level: faker.helpers.arrayElement(['interested', 'committed'] as CommitmentLevel[]),
    notes: faker.helpers.maybe(() => faker.lorem.sentence()) ?? null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

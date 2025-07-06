import { faker } from '@faker-js/faker';
import { 
  Community, 
  CommunityData, 
  CommunityInfo, 
  CommunityMembership,
  CommunityMembershipInfo,
  CommunityMembershipData 
} from '../types';
import { CommunityRow } from '../types/database';
import { ProfileRow } from '../../users/types/database';
import { createFakeDbProfile, createFakeUser } from '../../users/__fakes__';

export function createFakeCommunity(
  overrides: Partial<Community> = {}
): Community {
  return {
    id: faker.string.uuid(),
    name: faker.location.city(),
    description: faker.lorem.sentence(),
    icon: faker.helpers.arrayElement(['🏘️', '🏙️', '🌆', '🏞️', '🌳']),
    timeZone: faker.location.timeZone(),
    memberCount: faker.number.int({ min: 10, max: 140 }),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    organizer: createFakeUser(),
    boundary: {
      type: 'isochrone',
      center: {
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      },
      travelMode: faker.helpers.arrayElement(['walking', 'cycling', 'driving']),
      travelTimeMin: faker.number.int({ min: 5, max: 60 }),
      polygon: {
        type: 'Polygon',
        coordinates: [[[faker.location.longitude(), faker.location.latitude()]]],
      },
      areaSqKm: faker.number.float({ min: 0.1, max: 100 }),
    },
    ...overrides,
  };
}

export function createFakeCommunityData(
  overrides: Partial<CommunityData> = {}
): CommunityData {
  return {
    name: faker.location.city(),
    description: faker.lorem.sentence(),
    icon: faker.helpers.arrayElement(['🏘️', '🏙️', '🌆', '🏞️', '🌳']),
    organizerId: faker.string.uuid(),
    memberCount: faker.number.int({ min: 1, max: 10000 }),
    timeZone: faker.location.timeZone(),
    boundary: {
      type: 'isochrone',
      center: {
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      },
      travelMode: faker.helpers.arrayElement(['walking', 'cycling', 'driving']),
      travelTimeMin: faker.number.int({ min: 5, max: 60 }),
      polygon: {
        type: 'Polygon',
        coordinates: [[[faker.location.longitude(), faker.location.latitude()]]],
      },
      areaSqKm: faker.number.float({ min: 0.1, max: 100 }),
    },
    ...overrides,
  };
}

export function createFakeCommunityInfo(
  overrides: Partial<CommunityInfo> = {}
): CommunityInfo {
  return {
    id: faker.string.uuid(),
    name: faker.location.city(),
    description: faker.lorem.sentence(),
    icon: faker.helpers.arrayElement(['🏘️', '🏙️', '🌆', '🏞️', '🌳']),
    timeZone: faker.location.timeZone(),
    memberCount: faker.number.int({ min: 10, max: 140 }),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    organizerId: faker.string.uuid(),
    boundary: {
      type: 'isochrone',
      center: {
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      },
      travelMode: faker.helpers.arrayElement(['walking', 'cycling', 'driving']),
      travelTimeMin: faker.number.int({ min: 5, max: 60 }),
      polygon: {
        type: 'Polygon',
        coordinates: [[[faker.location.longitude(), faker.location.latitude()]]],
      },
      areaSqKm: faker.number.float({ min: 0.1, max: 100 }),
    },
    ...overrides,
  };
}

/**
 * Creates a fake database Community row
 */
export function createFakeDbCommunity(
  overrides: Partial<CommunityRow> = {}
): CommunityRow {
  const now = faker.date.recent().toISOString();

  return {
    id: faker.string.uuid(),
    organizer_id: faker.string.uuid(),
    name: faker.location.city(),
    description: faker.lorem.sentence(),
    icon: faker.helpers.arrayElement(['🏘️', '🏙️', '🌆', '🏞️', '🌳', null]),
    member_count: faker.number.int({ min: 1, max: 10000 }),
    created_at: now,
    updated_at: now,
    time_zone: faker.location.timeZone(),
    boundary: {
      type: 'isochrone',
      center: {
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      },
      travelMode: faker.helpers.arrayElement(['walking', 'cycling', 'driving']),
      travelTimeMin: faker.number.int({ min: 5, max: 60 }),
      polygon: {
        type: 'Polygon',
        coordinates: [[[faker.location.longitude(), faker.location.latitude()]]],
      },
      areaSqKm: faker.number.float({ min: 0.1, max: 100 }),
    },
    boundary_geometry: null,
    boundary_geometry_detailed: null,
    ...overrides,
  };
}

/**
 * Creates a fake database Community with organizer attached
 */
export function createFakeDbCommunityWithOrganizer(
  overrides: Partial<CommunityRow> = {}
): CommunityRow & { organizer: ProfileRow } {
  const organizer = createFakeDbProfile();
  const community = createFakeDbCommunity({
    organizer_id: organizer.id,
    ...overrides,
  });

  return {
    ...community,
    organizer,
  };
}

/**
 * Creates a fake hierarchy of communities (country -> state -> city -> neighborhood)
 */
export function createFakeCommunityHierarchy() {
  const now = new Date().toISOString();

  const country = createFakeDbCommunity({
    name: faker.location.country(),
    description: `Community for ${faker.location.country()} residents`,
    created_at: now,
  });

  const state = createFakeDbCommunity({
    name: faker.location.state(),
    description: `Community for ${faker.location.state()} residents`,
    created_at: now,
  });

  const city = createFakeDbCommunity({
    name: faker.location.city(),
    description: `Community for ${faker.location.city()} residents`,
    created_at: now,
  });

  const neighborhood = createFakeDbCommunity({
    name: faker.location.street(),
    description: `Community for ${faker.location.street()} neighborhood`,
    created_at: now,
  });

  return {
    country,
    state,
    city,
    neighborhood,
    all: [country, state, city, neighborhood],
  };
}

/**
 * Creates a fake CommunityMembershipData
 */
export function createFakeCommunityMembershipData(
  overrides: Partial<CommunityMembershipData> = {}
): CommunityMembershipData {
  return {
    userId: faker.string.uuid(),
    communityId: faker.string.uuid(),
    ...overrides,
  };
}

/**
 * Creates a fake CommunityMembershipInfo
 */
export function createFakeCommunityMembershipInfo(
  overrides: Partial<CommunityMembershipInfo> = {}
): CommunityMembershipInfo {
  return {
    userId: faker.string.uuid(),
    communityId: faker.string.uuid(),
    joinedAt: faker.date.past(),
    ...overrides,
  };
}

/**
 * Creates a fake CommunityMembership with optional composed objects
 */
export function createFakeCommunityMembership(
  overrides: Partial<CommunityMembership> = {}
): CommunityMembership {
  return {
    userId: faker.string.uuid(),
    communityId: faker.string.uuid(),
    joinedAt: faker.date.past(),
    user: createFakeUser(),
    community: createFakeCommunity(),
    ...overrides,
  };
}

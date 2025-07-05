import { faker } from '@faker-js/faker';
import { 
  Community, 
  CommunityData, 
  CommunityInfo, 
  CommunityRow, 
  CommunityMembership,
  CommunityMembershipInfo,
  CommunityMembershipData 
} from '../types';
import { ProfileRow } from '../../users';
import { createMockDbProfile, createMockUser } from '../../users/__mocks__';

export function createMockCommunity(
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
    organizer: createMockUser(),
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

export function createMockCommunityData(
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

export function createMockCommunityInfo(
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
 * Creates a mock database Community row
 */
export function createMockDbCommunity(
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
 * Creates a mock database Community with organizer attached
 */
export function createMockDbCommunityWithOrganizer(
  overrides: Partial<CommunityRow> = {}
): CommunityRow & { organizer: ProfileRow } {
  const organizer = createMockDbProfile();
  const community = createMockDbCommunity({
    organizer_id: organizer.id,
    ...overrides,
  });

  return {
    ...community,
    organizer,
  };
}

/**
 * Creates a mock hierarchy of communities (country -> state -> city -> neighborhood)
 */
export function createMockCommunityHierarchy() {
  const now = new Date().toISOString();

  const country = createMockDbCommunity({
    name: faker.location.country(),
    description: `Community for ${faker.location.country()} residents`,
    parent_id: null,
    created_at: now,
  });

  const state = createMockDbCommunity({
    name: faker.location.state(),
    description: `Community for ${faker.location.state()} residents`,
    parent_id: country.id,
    created_at: now,
  });

  const city = createMockDbCommunity({
    name: faker.location.city(),
    description: `Community for ${faker.location.city()} residents`,
    parent_id: state.id,
    created_at: now,
  });

  const neighborhood = createMockDbCommunity({
    name: faker.location.street(),
    description: `Community for ${faker.location.street()} neighborhood`,
    parent_id: city.id,
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
 * Creates a mock CommunityMembershipData
 */
export function createMockCommunityMembershipData(
  overrides: Partial<CommunityMembershipData> = {}
): CommunityMembershipData {
  return {
    userId: faker.string.uuid(),
    communityId: faker.string.uuid(),
    role: faker.helpers.arrayElement(['member', 'admin', 'organizer'] as const),
    ...overrides,
  };
}

/**
 * Creates a mock CommunityMembershipInfo
 */
export function createMockCommunityMembershipInfo(
  overrides: Partial<CommunityMembershipInfo> = {}
): CommunityMembershipInfo {
  return {
    userId: faker.string.uuid(),
    communityId: faker.string.uuid(),
    role: faker.helpers.arrayElement(['member', 'admin', 'organizer'] as const),
    joinedAt: faker.date.past(),
    ...overrides,
  };
}

/**
 * Creates a mock CommunityMembership with optional composed objects
 */
export function createMockCommunityMembership(
  overrides: Partial<CommunityMembership> = {}
): CommunityMembership {
  return {
    userId: faker.string.uuid(),
    communityId: faker.string.uuid(),
    role: faker.helpers.arrayElement(['member', 'admin', 'organizer'] as const),
    joinedAt: faker.date.past(),
    user: createMockUser(),
    community: createMockCommunity(),
    ...overrides,
  };
}

import { faker } from '@faker-js/faker';
import { Community, CommunityData, CommunityRow } from '../types';
import { ProfileRow } from '../../users';
import { createMockDbProfile, createMockUser } from '../../users/__mocks__';

export function createMockCommunity(
  overrides: Partial<Community> = {}
): Community {
  return {
    id: faker.string.uuid(),
    name: faker.location.city(),
    description: faker.lorem.sentence(),
    hierarchyPath: [],
    level: faker.helpers.arrayElement(['state', 'city', 'neighborhood']),
    timeZone: faker.location.timeZone(),
    memberCount: faker.number.int({ min: 10, max: 140 }),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    isActive: true,
    deletedAt: undefined,
    deletedBy: undefined,
    parentId: faker.string.uuid(),
    organizer: createMockUser(),
    radiusKm: faker.number.int({ min: 1, max: 100 }),
    center: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    ...overrides,
  };
}

export function createMockCommunityData(
  overrides: Partial<CommunityData> = {}
): CommunityData {
  const level = faker.helpers.arrayElement(['city', 'neighborhood']);
  const hierarchyPath = [
    {
      level: 'country',
      name: faker.location.country(),
    },
    {
      level: 'state',
      name: faker.location.state(),
    },
    {
      level: 'city',
      name: faker.location.city(),
    },
  ];

  return {
    name: level === 'city' ? faker.location.city() : faker.location.street(),
    level,
    hierarchyPath: hierarchyPath.slice(0, level === 'city' ? 2 : 3),
    description: faker.lorem.sentence(),
    icon: faker.helpers.arrayElement(['🏘️', '🏙️', '🌆', '🏞️', '🌳']),
    organizerId: faker.string.uuid(),
    parentId: faker.string.uuid(),
    center: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    radiusKm: faker.number.int({ min: 1, max: 140 }),
    memberCount: faker.number.int({ min: 1, max: 10000 }),
    timeZone: faker.location.timeZone(),
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
  const isCity = faker.datatype.boolean(0.7); // 70% chance of being a top-level community

  return {
    id: faker.string.uuid(),
    level: isCity ? 'city' : 'neighborhood',
    radius_km: faker.number.int({ min: 1, max: 140 }),
    organizer_id: faker.string.uuid(),
    name: faker.location.country() + ' ' + faker.company.buzzNoun(),
    description: faker.lorem.sentence(),
    icon: faker.helpers.arrayElement(['🏘️', '🏙️', '🌆', '🏞️', '🌳', null]),
    center: `POINT(${faker.location.longitude()} ${faker.location.latitude()})`,
    parent_id: faker.string.uuid(),
    member_count: faker.number.int({ min: 1, max: 10000 }),
    created_at: now,
    updated_at: now,
    is_active: true,
    deleted_at: null,
    deleted_by: null,
    hierarchy_path: JSON.stringify([]),
    time_zone: faker.location.timeZone(),
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

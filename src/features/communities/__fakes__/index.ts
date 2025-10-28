import { faker } from '@faker-js/faker';
import {
  Community,
  CommunityInput,
  CommunityMembership,
  CommunityMembershipInput,
  CommunityMembershipRole,
} from '../types';
import { CommunityRow } from '../types/communityRow';

export function createFakeCommunity(
  overrides: Partial<Community> = {},
): Community {
  return {
    id: faker.string.uuid(),
    name: faker.location.city(),
    description: faker.lorem.sentence(),
    icon: faker.helpers.arrayElement(['🏘️', '🏙️', '🌆', '🏞️', '🌳']),
    bannerImageUrl: faker.image.url(),
    type: faker.helpers.arrayElement(['neighbors', 'close', 'far']),
    center: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    centerName: faker.location.streetAddress(),
    timeZone: faker.location.timeZone(),
    memberCount: faker.number.int({ min: 10, max: 140 }),
    color: faker.helpers.arrayElement([faker.internet.color(), undefined]),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    boundary: {
      type: 'isochrone',
      travelMode: faker.helpers.arrayElement(['walking', 'cycling', 'driving']),
      travelTimeMin: faker.number.int({ min: 5, max: 60 }),
      polygon: {
        type: 'Polygon',
        coordinates: [
          [[faker.location.longitude(), faker.location.latitude()]],
        ],
      },
      areaSqKm: faker.number.float({ min: 0.1, max: 100 }),
    },
    ...overrides,
  };
}

export function createFakeCommunityInput(
  overrides: Partial<CommunityInput> = {},
): CommunityInput {
  const type = overrides.type ?? faker.helpers.arrayElement(['neighbors', 'close', 'far']);

  // Virtual communities don't have location data
  if (type === 'virtual') {
    return {
      name: faker.company.name(),
      description: faker.lorem.sentence(),
      icon: faker.helpers.arrayElement(['🌐', '💻', '🎮', '📚', '🎨']),
      bannerImageUrl: faker.image.url(),
      type: 'virtual',
      color: faker.helpers.arrayElement([faker.internet.color(), undefined]),
      ...overrides,
    };
  }

  // Non-virtual communities have location data
  return {
    name: faker.location.city(),
    description: faker.lorem.sentence(),
    icon: faker.helpers.arrayElement(['🏘️', '🏙️', '🌆', '🏞️', '🌳']),
    bannerImageUrl: faker.image.url(),
    type,
    center: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    centerName: faker.location.streetAddress(),
    timeZone: faker.location.timeZone(),
    // memberCount is computed by the database and not provided in input
    color: faker.helpers.arrayElement([faker.internet.color(), undefined]),
    boundary: {
      type: 'isochrone',
      travelMode: faker.helpers.arrayElement(['walking', 'cycling', 'driving']),
      travelTimeMin: faker.number.int({ min: 5, max: 60 }),
      polygon: {
        type: 'Polygon',
        coordinates: [
          [[faker.location.longitude(), faker.location.latitude()]],
        ],
      },
      areaSqKm: faker.number.float({ min: 0.1, max: 100 }),
    },
    ...overrides,
  };
}

/**
 * Creates a fake database Community row
 */
export function createFakeCommunityRow(
  overrides: Partial<CommunityRow> = {},
): CommunityRow {
  const now = faker.date.recent().toISOString();
  const lat = faker.location.latitude();
  const lng = faker.location.longitude();
  const type = overrides.type ?? faker.helpers.arrayElement(['neighbors', 'close', 'far']);

  // Virtual communities have null location data
  if (type === 'virtual') {
    return {
      id: faker.string.uuid(),
      name: faker.company.name(),
      description: faker.lorem.sentence(),
      icon: faker.helpers.arrayElement(['🌐', '💻', '🎮', '📚', '🎨', null]),
      banner_image_url: faker.helpers.arrayElement([faker.image.url(), null]),
      type: 'virtual',
      center: null,
      center_name: null,
      member_count: faker.number.int({ min: 1, max: 10000 }),
      created_at: now,
      updated_at: now,
      time_zone: null,
      color: faker.helpers.arrayElement([faker.internet.color(), null]),
      boundary: null,
      boundary_geometry: null,
      ...overrides,
    };
  }

  // Non-virtual communities have location data
  return {
    id: faker.string.uuid(),
    name: faker.location.city(),
    description: faker.lorem.sentence(),
    icon: faker.helpers.arrayElement(['🏘️', '🏙️', '🌆', '🏞️', '🌳', null]),
    banner_image_url: faker.helpers.arrayElement([faker.image.url(), null]),
    type,
    center: {
      type: 'Point',
      crs: { type: 'name', properties: { name: 'EPSG:4326' } },
      coordinates: [lng, lat],
    }, // GeoJSON format returned by PostGIS
    center_name: faker.location.streetAddress(),
    member_count: faker.number.int({ min: 1, max: 10000 }),
    created_at: now,
    updated_at: now,
    time_zone: faker.location.timeZone(),
    color: faker.helpers.arrayElement([faker.internet.color(), null]),
    boundary: {
      type: 'isochrone',
      travelMode: faker.helpers.arrayElement(['walking', 'cycling', 'driving']),
      travelTimeMin: faker.number.int({ min: 5, max: 60 }),
      polygon: {
        type: 'Polygon',
        coordinates: [
          [[faker.location.longitude(), faker.location.latitude()]],
        ],
      },
      areaSqKm: faker.number.float({ min: 0.1, max: 100 }),
    },
    boundary_geometry: faker.helpers.maybe(() =>
      `SRID=4326;POLYGON((${faker.location.longitude()} ${faker.location.latitude()},${faker.location.longitude()} ${faker.location.latitude()},${faker.location.longitude()} ${faker.location.latitude()},${faker.location.longitude()} ${faker.location.latitude()}))`
    ) ?? null,
    ...overrides,
  };
}

/**
 * Creates a fake hierarchy of communities (country -> state -> city -> neighborhood)
 */
export function createFakeCommunityHierarchy() {
  const now = new Date().toISOString();

  const country = createFakeCommunityRow({
    name: faker.location.country(),
    description: `Community for ${faker.location.country()} residents`,
    type: 'far',
    created_at: now,
  });

  const state = createFakeCommunityRow({
    name: faker.location.state(),
    description: `Community for ${faker.location.state()} residents`,
    type: 'far',
    created_at: now,
  });

  const city = createFakeCommunityRow({
    name: faker.location.city(),
    description: `Community for ${faker.location.city()} residents`,
    type: 'close',
    created_at: now,
  });

  const neighborhood = createFakeCommunityRow({
    name: faker.location.street(),
    description: `Community for ${faker.location.street()} neighborhood`,
    type: 'neighbors',
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
export function createFakeCommunityMembershipInput(
  overrides: Partial<CommunityMembershipInput> = {},
): CommunityMembershipInput {
  return {
    userId: faker.string.uuid(),
    communityId: faker.string.uuid(),
    role: faker.helpers.arrayElement(['member', 'organizer'] as CommunityMembershipRole[]),
    ...overrides,
  };
}

/**
 * Creates a fake CommunityMembershipInfo
 */
export function createFakeCommunityMembership(
  overrides: Partial<CommunityMembership> = {},
): CommunityMembership {
  const joinedAt = faker.date.past();
  return {
    userId: faker.string.uuid(),
    communityId: faker.string.uuid(),
    role: faker.helpers.arrayElement(['member', 'organizer'] as CommunityMembershipRole[]),
    createdAt: joinedAt,
    updatedAt: joinedAt,
    ...overrides,
  };
}

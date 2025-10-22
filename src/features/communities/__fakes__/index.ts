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
    type: faker.helpers.arrayElement(['place', 'interest']),
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
  return {
    name: faker.location.city(),
    description: faker.lorem.sentence(),
    icon: faker.helpers.arrayElement(['🏘️', '🏙️', '🌆', '🏞️', '🌳']),
    bannerImageUrl: faker.image.url(),
    type: faker.helpers.arrayElement(['place', 'interest']),
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

  return {
    id: faker.string.uuid(),
    name: faker.location.city(),
    description: faker.lorem.sentence(),
    icon: faker.helpers.arrayElement(['🏘️', '🏙️', '🌆', '🏞️', '🌳', null]),
    banner_image_url: faker.helpers.arrayElement([faker.image.url(), null]),
    type: faker.helpers.arrayElement(['place', 'interest']),
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
    type: 'place',
    created_at: now,
  });

  const state = createFakeCommunityRow({
    name: faker.location.state(),
    description: `Community for ${faker.location.state()} residents`,
    type: 'place',
    created_at: now,
  });

  const city = createFakeCommunityRow({
    name: faker.location.city(),
    description: `Community for ${faker.location.city()} residents`,
    type: 'place',
    created_at: now,
  });

  const neighborhood = createFakeCommunityRow({
    name: faker.location.street(),
    description: `Community for ${faker.location.street()} neighborhood`,
    type: 'place',
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

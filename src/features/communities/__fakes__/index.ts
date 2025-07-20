import { faker } from '@faker-js/faker';
import {
  Community,
  CommunityInput,
  CommunityMembership,
  CommunityMembershipInput,
} from '../types';
import { CommunityRow, CommunityRowWithRelations } from '../types/communityRow';
import { createFakeProfileRow } from '../../users/__fakes__';

export function createFakeCommunity(
  overrides: Partial<Community> = {},
): Community {
  return {
    id: faker.string.uuid(),
    organizerId: faker.string.uuid(),
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
    organizerId: faker.string.uuid(),
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
    organizer_id: faker.string.uuid(),
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
    boundary_geometry: null,
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
    createdAt: joinedAt,
    updatedAt: joinedAt,
    ...overrides,
  };
}


/**
 * Creates a fake database Community row with organizer relation
 */
export function createFakeDbCommunityWithOrganizer(
  overrides: Partial<CommunityRow> = {},
): CommunityRowWithRelations {
  const communityRow = createFakeCommunityRow(overrides);
  const organizer = createFakeProfileRow();

  return {
    ...communityRow,
    organizer,
  };
}

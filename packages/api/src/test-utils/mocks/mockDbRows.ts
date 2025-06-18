import { faker } from '@faker-js/faker';
import type { Database } from '@belongnetwork/types/database';

type UserRow = Database['public']['Tables']['profiles']['Row'];
type ResourceRow = Database['public']['Tables']['resources']['Row'];
type CommunityRow = Database['public']['Tables']['communities']['Row'];

export function createMockDbProfile(overrides: Partial<UserRow> = {}): UserRow {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const now = faker.date.recent().toISOString();

  return {
    id: faker.string.uuid(),
    created_at: now,
    updated_at: now,
    email: faker.internet.email(),
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      avatar_url: faker.image.avatar(),
      location: {
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      },
    },
    ...overrides,
  };
}

export function createMockDbResource(
  overrides: Partial<ResourceRow> = {}
): ResourceRow {
  const now = new Date().toISOString();
  const categories = ['tools', 'skills', 'food', 'supplies', 'other'];

  return {
    id: faker.string.uuid(),
    community_id: faker.string.uuid(),
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    category: faker.helpers.arrayElement(categories),
    type: faker.helpers.arrayElement(['offer', 'request']),
    image_urls: Array.from(
      { length: faker.number.int({ min: 1, max: 5 }) },
      () => faker.image.urlLoremFlickr({ category: 'object' })
    ),
    location: `POINT(${faker.location.longitude()} ${faker.location.latitude()})`,
    owner_id: faker.string.uuid(),
    created_at: now,
    updated_at: now,
    is_active: faker.datatype.boolean(),
    availability: faker.helpers.arrayElement([
      'weekdays',
      'weekends',
      'anytime',
      'mornings',
    ]),
    meetup_flexibility: faker.helpers.arrayElement([
      'home_only',
      'public_meetup_ok',
      'delivery_possible',
    ]),
    parking_info: faker.lorem.sentence(),
    pickup_instructions: faker.lorem.sentences(2),
    ...overrides,
  };
}

/**
 * Creates a mock database Resource with a custom owner
 */
export function createMockDbResourceWithOwner(
  owner: UserRow,
  overrides: Partial<ResourceRow> = {}
): ResourceRow & { owner: UserRow } {
  const resource = createMockDbResource({
    owner_id: owner.id,
    ...overrides,
  });
  return {
    ...resource,
    owner,
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
): CommunityRow & { organizer: UserRow } {
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

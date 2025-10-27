import { faker } from '@faker-js/faker';
import { CurrentUser, User, UserSummary } from '../types';
import { ProfileRow } from '../types/profileRow';

/**
 * Creates a fake UserSummary object
 */
export function createFakeUserSummary(overrides: Partial<UserSummary> = {}): UserSummary {
  return {
    id: faker.string.uuid(),
    firstName: faker.person.firstName(),
    avatarUrl: faker.image.avatar(),
    ...overrides,
  };
}

/**
 * Creates a fake User object
 */
export function createFakeUser(overrides: Partial<User> = {}): User {
  const now = faker.date.recent();
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    id: faker.string.uuid(),
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    avatarUrl: faker.image.avatar(),
    bio: faker.lorem.paragraph(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Creates a fake CurrentUser object (includes private fields)
 */
export function createFakeCurrentUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  const now = faker.date.recent();
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    id: faker.string.uuid(),
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    avatarUrl: faker.image.avatar(),
    bio: faker.lorem.paragraph(),
    email: faker.internet.email(),
    location: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}


/**
 * Legacy alias for createFakeUser
 * @deprecated Use createFakeUser instead
 */
export const createFakePublicUser = createFakeUser;

/**
 * Creates fake CurrentUser input data for creation
 */
export function createFakeCurrentUserInput(
  overrides: Partial<Omit<CurrentUser, 'id' | 'createdAt' | 'updatedAt'>> = {},
): Omit<CurrentUser, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    fullName: faker.person.fullName(),
    avatarUrl: faker.image.avatar(),
    bio: faker.lorem.paragraph(),
    location: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    ...overrides,
  };
}

export function createFakeProfileRow(
  overrides: Partial<ProfileRow> = {},
): ProfileRow {
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
      bio: faker.lorem.paragraph(),
      location: {
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      },
    },
    ...overrides,
  };
}

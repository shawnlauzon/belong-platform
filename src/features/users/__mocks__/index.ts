import { faker } from '@faker-js/faker';
import { ProfileRow, User, UserData } from '../types';

/**
 * Creates a mock domain User object
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  const now = faker.date.recent();
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName,
    lastName,
    avatarUrl: faker.image.avatar(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockUserData(
  overrides: Partial<UserData> = {}
): UserData {
  return {
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    fullName: faker.person.fullName(),
    avatarUrl: faker.image.avatar(),
    location: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    ...overrides,
  };
}

export function createMockDbProfile(
  overrides: Partial<ProfileRow> = {}
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
      location: {
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      },
    },
    ...overrides,
  };
}

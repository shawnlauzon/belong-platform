import { faker } from '@faker-js/faker';
import { Account } from '../types';

export function createFakeAccount(overrides: Partial<Account> = {}): Account {
  const now = faker.date.recent();
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    avatarUrl: faker.image.avatar(),
    location: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createFakeSignInData(
  overrides: Partial<{ email: string; password: string }> = {},
): { email: string; password: string } {
  return {
    email: faker.internet.email(),
    password: faker.internet.password(),
    ...overrides,
  };
}

export function createFakeSignUpData(
  overrides: Partial<{
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
  }> = {},
): {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
} {
  return {
    email: faker.internet.email(),
    password: faker.internet.password(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    ...overrides,
  };
}

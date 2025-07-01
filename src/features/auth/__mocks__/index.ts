import { faker } from '@faker-js/faker';
import { Account } from '../types';

export function createMockAccount(overrides: Partial<Account> = {}): Account {
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

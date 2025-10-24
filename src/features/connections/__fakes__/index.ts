import { faker } from '@faker-js/faker';
import type { UserConnection, UserConnectionRow } from '../types';

export function createFakeUserConnection(
  overrides?: Partial<UserConnection>,
): UserConnection {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    otherId: faker.string.uuid(),
    type: 'invited',
    strength: null,
    createdAt: faker.date.recent(),
    ...overrides,
  };
}

// Database row fakes
export function createFakeUserConnectionRow(
  overrides?: Partial<UserConnectionRow>,
): UserConnectionRow {
  return {
    id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    other_id: faker.string.uuid(),
    type: 'invited',
    strength: null,
    created_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

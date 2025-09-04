import { faker } from '@faker-js/faker';
import type {
  InvitationCode,
  UserConnection,
  InvitationCodeRow,
  UserConnectionRow,
} from '../types';

export function createFakeInvitationCode(
  overrides?: Partial<InvitationCode>,
): InvitationCode {
  return {
    code: faker.string.alphanumeric(8).toUpperCase(),
    userId: faker.string.uuid(),
    communityId: faker.string.uuid(),
    isActive: true,
    createdAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

export function createFakeUserConnection(
  overrides?: Partial<UserConnection>,
): UserConnection {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    otherId: faker.string.uuid(),
    communityId: faker.string.uuid(),
    type: 'invited_by',
    createdAt: faker.date.recent(),
    ...overrides,
  };
}

// Database row fakes
export function createFakeInvitationCodeRow(
  overrides?: Partial<InvitationCodeRow>,
): InvitationCodeRow {
  return {
    code: faker.string.alphanumeric(8).toUpperCase(),
    user_id: faker.string.uuid(),
    community_id: faker.string.uuid(),
    is_active: true,
    created_at: faker.date.recent().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function createFakeUserConnectionRow(
  overrides?: Partial<UserConnectionRow>,
): UserConnectionRow {
  return {
    id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    other_id: faker.string.uuid(),
    community_id: faker.string.uuid(),
    type: 'invited_by',
    created_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

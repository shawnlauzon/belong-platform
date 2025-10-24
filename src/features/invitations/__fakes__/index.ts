import { faker } from '@faker-js/faker';
import type { InvitationCode, InvitationCodeRow } from '../types';

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

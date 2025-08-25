import { faker } from '@faker-js/faker';
import type {
  MemberConnectionCode,
  ConnectionRequest,
  UserConnection,
  ConnectionLink,
  CommunityMemberCodeRow,
  ConnectionRequestRow,
  UserConnectionRow,
} from '../types';

export function createFakeMemberConnectionCode(
  overrides?: Partial<MemberConnectionCode>,
): MemberConnectionCode {
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

export function createFakeConnectionRequest(
  overrides?: Partial<ConnectionRequest>,
): ConnectionRequest {
  return {
    id: faker.string.uuid(),
    communityId: faker.string.uuid(),
    initiatorId: faker.string.uuid(),
    requesterId: faker.string.uuid(),
    status: 'pending',
    createdAt: faker.date.recent(),
    expiresAt: faker.date.future(),
    ...overrides,
  };
}

export function createFakeUserConnection(
  overrides?: Partial<UserConnection>,
): UserConnection {
  const userAId = faker.string.uuid();
  const userBId = faker.string.uuid();

  return {
    id: faker.string.uuid(),
    userAId: userAId < userBId ? userAId : userBId, // Ensure ordering
    userBId: userAId < userBId ? userBId : userAId,
    communityId: faker.string.uuid(),
    connectionRequestId: faker.string.uuid(),
    createdAt: faker.date.recent(),
    ...overrides,
  };
}

export function createFakeConnectionLink(
  overrides?: Partial<ConnectionLink>,
): ConnectionLink {
  const code = faker.string.alphanumeric(8).toUpperCase();
  return {
    code,
    url: `https://app.belongnetwork.co/connect/${code}`,
    isActive: true,
    ...overrides,
  };
}

// Database row fakes
export function createFakeCommunityMemberCodeRow(
  overrides?: Partial<CommunityMemberCodeRow>,
): CommunityMemberCodeRow {
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

export function createFakeConnectionRequestRow(
  overrides?: Partial<ConnectionRequestRow>,
): ConnectionRequestRow {
  return {
    id: faker.string.uuid(),
    community_id: faker.string.uuid(),
    initiator_id: faker.string.uuid(),
    requester_id: faker.string.uuid(),
    status: 'pending',
    created_at: faker.date.recent().toISOString(),
    responded_at: null,
    expires_at: faker.date.future().toISOString(),
    ...overrides,
  };
}

export function createFakeUserConnectionRow(
  overrides?: Partial<UserConnectionRow>,
): UserConnectionRow {
  const userAId = faker.string.uuid();
  const userBId = faker.string.uuid();

  return {
    id: faker.string.uuid(),
    user_a_id: userAId < userBId ? userAId : userBId,
    user_b_id: userAId < userBId ? userBId : userAId,
    community_id: faker.string.uuid(),
    connection_request_id: faker.string.uuid(),
    created_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

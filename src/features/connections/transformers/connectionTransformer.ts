import type {
  CommunityMemberCodeRow,
  CommunityMemberCodeInsertRow,
  ConnectionRequestRow,
  ConnectionRequestInsertRow,
  UserConnectionRow,
  MemberConnectionCode,
  ConnectionRequest,
  UserConnection,
  ConnectionLink,
} from '../types';
import { formatConnectionUrl } from '../utils/codeGenerator';

export function toDomainMemberCode(row: CommunityMemberCodeRow): MemberConnectionCode {
  return {
    code: row.code,
    userId: row.user_id,
    communityId: row.community_id,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function toCommunityMemberCodeInsertRow(
  data: Omit<MemberConnectionCode, 'createdAt' | 'updatedAt'>,
): CommunityMemberCodeInsertRow {
  return {
    code: data.code,
    user_id: data.userId,
    community_id: data.communityId,
    is_active: data.isActive,
  };
}

export function toDomainConnectionRequest(row: ConnectionRequestRow): ConnectionRequest {
  return {
    id: row.id,
    communityId: row.community_id,
    initiatorId: row.initiator_id,
    requesterId: row.requester_id,
    status: row.status,
    createdAt: new Date(row.created_at),
    respondedAt: row.responded_at ? new Date(row.responded_at) : undefined,
    expiresAt: new Date(row.expires_at),
  };
}

export function toConnectionRequestInsertRow(
  data: Pick<ConnectionRequest, 'communityId' | 'initiatorId' | 'requesterId'>,
): ConnectionRequestInsertRow {
  return {
    community_id: data.communityId,
    initiator_id: data.initiatorId,
    requester_id: data.requesterId,
  };
}

export function toDomainUserConnection(row: UserConnectionRow): UserConnection {
  return {
    id: row.id,
    userAId: row.user_a_id,
    userBId: row.user_b_id,
    communityId: row.community_id,
    connectionRequestId: row.connection_request_id,
    createdAt: new Date(row.created_at),
  };
}

export function toConnectionLink(memberCode: MemberConnectionCode, baseUrl?: string): ConnectionLink {
  return {
    code: memberCode.code,
    url: formatConnectionUrl(memberCode.code, baseUrl),
    isActive: memberCode.isActive,
  };
}
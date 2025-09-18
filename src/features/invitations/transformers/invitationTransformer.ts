import type {
  InvitationCodeRow,
  UserConnectionRow,
  InvitationCode,
  UserConnection,
} from '../types';

export function toDomainInvitationCode(row: InvitationCodeRow): InvitationCode {
  return {
    code: row.code,
    userId: row.user_id,
    communityId: row.community_id,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function toDomainUserConnection(row: UserConnectionRow): UserConnection {
  return {
    id: row.id,
    userId: row.user_id,
    otherId: row.other_id,
    communityId: row.community_id,
    type: row.type as 'invited_by',
    createdAt: new Date(row.created_at),
  };
}

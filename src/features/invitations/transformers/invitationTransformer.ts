import type { InvitationCodeRow, InvitationCode } from '../types';

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

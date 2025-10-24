import type { UserConnectionRow, UserConnection } from '../types';

export function toDomainUserConnection(row: UserConnectionRow): UserConnection {
  return {
    id: row.id,
    userId: row.user_id,
    otherId: row.other_id,
    communityId: row.community_id,
    type: row.type as 'invited_by',
    strength: row.strength,
    createdAt: new Date(row.created_at),
  };
}

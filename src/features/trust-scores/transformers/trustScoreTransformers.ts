import type { TrustScore, TrustScoreRow } from '../types';

/**
 * Transform a trust score row from the database to the domain type
 */
export function toDomainTrustScore(row: TrustScoreRow): TrustScore {
  return {
    id: `${row.user_id}-${row.community_id}`,
    userId: row.user_id,
    communityId: row.community_id,
    score: row.score,
    lastCalculatedAt: new Date(row.last_calculated_at),
    createdAt: new Date(row.created_at || ''),
    updatedAt: new Date(row.updated_at || ''),
  };
}

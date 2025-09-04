import type { TrustScoreLog } from '../types/trustScoreLog';
import type { TrustScoreLogRow } from '../api/fetchTrustScoreLogs';

/**
 * Transforms a trust score log database row into the frontend type
 */
export function trustScoreLogTransformer(row: TrustScoreLogRow): TrustScoreLog {
  if (!row.user_id || !row.community_id || !row.created_at) {
    throw new Error('Trust score log is missing required user_id, community_id, or created_at');
  }

  const createdAt = new Date(row.created_at);
  
  return {
    id: row.id,
    userId: row.user_id,
    communityId: row.community_id,
    actionType: row.action_type,
    actionId: row.action_id || undefined,
    pointsChange: row.points_change,
    scoreBefore: row.score_before,
    scoreAfter: row.score_after,
    metadata: (row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)) ? row.metadata as Record<string, unknown> : undefined,
    createdAt,
    updatedAt: createdAt, // Trust score logs are immutable, so updatedAt = createdAt
  };
}
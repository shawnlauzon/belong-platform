import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/shared';
import type { Database } from '@/shared/types/database';

export interface FetchTrustScoreLogsFilter {
  userId?: string;
  communityId?: string;
  limit?: number;
  offset?: number;
}

export interface TrustScoreLogRow {
  id: string;
  user_id: string | null;
  community_id: string | null;
  action_type: string;
  action_id: string | null;
  points_change: number;
  score_before: number;
  score_after: number;
  metadata: Database['public']['Tables']['trust_score_logs']['Row']['metadata'];
  created_at: string | null;
}

/**
 * Fetches trust score logs with optional filtering and pagination
 */
export async function fetchTrustScoreLogs(
  supabase: SupabaseClient,
  filter: FetchTrustScoreLogsFilter = {}
): Promise<TrustScoreLogRow[]> {
  const { userId, communityId, limit = 50, offset = 0 } = filter;

  logger.debug('🏆 API: Fetching trust score logs', {
    userId,
    communityId,
    limit,
    offset,
  });

  let query = supabase
    .from('trust_score_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (communityId) {
    query = query.eq('community_id', communityId);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('🏆 API: Error fetching trust score logs', {
      error,
      filter,
    });
    throw new Error(`Failed to fetch trust score logs: ${error.message}`);
  }

  logger.info('🏆 API: Successfully fetched trust score logs', {
    count: data.length,
    filter,
  });

  return data || [];
}
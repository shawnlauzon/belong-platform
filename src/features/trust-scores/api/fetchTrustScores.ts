import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { TrustScore, TrustScoreRow } from '../types';
import { toDomainTrustScore } from '../transformers';

/**
 * Fetch trust scores based on filter criteria
 */
export async function fetchTrustScores(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<TrustScore[]> {
  const query = supabase.from('trust_scores').select('*').eq('user_id', userId);

  const { data, error } = (await query) as {
    data: TrustScoreRow[];
    error: Error | null;
  };

  if (error) {
    throw error;
  }

  return data.map(toDomainTrustScore) || [];
}

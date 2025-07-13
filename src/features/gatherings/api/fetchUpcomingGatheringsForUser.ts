import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Gathering } from '../types';
import { toGatheringWithJoinedRelations } from '../transformers/gatheringTransformer';
import { SELECT_GATHERING_WITH_RELATIONS } from '../types/gatheringRow';

/**
 * Fetches upcoming gatherings where the user has responded with a specific status
 */
export async function fetchUpcomingGatheringsForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  status: 'attending' | 'maybe',
): Promise<Gathering[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('gathering_responses')
    .select(`
      gathering:gatherings!gathering_id(
        ${SELECT_GATHERING_WITH_RELATIONS}
      )
    `)
    .eq('user_id', userId)
    .eq('status', status)
    .gte('gathering.start_date_time', now)
    .order('gathering.start_date_time', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data
    .filter(row => row.gathering)
    .map(row => toGatheringWithJoinedRelations(row.gathering as any));
}
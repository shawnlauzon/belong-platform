import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Gathering } from '../types';
import { toGatheringWithJoinedRelations } from '../transformers/gatheringTransformer';
import { SELECT_GATHERING_WITH_RELATIONS } from '../types/gatheringRow';

/**
 * Fetches upcoming gatherings organized by the user
 */
export async function fetchUpcomingOrganizerGatherings(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Gathering[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('gatherings')
    .select(SELECT_GATHERING_WITH_RELATIONS)
    .eq('organizer_id', userId)
    .gte('start_date_time', now)
    .order('start_date_time', { ascending: true });

  if (error) {
    throw error;
  }
  
  if (!data) {
    return [];
  }

  return data.map(row => toGatheringWithJoinedRelations(row));
}
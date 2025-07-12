import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Gathering, GatheringFilter } from '@/features/gatherings';
import { toGatheringWithJoinedRelations } from '../transformers/gatheringTransformer';
import { SELECT_GATHERING_WITH_RELATIONS } from '../types/gatheringRow';

export async function fetchGatherings(
  supabase: SupabaseClient<Database>,
  filters?: GatheringFilter,
): Promise<Gathering[]> {
  let query = supabase
    .from('gatherings')
    .select(SELECT_GATHERING_WITH_RELATIONS);

  if (filters) {
    if (filters.communityId) {
      query = query.eq('community_id', filters.communityId);
    }

    if (filters.communityIds && filters.communityIds.length > 0) {
      query = query.in('community_id', filters.communityIds);
    }

    if (filters.organizerId) {
      query = query.eq('organizer_id', filters.organizerId);
    }

    if (filters.startAfter) {
      query = query.gte('start_date_time', filters.startAfter.toISOString());
    }

    if (filters.startBefore) {
      query = query.lte('start_date_time', filters.startBefore.toISOString());
    }

    if (filters.searchTerm) {
      query = query.or(
        `title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`,
      );
    }
  }

  const { data, error } = await query.order('start_date_time', {
    ascending: true,
  });

  if (error || !data) {
    return [];
  }

  return data.map((row) => toGatheringWithJoinedRelations(row));
}

import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { GatheringResponseRow } from '../types/gatheringRow';
import type { GatheringResponse } from '../types';
import { toDomainGatheringResponse } from '../transformers/gatheringTransformer';

export async function fetchGatheringResponses(
  supabase: SupabaseClient<Database>,
  gatheringId: string,
): Promise<GatheringResponse[]> {
  // Get all gathering attendances for this gathering
  const { data: attendances, error } = (await supabase
    .from('gathering_responses')
    .select('*')
    .eq('gathering_id', gatheringId)) as {
    data: GatheringResponseRow[];
    error: QueryError | null;
  };

  if (error) {
    throw error;
  }
  
  if (!attendances) {
    return [];
  }

  // Transform to domain objects
  return attendances.map((attendance) => toDomainGatheringResponse(attendance));
}

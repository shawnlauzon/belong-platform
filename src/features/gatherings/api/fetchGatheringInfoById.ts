import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Gathering } from '@/features/gatherings';
import { toGatheringWithJoinedRelations } from '../transformers/gatheringTransformer';
import { SELECT_GATHERING_WITH_RELATIONS } from '../types/gatheringRow';

export async function fetchGatheringInfoById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Gathering | null> {
  const { data, error } = await supabase
    .from('gatherings')
    .select(SELECT_GATHERING_WITH_RELATIONS)
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return toGatheringWithJoinedRelations(data);
}

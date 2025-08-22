import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Resource } from '@/features/resources';
import { SELECT_RESOURCES_JOIN_COMMUNITIES_JOIN_TIMESLOTS } from '../types/resourceRow';
import { toDomainResource } from '../transformers';
import { ResourceRowJoinCommunitiesJoinTimeslots } from '../types/resourceRow';

export async function fetchResourceById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Resource | null> {
  const { data, error } = (await supabase
    .from('resources')
    .select(SELECT_RESOURCES_JOIN_COMMUNITIES_JOIN_TIMESLOTS)
    .eq('id', id)
    .or('expires_at.is.null,expires_at.gt.now()')
    .single()) as {
    data: ResourceRowJoinCommunitiesJoinTimeslots | null;
    error: Error | null;
  };

  if (error || !data) {
    return null;
  }

  return toDomainResource(data);
}

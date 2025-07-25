import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Resource } from '@/features/resources';
import { SELECT_RESOURCES_JOIN_COMMUNITIES } from '../types/resourceRow';
import { toDomainResource } from '../transformers';
import { ResourceRowJoinCommunities } from '../types/resourceRow';

export async function fetchResourceById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Resource | null> {
  const { data, error } = (await supabase
    .from('resources')
    .select(SELECT_RESOURCES_JOIN_COMMUNITIES)
    .eq('id', id)
    .single()) as {
    data: ResourceRowJoinCommunities | null;
    error: Error | null;
  };

  if (error || !data) {
    return null;
  }

  return toDomainResource(data);
}

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Resource } from '@/features/resources';
import { SELECT_RESOURCE_BASIC } from '../types/resourceRow';
import { toDomainResource } from '../transformers';

export async function fetchResourceById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Resource | null> {
  const { data, error } = await supabase
    .from('resources')
    .select(SELECT_RESOURCE_BASIC)
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return toDomainResource(data);
}

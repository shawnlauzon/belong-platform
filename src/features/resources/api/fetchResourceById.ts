import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceInfo } from '@/features/resources';
import { toResourceInfo } from '@/features/resources/transformers/resourceTransformer';

export async function fetchResourceById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<ResourceInfo | null> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return toResourceInfo(data, data.owner_id, data.community_id);
}

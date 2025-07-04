import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceData, ResourceInfo } from '@/features/resources';
import { forDbUpdate } from '@/features/resources/transformers/resourceTransformer';
import { toResourceInfo } from '@/features/resources/transformers/resourceTransformer';

export async function updateResource(
  supabase: SupabaseClient<Database>,
  id: string,
  updates: Partial<ResourceData>,
): Promise<ResourceInfo | null> {
  const dbData = forDbUpdate(updates);

  const { data, error } = await supabase
    .from('resources')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update resource');
  }

  return toResourceInfo(data, data.owner_id, data.community_id);
}

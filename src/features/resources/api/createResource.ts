import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceData, ResourceInfo } from '@/features/resources';
import { forDbInsert } from '@/features/resources/transformers/resourceTransformer';
import { toResourceInfo } from '@/features/resources/transformers/resourceTransformer';

export async function createResource(
  supabase: SupabaseClient<Database>,
  resourceData: ResourceData,
  ownerId: string,
): Promise<ResourceInfo | null> {
  const dbData = forDbInsert(resourceData, ownerId);

  const { data, error } = await supabase
    .from('resources')
    .insert(dbData)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create resource');
  }

  return toResourceInfo(data, data.owner_id, data.community_id);
}

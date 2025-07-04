import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceData, ResourceInfo } from '@/features/resources';
import { forDbInsert } from '@/features/resources/transformers/resourceTransformer';
import { toResourceInfo } from '@/features/resources/transformers/resourceTransformer';
import { ResourceRow } from '../types/database';

export async function createResource(
  supabase: SupabaseClient<Database>,
  resourceData: ResourceData,
): Promise<ResourceInfo | null> {
  const dbData = forDbInsert(resourceData);

  const { data, error } = (await supabase
    .from('resources')
    .insert(dbData)
    .select()
    .single()) as { data: ResourceRow; error: QueryError | null };

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create resource');
  }

  return toResourceInfo(data);
}

import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceInfo } from '@/features/resources';
import type { ResourceRow } from '@/features/resources/types/database';
import { toResourceInfo } from '@/features/resources/transformers/resourceTransformer';

export async function fetchResourceById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<ResourceInfo | null> {
  const { data, error } = (await supabase
    .from('resources')
    .select('*')
    .eq('id', id)
    .single()) as { data: ResourceRow; error: QueryError | null };

  if (error || !data) {
    return null;
  }

  return toResourceInfo(data);
}

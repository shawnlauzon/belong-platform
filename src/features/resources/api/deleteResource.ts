import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

export async function deleteResource(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = (await supabase
    .from('resources')
    .delete()
    .eq('id', id)) as { error: QueryError | null };

  if (error) {
    throw new Error(error.message || 'Failed to delete resource');
  }
}

import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';

export async function deleteResource(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  // Check authentication first
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    logger.error('🏘️ API: Authentication required to delete resource', {
      authError,
      id,
    });
    throw new Error('Authentication required');
  }

  const { error } = (await supabase
    .from('resources')
    .delete()
    .eq('id', id)) as { error: QueryError | null };

  if (error) {
    logger.error('🏘️ API: Failed to delete resource', {
      error,
      id,
    });
    throw new Error(error.message || 'Failed to delete resource');
  }

  logger.debug('🏘️ API: Successfully deleted resource', {
    id,
  });
}

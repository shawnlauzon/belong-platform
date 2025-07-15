import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';

export async function deleteResourceClaim(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  // Check authentication first
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    logger.error('🏘️ API: Authentication required to delete resource claim', {
      authError,
      id,
    });
    throw new Error('Authentication required');
  }

  const { error } = (await supabase
    .from('resource_claims')
    .delete()
    .eq('id', id)) as { error: QueryError | null };

  if (error) {
    logger.error('🏘️ API: Failed to delete resource claim', {
      error,
      id,
    });
    throw new Error(error.message || 'Failed to delete resource claim');
  }

  logger.debug('🏘️ API: Successfully deleted resource claim', {
    id,
  });
}
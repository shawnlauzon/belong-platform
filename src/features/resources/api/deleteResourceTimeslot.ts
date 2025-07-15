import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';

export async function deleteResourceTimeslot(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  // Check authentication first
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    logger.error('🏘️ API: Authentication required to delete resource timeslot', {
      authError,
      id,
    });
    throw new Error('Authentication required');
  }

  const { error } = (await supabase
    .from('resource_timeslots')
    .delete()
    .eq('id', id)) as { error: QueryError | null };

  if (error) {
    logger.error('🏘️ API: Failed to delete resource timeslot', {
      error,
      id,
    });
    throw new Error(error.message || 'Failed to delete resource timeslot');
  }

  logger.debug('🏘️ API: Successfully deleted resource timeslot', {
    id,
  });
}
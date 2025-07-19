import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { getAuthIdOrThrow, logger } from '@/shared';

export async function deleteResourceClaim(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  await getAuthIdOrThrow(supabase);

  const { error } = await supabase
    .from('resource_claims')
    .delete()
    .eq('id', id);

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

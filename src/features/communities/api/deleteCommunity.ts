import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { Community, CommunityRow } from '../types';
import { toDomainCommunity } from '../transformers/communityTransformer';

export async function deleteCommunity(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Community | null> {
  logger.debug('🏘️ API: Deleting community', { id });

  const { data, error: deleteError } = (await supabase
    .from('communities')
    .delete()
    .eq('id', id)
    .select()
    .maybeSingle()) as { data: CommunityRow | null; error: QueryError | null };

  if (deleteError) {
    logger.error('🏘️ API: Failed to delete community', {
      error: deleteError,
      id,
    });
    throw deleteError;
  }
  logger.debug('🏘️ API: Successfully deleted community', { id });

  return data ? toDomainCommunity(data) : null;
}

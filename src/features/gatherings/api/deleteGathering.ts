import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { getAuthIdOrThrow, logger } from '@/shared';

export async function deleteGathering(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const authId = await getAuthIdOrThrow(supabase);

  // First verify the gathering exists and user has permission
  const { data: existingGathering, error: fetchError } = await supabase
    .from('gatherings')
    .select('id, organizer_id')
    .eq('id', id)
    .single();

  if (fetchError) {
    logger.error('🏘️ API: Failed to fetch gathering for deletion', {
      error: fetchError,
      id,
    });
    throw fetchError;
  }

  if (!existingGathering) {
    const error = new Error('Gathering not found');
    logger.error('🏘️ API: Gathering not found', { id });
    throw error;
  }

  if (existingGathering.organizer_id !== authId) {
    const error = new Error(
      'You do not have permission to delete this gathering',
    );
    logger.error('🏘️ API: Permission denied - user is not organizer', {
      id,
      authId,
      organizerId: existingGathering.organizer_id,
    });
    throw error;
  }

  const { error } = (await supabase.from('gatherings').delete().eq('id', id)) as {
    error: QueryError | null;
  };

  if (error) {
    throw new Error(error.message || 'Failed to delete gathering');
  }
}
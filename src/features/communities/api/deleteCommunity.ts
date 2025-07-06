import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function deleteCommunity(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  logger.debug('🏘️ API: Deleting community', { id });

  try {
    const authId = await getAuthIdOrThrow(supabase);

    // First verify the community exists and user has permission
    const { data: existingCommunity, error: fetchError } = await supabase
      .from('communities')
      .select('id, organizer_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      logger.error('🏘️ API: Failed to fetch community for deletion', {
        error: fetchError,
        id,
      });
      throw fetchError;
    }

    if (!existingCommunity) {
      const error = new Error('Community not found');
      logger.error('🏘️ API: Community not found', { id });
      throw error;
    }

    if (existingCommunity.organizer_id !== authId) {
      const error = new Error(
        'You do not have permission to delete this community',
      );
      logger.error('🏘️ API: Permission denied - user is not organizer', {
        id,
        authId,
        organizerId: existingCommunity.organizer_id,
      });
      throw error;
    }

    // Now perform the community delete
    const { error: deleteError } = await supabase
      .from('communities')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('🏘️ API: Failed to delete community', {
        error: deleteError,
        id,
      });
      throw deleteError;
    }
    logger.debug('🏘️ API: Successfully deleted community', { id });
  } catch (error) {
    logger.error('🏘️ API: Error deleting community', { error, id });
    throw error;
  }
}

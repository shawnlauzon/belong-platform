import { logger } from '@belongnetwork/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@belongnetwork/types/database';

export async function deleteUser(id: string, supabase?: SupabaseClient<Database>): Promise<void> {
  if (!supabase) {
    throw new Error('deleteUser requires a supabase client. Use the hook pattern instead.');
  }
  
  logger.debug('👤 API: Deleting user', { id });

  try {
    // Check if user exists before deletion
    const { data: userData, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') { // Not found
        logger.debug('👤 API: User not found for deletion', { id });
        return;
      }
      throw fetchError;
    }

    // Perform the soft delete (set deleted_at)
    const { error: deleteError } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', id);

    if (deleteError) {
      logger.error('👤 API: Failed to delete user', { id, error: deleteError });
      throw deleteError;
    }
    
    logger.info('👤 API: Successfully deleted user', { id });
    
    return;
  } catch (error) {
    logger.error('👤 API: Error deleting user', { 
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

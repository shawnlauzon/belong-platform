import { getBelongClient } from '@belongnetwork/core';
import { toDomainUser } from './userTransformer';
import type { User } from '@belongnetwork/types';

export async function deleteUser(id: string): Promise<User | null> {
  const { supabase, logger } = getBelongClient();
  
  logger.debug('👤 API: Deleting user', { id });

  try {
    // First, fetch the user to return the deleted data
    const { data: userData, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') { // Not found
        logger.debug('👤 API: User not found for deletion', { id });
        return null;
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

    const user = toDomainUser(userData);
    
    logger.info('👤 API: Successfully deleted user', { 
      id: user.id,
      email: user.email 
    });
    
    return user;
  } catch (error) {
    logger.error('👤 API: Error deleting user', { 
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

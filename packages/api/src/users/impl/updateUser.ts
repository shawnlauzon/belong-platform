import { logger } from '@belongnetwork/core';
import { toDomainUser, forDbUpdate } from './userTransformer';
import type { User } from '@belongnetwork/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@belongnetwork/types/database';

export async function updateUser(
  userData: Partial<User> & { id: string },
  supabase?: SupabaseClient<Database>
): Promise<User> {
  if (!supabase) {
    throw new Error('updateUser requires a supabase client. Use the hook pattern instead.');
  }
  
  logger.debug('👤 API: Updating user', { id: userData.id });

  try {
    const updateData = forDbUpdate(userData);
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userData.id)
      .select()
      .single();

    if (error) {
      logger.error('👤 API: Failed to update user', { 
        id: userData.id, 
        error 
      });
      throw error;
    }

    const user = toDomainUser(data);
    
    logger.info('👤 API: Successfully updated user', { 
      id: user.id,
      email: user.email 
    });
    
    return user;
  } catch (error) {
    logger.error('👤 API: Error updating user', { 
      id: userData.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

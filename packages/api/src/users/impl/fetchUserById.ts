import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import { toDomainUser } from './userTransformer';
import type { User } from '@belongnetwork/types';

export async function fetchUserById(id: string): Promise<User | null> {
  logger.debug('👤 API: Fetching user by ID', { id });

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        logger.debug('👤 API: User not found', { id });
        return null;
      }
      logger.error('👤 API: Failed to fetch user', { id, error });
      throw error;
    }

    const user = toDomainUser(data);
    logger.debug('👤 API: Successfully fetched user', {
      id,
      email: user.email,
    });
    return user;
  } catch (error) {
    logger.error('👤 API: Error fetching user', {
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

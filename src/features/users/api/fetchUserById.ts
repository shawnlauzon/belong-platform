import { logger } from '@/shared';
import { ERROR_CODES } from '@/shared/constants';
import type { Database } from '@/shared/types/database';
import { SupabaseClient } from '@supabase/supabase-js';
import { toDomainUser } from '../transformers/userTransformer';
import { UserDetail } from '../types';

export async function fetchUserById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<UserDetail | null> {
  logger.debug('👤 API: Fetching user by ID', { id });

  try {
    const query = supabase.from('profiles').select('*').eq('id', id);
    const { data, error } = await query.single();

    if (error) {
      if (error.code === ERROR_CODES.NOT_FOUND) {
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

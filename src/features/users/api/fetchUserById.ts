import { logger } from '@/shared';
import { ERROR_CODES } from '@/shared/constants';
import type { Database } from '@/shared/types/database';
import { SupabaseClient } from '@supabase/supabase-js';
import { toPublicUser } from '../transformers/userTransformer';
import { PublicUser } from '../types';

export async function fetchUserById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<PublicUser | null> {
  logger.debug('👤 API: Fetching user by ID', { id });

  try {
    const query = supabase.from('public_profiles').select('*').eq('id', id);
    const { data, error } = await query.single();

    if (error) {
      if (error.code === ERROR_CODES.NOT_FOUND) {
        logger.debug('👤 API: User not found', { id });
        return null;
      }
      logger.error('👤 API: Failed to fetch user', { id, error });
      throw error;
    }

    const user = toPublicUser(data);

    logger.debug('👤 API: Successfully fetched user', {
      id,
      firstName: user.firstName,
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

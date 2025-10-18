import { logger } from '@/shared';
import { ERROR_CODES } from '@/shared/constants';
import type { Database } from '@/shared/types/database';
import { SupabaseClient } from '@supabase/supabase-js';
import { toUser } from '../transformers/userTransformer';
import { User } from '../types';

export async function fetchUserById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<User | null> {
  logger.debug('👤 API: Fetching user by ID', { id });

  const query = supabase.from('public_profiles').select('*').eq('id', id);
  const { data, error } = await query.single();

  if (error) {
    if (error.code === ERROR_CODES.NOT_FOUND) {
      logger.debug('👤 API: User not found', { id });
      return null;
    }
    throw error;
  }

  return toUser(data);
}

import { logger } from '@/shared';
import type { Database } from '@/shared/types/database';
import { SupabaseClient } from '@supabase/supabase-js';
import { toCurrentUser, toCurrentUserInsertRow } from '../transformers/userTransformer';
import { CurrentUser } from '../types';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function createUser(
  supabase: SupabaseClient<Database>,
  userData: Omit<CurrentUser, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<CurrentUser> {
  logger.debug('👤 API: Creating user', { email: userData.email });

  try {
    const userId = await getAuthIdOrThrow(supabase);
    const dbData = toCurrentUserInsertRow({ ...userData, id: userId });

    const { data, error } = await supabase
      .from('profiles')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      logger.error('👤 API: Failed to create user', {
        email: userData.email,
        error,
      });
      throw error;
    }

    const user = toCurrentUser(data);

    logger.info('👤 API: Successfully created user', {
      id: user.id,
      email: user.email,
    });

    // Note: Invitation processing is now handled automatically by the handle_new_user() database trigger

    return user;
  } catch (error) {
    logger.error('👤 API: Error creating user', {
      email: userData.email,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

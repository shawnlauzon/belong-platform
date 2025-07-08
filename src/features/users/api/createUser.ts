import { logger } from '@/shared';
import type { Database } from '@/shared/types/database';
import { SupabaseClient } from '@supabase/supabase-js';
import { toDomainUser, forDbInsert } from '../transformers/userTransformer';
import { UserDetail, UserData } from '../types';

export async function createUser(
  supabase: SupabaseClient<Database>,
  userData: UserData,
): Promise<UserDetail> {
  logger.debug('👤 API: Creating user', { email: userData.email });

  try {
    const dbData = forDbInsert({ ...userData });

    const { data, error } = await supabase
      .from('profiles')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      logger.error('👤 API: Failed to create user', {
        id: userData.id,
        email: userData.email,
        error,
      });
      throw error;
    }

    const user = toDomainUser(data);

    logger.info('👤 API: Successfully created user', {
      id: user.id,
      email: user.email,
    });

    return user;
  } catch (error) {
    logger.error('👤 API: Error creating user', {
      id: userData.id,
      email: userData.email,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

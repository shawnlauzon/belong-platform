import { logger } from '@/shared';
import type { Database } from '@/shared/types/database';
import { SupabaseClient } from '@supabase/supabase-js';
import { toDomainUser } from '../transformers/userTransformer';
import { UserDetail, UserFilter } from '../types';

export async function fetchUsers(
  supabase: SupabaseClient<Database>,
  options?: UserFilter,
): Promise<UserDetail[]> {
  logger.debug('👤 API: Fetching users', { options });

  try {
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply search filter if provided
    if (options?.searchTerm) {
      const searchPattern = `%${options.searchTerm}%`;
      query = query.or(
        `email.ilike.${searchPattern},user_metadata->>'first_name'.ilike.${searchPattern},user_metadata->>'last_name'.ilike.${searchPattern}`,
      );
    }

    // Apply pagination
    if (options?.page && options?.pageSize) {
      const from = (options.page - 1) * options.pageSize;
      const to = from + options.pageSize - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('👤 API: Failed to fetch users', { error });
      throw error;
    }

    const users = (data || []).map(toDomainUser);

    logger.debug('👤 API: Successfully fetched users', {
      count: users.length,
    });
    return users;
  } catch (error) {
    logger.error('👤 API: Error fetching users', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

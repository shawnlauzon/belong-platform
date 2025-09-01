import { logger } from '@/shared';
import type { Database } from '@/shared/types/database';
import { SupabaseClient } from '@supabase/supabase-js';
import { toPublicUser } from '../transformers/userTransformer';
import { PublicUser, UserFilter } from '../types';
import { appendQueries } from '@/shared';

export async function fetchUsers(
  supabase: SupabaseClient<Database>,
  filters?: UserFilter,
): Promise<PublicUser[]> {
  logger.debug('👤 API: Fetching users', { filters });

  try {
    let query = supabase
      .from('public_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters) {
      query = appendQueries(query, {
        community_id: filters.communityId,
      });
    }

    const { data, error } = await query;

    if (error) {
      logger.error('👤 API: Failed to fetch users', { error });
      throw error;
    }

    const users = (data || []).map(toPublicUser);

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

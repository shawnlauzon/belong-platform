import { getBelongClient } from '@belongnetwork/core';
import { toDomainUser } from './userTransformer';
import type { User } from '@belongnetwork/types';

type UserFilter = {
  searchTerm?: string;
  page?: number;
  limit?: number;
};

export async function fetchUsers(filter: UserFilter = {}): Promise<User[]> {
  const { supabase, logger } = getBelongClient();
  
  const { searchTerm, page = 1, limit = 50 } = filter;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  logger.debug('👤 API: Fetching users', { filter, from, to });

  try {
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .range(from, to);

    if (searchTerm) {
      query = query.ilike('user_metadata->>full_name', `%${searchTerm}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('👤 API: Failed to fetch users', { error });
      throw error;
    }

    if (!data || data.length === 0) {
      logger.debug('👤 API: No users found', { filter });
      return [];
    }

    const users = data.map((profile) => toDomainUser(profile));

    logger.debug('👤 API: Successfully fetched users', {
      count: users.length,
      total: count,
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

import { appendQueries, logger } from '@/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Shoutout } from '../types';
import { toDomainShoutout } from '../transformers/shoutoutsTransformer';
import { SELECT_SHOUTOUT_BASIC } from '../types/shoutoutRow';
import type { ShoutoutFilter } from '../types/shoutoutFilter';

/**
 * Fetches shoutouts with optional filtering
 */
export async function fetchShoutouts(
  supabase: SupabaseClient<Database>,
  filter?: ShoutoutFilter,
): Promise<Shoutout[]> {
  logger.debug('📢 API: Fetching shoutouts', filter);

  let query = supabase.from('shoutouts').select(SELECT_SHOUTOUT_BASIC);

  query = appendQueries(query, {
    resource_id: filter?.resourceId,
    community_id: filter?.communityId,
    sender_id: filter?.senderId,
  });

  const { data, error } = await query.order('created_at', {
    ascending: false,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map((row) => toDomainShoutout(row));
}

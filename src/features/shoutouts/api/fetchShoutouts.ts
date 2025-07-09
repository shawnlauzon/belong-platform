import { logger } from '../../../shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import type { ShoutoutInfo, ShoutoutFilter } from '../types';
import { toShoutoutInfo } from '../transformers/shoutoutsTransformer';
import { ShoutoutRow } from '../types/database';
import type { QueryError } from '@supabase/supabase-js';

/**
 * Fetches shoutouts with optional filtering
 */
export async function fetchShoutouts(
  supabase: SupabaseClient<Database>,
  filters?: ShoutoutFilter,
): Promise<ShoutoutInfo[]> {
  logger.debug('📢 API: Fetching shoutouts', { filters });

  let query = supabase.from('shoutouts').select('*');

  if (filters) {
    if (filters.communityId) {
      query = query.eq('community_id', filters.communityId);
    }

    if (filters.communityIds && filters.communityIds.length > 0) {
      query = query.in('community_id', filters.communityIds);
    }

    if (filters.sentBy) {
      query = query.eq('from_user_id', filters.sentBy);
    }
    if (filters.receivedBy) {
      query = query.eq('to_user_id', filters.receivedBy);
    }
    if (filters.resourceId) {
      query = query.eq('resource_id', filters.resourceId);
    }
  }

  const { data, error } = (await query.order('created_at', {
    ascending: true,
  })) as {
    data: ShoutoutRow[];
    error: QueryError | null;
  };

  if (error || !data) {
    return [];
  }

  return data.map((row) => toShoutoutInfo(row));
}

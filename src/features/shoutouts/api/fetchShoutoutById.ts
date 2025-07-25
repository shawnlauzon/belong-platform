import { logger } from '@/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Shoutout } from '../types';
import { toDomainShoutout } from '../transformers/shoutoutsTransformer';
import { SELECT_SHOUTOUT_BASIC } from '../types/shoutoutRow';
import { ShoutoutRow } from '../types/shoutoutRow';
import { QueryError } from '@supabase/supabase-js';

/**
 * Fetches a single shoutout by ID with all relations
 */
export async function fetchShoutoutById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Shoutout | null> {
  logger.debug('📢 API: Fetching shoutout by ID', { id });

  const { data, error } = (await supabase
    .from('shoutouts')
    .select(SELECT_SHOUTOUT_BASIC)
    .eq('id', id)
    .single()) as { data: ShoutoutRow | null; error: QueryError | null };

  if (error || !data) {
    logger.debug('📢 API: Shoutout not found', { id, error });
    return null;
  }

  return toDomainShoutout(data);
}
